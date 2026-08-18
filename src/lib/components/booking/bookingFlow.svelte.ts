/**
 * Shared stateful logic for the progressive booking flow.
 *
 * Used by both the landing funnel (/) and the direct event page (/[slug]) so
 * the multi-step behaviour (event -> day -> slot -> form -> confirmation)
 * lives in exactly one place. Reactive via Svelte 5 runes.
 */

import { detectTimezone, getTimezoneDisplayLabel } from '$lib/constants/timezones';

export interface BookableEvent {
	id: string;
	slug?: string;
	name: string;
	duration: number;
	description?: string | null;
}

export interface BookingSubmissionResult {
	meetingUrl: string | null;
	meetingType: 'google_meet' | 'teams';
}

export interface BookingFlowOptions {
	/** Event types the visitor can choose from (landing) or the single one ([slug]). */
	events: BookableEvent[];
	/** Slug used for availability calls before the visitor picks an event. */
	initialSlug?: string;
	/** Host time format preference ('24h' enables 24-hour display). */
	timeFormat?: string;
	/** Called after a successful booking submission. */
	onBooked?: (result: BookingSubmissionResult) => void;
}

export function createBookingFlow(options: BookingFlowOptions) {
	const initialEvent = options.events[0];

	// Global state
	let lang = $state<'fr' | 'en'>('fr');
	let use24h = $state(options.timeFormat === '24h');
	let selectedTimezone = $state(detectTimezone());
	let timezoneLabel = $state(getTimezoneDisplayLabel(selectedTimezone));
	let currentStep = $state<number>(1); // 1: Type selection, 2: Calendar date selection, 3: Slot selection

	// Meeting selection state
	let selectedMeetingId = $state<string | null>(null);
	let selectedMeetingTitle = $state<string>(initialEvent?.name ?? '');
	let selectedDuration = $state<number>(initialEvent?.duration ?? 30);
	let activeSlug = $state<string>(initialEvent?.slug ?? options.initialSlug ?? '');

	// Date and time slots state
	let selectedDate = $state<string | null>(null);
	let selectedSlot = $state<{ start: string; end: string } | null>(null);
	let availableSlots = $state<Array<{ start: string; end: string }>>([]);
	let availableDates = $state<Set<string>>(new Set());
	let loading = $state(false);
	let loadingAvailability = $state(false);

	// Calendar state
	let currentMonth = $state(new Date());

	// Modal and booking form state
	let showModal = $state(false);
	let bookingForm = $state({
		name: '',
		email: '',
		notes: ''
	});
	let bookingStatus = $state<'idle' | 'submitting' | 'success' | 'error'>('idle');
	let bookingError = $state('');
	let meetingUrl = $state<string | null>(null);
	let meetingType = $state<'google_meet' | 'teams'>('google_meet');

	function toggleTimeFormat() {
		use24h = !use24h;
	}

	function setTimezone(tz: string, label: string) {
		selectedTimezone = tz;
		timezoneLabel = label;
	}

	function setLanguage(l: 'fr' | 'en') {
		lang = l;
	}

	function formatTime(isoStr: string) {
		const date = new Date(isoStr);
		return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: !use24h,
			timeZone: selectedTimezone
		}).format(date);
	}

	function formatTimeRange(start: string, end: string) {
		return `${formatTime(start)} - ${formatTime(end)}`;
	}

	function formatDisplayDate(dateStr: string) {
		const date = new Date(dateStr + 'T12:00:00');
		return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-US', {
			weekday: 'long',
			day: 'numeric',
			month: 'long'
		}).format(date);
	}

	async function fetchMonthAvailability() {
		if (!activeSlug) return;
		loadingAvailability = true;
		try {
			const year = currentMonth.getFullYear();
			const month = currentMonth.getMonth() + 1;
			const monthStr = `${year}-${String(month).padStart(2, '0')}`;
			const response = await fetch(`/api/availability/month?event=${activeSlug}&month=${monthStr}`);
			if (!response.ok) throw new Error('Failed to fetch availability');
			const result = await response.json() as { availableDates?: string[] };
			availableDates = new Set(result.availableDates || []);
		} catch (error) {
			console.error('Error fetching month availability:', error);
			availableDates = new Set();
		} finally {
			loadingAvailability = false;
		}
	}

	function handleSelectMeeting(type: BookableEvent) {
		selectedMeetingId = type.id;
		selectedMeetingTitle = type.name;
		selectedDuration = type.duration;
		if (type.slug) {
			activeSlug = type.slug;
		}
		currentStep = 2;
		fetchMonthAvailability();
	}

	async function handleDateSelect(dateStr: string) {
		selectedDate = dateStr;
		selectedSlot = null;
		loading = true;
		currentStep = 3;

		try {
			const response = await fetch(`/api/availability?event=${activeSlug}&date=${dateStr}`);
			if (!response.ok) throw new Error('Failed to fetch availability');
			const result = await response.json() as { slots?: Array<{ start: string; end: string }> };
			availableSlots = result.slots || [];
		} catch (error) {
			console.error('Error fetching availability:', error);
			availableSlots = [];
		} finally {
			loading = false;
		}
	}

	function handleSelectSlot(slot: { start: string; end: string }) {
		selectedSlot = slot;
	}

	function openBookingModal() {
		showModal = true;
		bookingStatus = 'idle';
		bookingError = '';
	}

	function closeBookingModal() {
		showModal = false;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		bookingStatus = 'submitting';
		bookingError = '';

		try {
			const response = await fetch('/api/bookings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					eventSlug: activeSlug,
					startTime: selectedSlot?.start,
					endTime: selectedSlot?.end,
					attendeeName: bookingForm.name,
					attendeeEmail: bookingForm.email,
					notes: bookingForm.notes,
					timezone: selectedTimezone
				})
			});

			if (!response.ok) {
				const errData = (await response.json().catch(() => ({}))) as { message?: string };
				if (response.status === 409) {
					throw new Error(
						lang === 'fr'
							? "Ce créneau n'est plus disponible. Merci d'en choisir un autre."
							: 'This time slot is no longer available. Please pick another one.'
					);
				}
				throw new Error(errData.message || 'Failed to create booking');
			}

			const result = await response.json() as BookingSubmissionResult;
			meetingUrl = result.meetingUrl || null;
			meetingType = result.meetingType || 'google_meet';
			bookingStatus = 'success';
			options.onBooked?.({ meetingUrl, meetingType });
		} catch (error: any) {
			console.error('Booking error:', error);
			bookingError = error.message || 'Failed to create booking';
			bookingStatus = 'error';
		}
	}

	function prevMonth() {
		currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
		fetchMonthAvailability();
	}

	function nextMonth() {
		currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
		fetchMonthAvailability();
	}

	function goToToday() {
		currentMonth = new Date();
		fetchMonthAvailability();
	}

	// Layout helpers derived from the current step
	const containerMaxWidthClass = $derived(
		currentStep === 1 ? 'max-w-md' : currentStep === 2 ? 'max-w-3xl' : 'max-w-6xl'
	);

	const gridColsClass = $derived(
		currentStep === 1 ? 'grid-cols-1' : currentStep === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'
	);

	const slotRecapText = $derived(
		selectedDate && selectedSlot
			? `${selectedMeetingTitle} — ${formatDisplayDate(selectedDate)} ${lang === 'fr' ? 'à' : 'at'} ${formatTime(selectedSlot.start)} (${timezoneLabel})`
			: ''
	);

	return {
		// state (getters/setters preserve reactivity across module boundary)
		get lang() { return lang; },
		set lang(v: 'fr' | 'en') { lang = v; },
		get use24h() { return use24h; },
		get selectedTimezone() { return selectedTimezone; },
		get timezoneLabel() { return timezoneLabel; },
		get currentStep() { return currentStep; },
		get selectedMeetingId() { return selectedMeetingId; },
		get selectedMeetingTitle() { return selectedMeetingTitle; },
		get activeSlug() { return activeSlug; },
		get selectedDate() { return selectedDate; },
		get selectedSlot() { return selectedSlot; },
		get availableSlots() { return availableSlots; },
		get availableDates() { return availableDates; },
		get loading() { return loading; },
		get loadingAvailability() { return loadingAvailability; },
		get currentMonth() { return currentMonth; },
		get showModal() { return showModal; },
		get bookingForm() { return bookingForm; },
		set bookingForm(v: { name: string; email: string; notes: string }) { bookingForm = v; },
		get bookingStatus() { return bookingStatus; },
		get bookingError() { return bookingError; },
		get meetingUrl() { return meetingUrl; },
		get meetingType() { return meetingType; },
		get containerMaxWidthClass() { return containerMaxWidthClass; },
		get gridColsClass() { return gridColsClass; },
		get slotRecapText() { return slotRecapText; },

		// actions
		toggleTimeFormat,
		setTimezone,
		setLanguage,
		formatTime,
		formatTimeRange,
		formatDisplayDate,
		fetchMonthAvailability,
		handleSelectMeeting,
		handleDateSelect,
		handleSelectSlot,
		openBookingModal,
		closeBookingModal,
		handleSubmit,
		prevMonth,
		nextMonth,
		goToToday
	};
}
