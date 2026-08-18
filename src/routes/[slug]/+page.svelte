<script lang="ts">
	import { browser } from '$app/environment';
	import type { PageData } from './$types';
	import { createBrandColors } from '$lib/utils/colorUtils';
	import { detectTimezone } from '$lib/constants/timezones';
	import { BookingCalendar, TimeSlotList, BookingForm, BookingSuccess, EventSidebar } from '$lib/components/booking';

	interface CustomPageData {
		slug: string;
		eventType: {
			id: string;
			name: string;
			slug: string;
			duration: number;
			description: string | null;
			is_active: number;
			cover_image: string | null;
			invite_calendar: string | null;
		};
		user: {
			name: string;
			profileImage: string | null;
			brandColor: string;
			timeFormat: string;
		};
	}

	let { data }: { data: PageData & CustomPageData } = $props();

	// Global state
	let lang = $state<'fr' | 'en'>('fr');
	let use24h = $state(data.user?.timeFormat === '24h');
	let selectedTimezone = $state(detectTimezone());
	let timezoneLabel = $state('Paris (UTC+2)');
	let currentStep = $state<number>(1); // 1: Type selection, 2: Calendar date selection, 3: Slot selection

	// Meeting selection state
	let selectedMeetingId = $state<string | null>(null);
	let selectedMeetingTitle = $state<string>(data.eventType?.name || 'Consultation Stratégique');
	let selectedDuration = $state<number>(data.eventType?.duration || 30);
	let activeSlug = $state<string>(data.slug);

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

	// Brand colors
	const brandColor = data.user?.brandColor || '#7a5828';
	const colors = createBrandColors(brandColor);

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

	$effect(() => {
		fetchMonthAvailability();
	});

	function handleSelectMeeting(type: { id: string; slug?: string; name: string; duration: number }) {
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
				const errData = await response.json() as { message?: string };
				throw new Error(errData.message || 'Failed to create booking');
			}

			const result = await response.json() as { meetingUrl?: string; meetingType?: 'google_meet' | 'teams' };
			meetingUrl = result.meetingUrl || null;
			meetingType = result.meetingType || 'google_meet';
			bookingStatus = 'success';
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

	// Compute container max-width class based on currentStep
	const containerMaxWidthClass = $derived(
		currentStep === 1
			? 'max-w-md'
			: currentStep === 2
				? 'max-w-3xl'
				: 'max-w-6xl'
	);

	const gridColsClass = $derived(
		currentStep === 1
			? 'grid-cols-1'
			: currentStep === 2
				? 'grid-cols-1 md:grid-cols-2'
				: 'grid-cols-1 md:grid-cols-3'
	);

	const slotRecapText = $derived(
		selectedDate && selectedSlot
			? `${selectedMeetingTitle} — ${formatDisplayDate(selectedDate)} ${lang === 'fr' ? 'à' : 'at'} ${formatTime(selectedSlot.start)} (${timezoneLabel})`
			: ''
	);
</script>

<svelte:head>
	<title>{selectedMeetingTitle} — CloudMeet</title>
</svelte:head>

<div class="flex min-h-screen flex-col justify-between bg-background font-sans text-foreground">
	<!-- Main Floating Progressive Booking Card -->
	<main class="mx-auto flex w-full max-w-7xl flex-col items-center justify-center px-4 py-10 sm:px-6">
		<h1 class="sr-only">{selectedMeetingTitle} — {data.user?.name}</h1>
		<div
			class="card-container w-full {containerMaxWidthClass} standard-card overflow-hidden rounded-2xl"
			style="--brand-color:{brandColor}; --brand-light:{colors.light}; --brand-lighter:{colors.lighter}; --brand-dark:{colors.dark};"
		>
			<div class="grid {gridColsClass} divide-border md:divide-x">
				<!-- Step 1: Appointment Type & Host Profile Panel -->
				<EventSidebar
					user={data.user}
					eventType={data.eventType}
					selectedMeetingId={selectedMeetingId}
					onSelectMeeting={handleSelectMeeting}
					{selectedDate}
					{selectedSlot}
					{brandColor}
					{formatTime}
					{selectedTimezone}
					{timezoneLabel}
					onSelectTimezone={setTimezone}
					{use24h}
					onToggleTimeFormat={toggleTimeFormat}
					{lang}
					onSetLanguage={setLanguage}
				/>

				<!-- Step 2: Calendar Panel -->
				{#if currentStep >= 2}
					<div class="step-panel-anim panel-visible h-full w-full min-w-0 flex-col flex-1 overflow-hidden">
						<BookingCalendar
							{currentMonth}
							{selectedDate}
							{availableDates}
							{brandColor}
							brandLighter={colors.lighter}
							brandDark={colors.dark}
							onDateSelect={handleDateSelect}
							onPrevMonth={prevMonth}
							onNextMonth={nextMonth}
							onGoToToday={goToToday}
							{lang}
						/>
					</div>
				{/if}

				<!-- Step 3: Time Slot Panel -->
				{#if currentStep >= 3 && selectedDate}
					<div class="step-panel-anim panel-visible h-full w-full min-w-0 flex-col flex-1 overflow-hidden">
						<TimeSlotList
							{selectedDate}
							{availableSlots}
							{selectedSlot}
							{loading}
							{brandColor}
							{formatTime}
							formatDateDisplay={formatDisplayDate}
							onSelectSlot={handleSelectSlot}
							onConfirm={openBookingModal}
							{lang}
						/>
					</div>
				{/if}
			</div>
		</div>
		</main>

		<!-- Modal Form / Success Pop-up -->
	{#if showModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
			<div class="standard-card animate-fade-in relative w-full max-w-md rounded-2xl p-6 sm:p-7">
				<!-- Close Modal Button -->
				<button
					type="button"
					onclick={closeBookingModal}
					class="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
					aria-label={lang === 'fr' ? 'Fermer' : 'Close'}
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
					</svg>
				</button>

				{#if bookingStatus !== 'success'}
					<BookingForm
						bind:bookingForm
						{bookingStatus}
						{bookingError}
						{slotRecapText}
						{brandColor}
						brandDark={colors.dark}
						onSubmit={handleSubmit}
						{lang}
					/>
				{:else}
					<BookingSuccess
						eventName={selectedMeetingTitle}
						selectedDate={selectedDate || ''}
						selectedSlot={selectedSlot!}
						{meetingUrl}
						{meetingType}
						{brandColor}
						formattedDateText={selectedDate ? formatDisplayDate(selectedDate) : ''}
						formattedTimeText={selectedSlot ? formatTime(selectedSlot.start) : ''}
						onClose={closeBookingModal}
						{lang}
					/>
				{/if}
			</div>
		</div>
	{/if}
</div>
