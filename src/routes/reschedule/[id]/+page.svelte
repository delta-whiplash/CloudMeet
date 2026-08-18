<script lang="ts">
	import type { PageData } from './$types';
	import TimezoneSelector from '$lib/components/TimezoneSelector.svelte';
	import { createBrandColors } from '$lib/utils/colorUtils';
	import { detectTimezone, getCurrentTime } from '$lib/constants/timezones';
	import { formatDateLocal, formatSelectedDate } from '$lib/utils/dateFormatters';
	import { BookingCalendar } from '$lib/components/booking';

	let { data }: { data: PageData } = $props();

	// Brand colors
	const brandColor = data.booking.brandColor;
	const colors = createBrandColors(brandColor);

	let selectedDate = $state<string | null>(null);
	let selectedSlot = $state<{ start: string; end: string } | null>(null);
	let availableSlots = $state<Array<{ start: string; end: string }>>([]);
	let loading = $state(false);
	let rescheduleStatus = $state<'idle' | 'submitting' | 'success' | 'error'>('idle');
	let rescheduleError = $state('');
	let newMeetingUrl = $state<string | null>(null);

	// Track which dates have available slots
	let availableDates = $state<Set<string>>(new Set());
	let loadingAvailability = $state(false);

	// Timezone state
	let selectedTimezone = $state(detectTimezone());
	let showTimezoneDropdown = $state(false);

	// Calendar state
	let currentMonth = $state(new Date());

	// Date/time formatters
	const use12Hour = data.timeFormat !== '24h';

	function formatTime(isoStr: string) {
		const date = new Date(isoStr);
		return new Intl.DateTimeFormat('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: use12Hour,
			timeZone: selectedTimezone
		}).format(date);
	}

	function formatTimeRange(start: string, end: string) {
		return `${formatTime(start)} - ${formatTime(end)}`;
	}

	function formatOriginalDateTime(dateStr: string) {
		const date = new Date(dateStr);
		return new Intl.DateTimeFormat('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			hour12: use12Hour,
			timeZone: selectedTimezone
		}).format(date);
	}

	function prevMonth() {
		currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
		fetchMonthAvailability();
	}

	function nextMonth() {
		currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
		fetchMonthAvailability();
	}

	async function fetchMonthAvailability() {
		loadingAvailability = true;

		try {
			const year = currentMonth.getFullYear();
			const month = currentMonth.getMonth() + 1;
			const monthStr = `${year}-${String(month).padStart(2, '0')}`;

			const response = await fetch(`/api/availability/month?event=${data.booking.eventSlug}&month=${monthStr}`);
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

	async function handleDateSelect(dateStr: string) {
		selectedDate = dateStr;
		selectedSlot = null;
		loading = true;

		try {
			const response = await fetch(`/api/availability?event=${data.booking.eventSlug}&date=${dateStr}`);
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

	function selectSlot(slot: { start: string; end: string }) {
		selectedSlot = slot;
	}

	async function handleReschedule() {
		if (!selectedSlot) return;

		rescheduleStatus = 'submitting';
		rescheduleError = '';

		try {
			const response = await fetch('/api/bookings/reschedule', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					bookingId: data.booking.id,
					newStartTime: selectedSlot.start,
					newEndTime: selectedSlot.end,
					timezone: selectedTimezone
				})
			});

			if (!response.ok) {
				const errData = await response.json() as { message?: string };
				throw new Error(errData.message || 'Failed to reschedule booking');
			}

			const result = await response.json() as { meetingUrl?: string };
			newMeetingUrl = result.meetingUrl || null;
			rescheduleStatus = 'success';
		} catch (error: any) {
			console.error('Reschedule error:', error);
			rescheduleError = error.message || 'Failed to reschedule booking';
			rescheduleStatus = 'error';
		}
	}
</script>

<svelte:head>
	<title>Reschedule Meeting</title>
</svelte:head>

<div
	class="flex min-h-[70vh] flex-col items-center justify-center bg-background p-4"
	style="--brand-color: {brandColor}; --brand-light: {colors.light}; --brand-lighter: {colors.lighter}; --brand-dark: {colors.dark}; --brand-rgb: {colors.rgb.r}, {colors.rgb.g}, {colors.rgb.b};"
>
	{#if rescheduleStatus === 'success'}
		<!-- Success Screen -->
		<div class="standard-card animate-fade-in w-full max-w-md rounded-2xl p-8">
			<div class="text-center">
				<div
					class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-success/30 bg-success-muted text-success shadow-soft"
				>
					<svg class="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
					</svg>
				</div>
				<h1 class="font-display mb-2 text-2xl font-semibold text-foreground">Meeting Rescheduled!</h1>
				<p class="mb-8 text-muted-foreground">Your meeting has been rescheduled. A calendar update has been sent to your email.</p>

				<div class="mb-6 rounded-xl border border-border bg-surface-2 p-6 text-left">
					<h3 class="font-display mb-4 font-semibold text-foreground">{data.booking.eventName}</h3>
					<div class="space-y-3 text-sm">
						<div class="flex items-start gap-3">
							<svg class="mt-0.5 h-5 w-5 flex-shrink-0 text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
							</svg>
							<div>
								<p class="font-medium text-foreground">New Time</p>
								<p class="text-muted-foreground">{selectedSlot ? formatTimeRange(selectedSlot.start, selectedSlot.end) : ''}</p>
								<p class="text-subtle">{selectedDate ? formatSelectedDate(selectedDate) : ''}</p>
							</div>
						</div>
						{#if newMeetingUrl}
							<div class="flex items-start gap-3">
								<svg class="mt-0.5 h-5 w-5 flex-shrink-0 text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
								</svg>
								<a href={newMeetingUrl} target="_blank" class="break-all hover:underline" style="color: var(--brand-color, var(--primary))">{data.booking.inviteCalendar === 'outlook' ? 'Join Microsoft Teams Meeting' : 'Join Google Meet'}</a>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	{:else}
		<!-- Reschedule Form - matching main booking page layout -->
		<div class="standard-card flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl lg:flex-row">
			<!-- Left Sidebar -->
			<div class="flex w-full flex-shrink-0 flex-col border-b border-border bg-surface lg:w-72 lg:border-b-0 lg:border-r">
				{#if data.booking.coverImage}
					<div class="flex justify-center p-6 pb-4">
						<img src={data.booking.coverImage} alt="" class="max-h-16 w-auto object-contain" />
					</div>
					<div class="mx-6 border-b border-border"></div>
				{/if}

				<div class="flex-1 p-6">
					<div class="mb-6">
						{#if data.booking.profileImage}
							<img src={data.booking.profileImage} alt={data.booking.hostName} class="mb-3 h-12 w-12 rounded-full object-cover" />
						{:else}
							<div class="mb-3 flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold text-primary-foreground" style="background-color: var(--brand-color, var(--primary))">
								{data.booking.hostName?.charAt(0) || 'H'}
							</div>
						{/if}
						<p class="mb-1 text-sm font-medium text-muted-foreground">{data.booking.hostName}</p>
						<h1 class="font-display text-2xl font-semibold text-foreground">{data.booking.eventName}</h1>
					</div>

					<div class="space-y-4 text-sm text-muted-foreground">
						<div class="flex items-center gap-3">
							<svg class="h-5 w-5 text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
							</svg>
							<span>{data.booking.duration} min</span>
						</div>
						<div class="flex items-center gap-3">
							<svg class="h-5 w-5 text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
							</svg>
							<span>{data.booking.inviteCalendar === 'outlook' ? 'Microsoft Teams' : 'Google Meet'}</span>
						</div>
					</div>

					<!-- Current booking info -->
					<div class="mt-6 border-t border-border pt-6">
						<p class="mb-2 text-xs font-semibold uppercase text-subtle">Current booking</p>
						<div class="rounded-xl border border-danger/30 bg-danger-muted p-3 text-sm text-danger">
							<p class="font-medium text-danger">{formatOriginalDateTime(data.booking.startTime)}</p>
							<p class="text-danger/80">{data.booking.attendeeName}</p>
							<p class="text-xs text-danger/70">{data.booking.attendeeEmail}</p>
						</div>
					</div>

					{#if selectedSlot}
						<div class="mt-4">
							<p class="mb-2 text-xs font-semibold uppercase text-subtle">New time</p>
							<div class="rounded-xl border border-success/30 bg-success-muted p-3 text-sm text-success">
								<p class="font-medium text-success">{formatTime(selectedSlot.start)} - {formatTime(selectedSlot.end)}</p>
								<p class="text-success/80">{selectedDate ? formatSelectedDate(selectedDate) : ''}</p>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Main Content -->
			<div class="flex-1 bg-surface p-6">
				{#if rescheduleError}
					<div class="mb-6 max-w-2xl rounded-xl border border-danger/30 bg-danger-muted p-4 text-danger">
						{rescheduleError}
					</div>
				{/if}

				<div class="flex flex-col gap-6 sm:flex-row sm:items-stretch">
					<div class="w-full sm:w-80">
						<h2 class="font-display mb-6 text-xl font-semibold text-foreground">Select a New Date & Time</h2>

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
						/>

						<!-- Timezone selector -->
						<div class="relative mt-6">
							<p class="mb-2 text-sm font-semibold text-foreground">Time zone</p>
							<button
								type="button"
								onclick={() => showTimezoneDropdown = !showTimezoneDropdown}
								class="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
							>
								<svg class="h-4 w-4 text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
								</svg>
								<span>{selectedTimezone} ({getCurrentTime(selectedTimezone, use12Hour)})</span>
								<svg class="h-4 w-4 text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
								</svg>
							</button>
							{#if showTimezoneDropdown}
								<TimezoneSelector
									{selectedTimezone}
									onSelect={(tz) => selectedTimezone = tz}
									onClose={() => showTimezoneDropdown = false}
									{brandColor}
								/>
							{/if}
						</div>
					</div>

					{#if selectedDate}
						<div class="flex w-full flex-col border-t border-border pt-6 sm:ml-6 sm:w-52 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0" style="max-height: 400px;">
							<h3 class="mb-4 flex-shrink-0 text-sm font-medium text-subtle">
								{formatSelectedDate(selectedDate).split(',')[0]}
							</h3>
							{#if loading}
								<div class="flex items-center justify-center py-8">
									<div class="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style="border-color: color-mix(in oklab, var(--brand-color, var(--primary)) 30%, transparent); border-top-color: var(--brand-color, var(--primary));"></div>
								</div>
							{:else if availableSlots.length === 0}
								<p class="py-4 text-sm text-subtle">No available times</p>
							{:else}
								<div class="scrollbar-thin flex-1 space-y-2 overflow-y-auto pb-2 pr-2">
									{#each availableSlots as slot}
										{#if selectedSlot === slot}
											<button type="button" class="w-full rounded-xl px-3.5 py-2.5 text-left font-mono text-xs font-bold transition-all sm:text-sm" style="background: var(--brand-color, var(--primary)); color: var(--primary-foreground);">
												{formatTime(slot.start)}
											</button>
										{:else}
											<button
												type="button"
												onclick={() => selectSlot(slot)}
												class="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-left font-mono text-xs font-medium text-foreground transition-all hover:border-border-strong hover:bg-surface-2 sm:text-sm"
											>
												{formatTime(slot.start)}
											</button>
										{/if}
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				</div>

				<!-- Reschedule button -->
				{#if selectedSlot}
					<div class="mt-6 border-t border-border pt-6">
						<button
							onclick={handleReschedule}
							disabled={rescheduleStatus === 'submitting'}
							class="flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-primary-foreground shadow-soft transition-all hover:opacity-90 hover:shadow-glow disabled:opacity-50"
							style="background: var(--brand-color, var(--primary));"
						>
							{rescheduleStatus === 'submitting' ? 'Rescheduling...' : 'Confirm Reschedule'}
						</button>
					</div>
				{/if}

				<!-- Cancel link -->
				<div class="mt-4 text-center">
					<a
						href="/cancel/{data.booking.id}"
						class="text-sm text-muted-foreground transition-colors hover:text-danger"
					>
						Or cancel this meeting instead
					</a>
				</div>
			</div>
			</div>
	{/if}
</div>
