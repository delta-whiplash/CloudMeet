<script lang="ts">
	import { createFormatters } from '$lib/utils/dateFormatters';

	interface Booking {
		id: string;
		event_type_name: string;
		event_type_slug: string;
		attendee_name: string;
		attendee_email: string;
		start_time: string;
		end_time: string;
		event_type_id: string;
		duration_minutes: number;
	}

	interface Props {
		booking: Booking | null;
		onClose: () => void;
		onSubmit: (bookingId: string, newStartTime: string, newEndTime: string, message: string) => Promise<void>;
	}

	let { booking, onClose, onSubmit }: Props = $props();

	const { formatCompactDateTime } = createFormatters();

	let selectedDate = $state<string | null>(null);
	let selectedTime = $state<string | null>(null);
	let message = $state('');
	let submitting = $state(false);
	let error = $state<string | null>(null);
	let availableSlots = $state<Array<{ start: string; end: string }>>([]);
	let loadingSlots = $state(false);

	// Calendar state
	let currentMonth = $state(new Date());

	const monthName = $derived(currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' }));

	const calendarDays = $derived(() => {
		const year = currentMonth.getFullYear();
		const month = currentMonth.getMonth();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const startPadding = firstDay.getDay();

		const days: Array<{ date: Date; isCurrentMonth: boolean; isToday: boolean; isPast: boolean }> = [];

		// Previous month padding
		for (let i = startPadding - 1; i >= 0; i--) {
			const date = new Date(year, month, -i);
			days.push({ date, isCurrentMonth: false, isToday: false, isPast: true });
		}

		// Current month
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		for (let day = 1; day <= lastDay.getDate(); day++) {
			const date = new Date(year, month, day);
			const isToday = date.toDateString() === today.toDateString();
			const isPast = date < today;
			days.push({ date, isCurrentMonth: true, isToday, isPast });
		}

		// Next month padding
		const remaining = 42 - days.length;
		for (let i = 1; i <= remaining; i++) {
			const date = new Date(year, month + 1, i);
			days.push({ date, isCurrentMonth: false, isToday: false, isPast: false });
		}

		return days;
	});

	function prevMonth() {
		currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
	}

	function nextMonth() {
		currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
	}

	function formatDateKey(date: Date): string {
		return date.toISOString().split('T')[0];
	}

	async function selectDate(date: Date) {
		const dateKey = formatDateKey(date);
		selectedDate = dateKey;
		selectedTime = null;
		availableSlots = [];
		loadingSlots = true;
		error = null;

		try {
			// Fetch available slots for this date
			const response = await fetch(`/api/availability?date=${dateKey}&event=${booking?.event_type_slug}`);
			if (response.ok) {
				const data = await response.json() as { slots?: Array<{ start: string; end: string }> };
				availableSlots = data.slots || [];
			} else {
				error = 'Failed to load available times';
			}
		} catch (err) {
			error = 'Failed to load available times';
		} finally {
			loadingSlots = false;
		}
	}

	function selectSlot(slot: { start: string; end: string }) {
		selectedTime = slot.start;
	}

	function formatSlotTime(isoString: string): string {
		const date = new Date(isoString);
		return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
	}

	async function handleSubmit() {
		if (!booking || !selectedDate || !selectedTime) return;

		submitting = true;
		error = null;

		try {
			const slot = availableSlots.find(s => s.start === selectedTime);
			if (!slot) {
				error = 'Please select a time slot';
				return;
			}

			await onSubmit(booking.id, slot.start, slot.end, message);
			onClose();
		} catch (err: any) {
			error = err.message || 'Failed to send reschedule proposal';
		} finally {
			submitting = false;
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (booking && e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if booking}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
		onclick={handleBackdropClick}
	>
		<div
			role="dialog"
			aria-modal="true"
			aria-label="Propose new time"
			class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface shadow-card"
		>
			<!-- Header -->
			<div class="border-b border-border p-6">
				<div class="flex items-start justify-between">
					<div>
						<h2 class="font-display text-xl font-semibold text-foreground">Propose New Time</h2>
						<p class="mt-1 text-sm text-muted-foreground">
							Current: {formatCompactDateTime(new Date(booking.start_time))}
						</p>
					</div>
					<button onclick={onClose} class="text-subtle transition-colors hover:text-foreground">
						<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
						</svg>
					</button>
				</div>
				<div class="mt-3 rounded-lg bg-surface-2 p-3">
					<p class="text-sm"><span class="text-muted-foreground">Meeting:</span> <span class="font-medium text-foreground">{booking.event_type_name}</span></p>
					<p class="text-sm"><span class="text-muted-foreground">With:</span> <span class="font-medium text-foreground">{booking.attendee_name}</span></p>
				</div>
			</div>

			<!-- Body -->
			<div class="p-6">
				{#if error}
					<div class="mb-4 rounded-lg border border-danger/30 bg-danger-muted p-3 text-sm font-medium text-danger">
						{error}
					</div>
				{/if}

				<div class="flex gap-6">
					<!-- Calendar -->
					<div class="flex-1">
						<div class="mb-4 flex items-center justify-between">
							<button onclick={prevMonth} class="rounded p-1 text-muted-foreground transition-colors hover:bg-surface-2">
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
								</svg>
							</button>
							<span class="font-medium text-foreground">{monthName}</span>
							<button onclick={nextMonth} class="rounded p-1 text-muted-foreground transition-colors hover:bg-surface-2">
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
								</svg>
							</button>
						</div>

						<div class="mb-2 grid grid-cols-7 gap-1 text-center text-xs text-subtle">
							<div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
						</div>

						<div class="grid grid-cols-7 gap-1">
							{#each calendarDays() as day}
								<button
									type="button"
									disabled={day.isPast || !day.isCurrentMonth}
									onclick={() => selectDate(day.date)}
									class="flex aspect-square items-center justify-center rounded-lg text-sm transition
										{day.isCurrentMonth ? '' : 'text-subtle'}
										{day.isPast ? 'cursor-not-allowed text-subtle' : 'hover:bg-surface-2'}
										{day.isToday ? 'font-bold' : ''}
										{selectedDate === formatDateKey(day.date) ? 'bg-primary text-primary-foreground hover:bg-primary-hover' : ''}"
								>
									{day.date.getDate()}
								</button>
							{/each}
						</div>
					</div>

					<!-- Time slots -->
					<div class="flex-1">
						<h3 class="mb-3 font-medium text-foreground">
							{#if selectedDate}
								Available times
							{:else}
								Select a date
							{/if}
						</h3>

						{#if loadingSlots}
							<div class="py-8 text-center text-subtle">Loading...</div>
						{:else if selectedDate && availableSlots.length === 0}
							<div class="py-8 text-center text-subtle">No available times</div>
						{:else if selectedDate}
							<div class="scrollbar-thin grid max-h-64 grid-cols-2 gap-2 overflow-y-auto">
								{#each availableSlots as slot}
									<button
										type="button"
										onclick={() => selectSlot(slot)}
										class="rounded-lg border px-3 py-2 text-sm transition
											{selectedTime === slot.start
												? 'border-primary bg-primary text-primary-foreground'
												: 'border-border-strong text-muted-foreground hover:border-primary hover:bg-primary-muted hover:text-primary'}"
									>
										{formatSlotTime(slot.start)}
									</button>
								{/each}
							</div>
						{:else}
							<div class="py-8 text-center text-subtle">
								<svg class="mx-auto mb-2 h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
								</svg>
								<p class="text-sm">Pick a date to see times</p>
							</div>
						{/if}
					</div>
				</div>

				<!-- Message -->
				<div class="mt-6">
					<label for="message" class="mb-2 block text-sm font-medium text-foreground">
						Message to attendee (optional)
					</label>
					<textarea
						id="message"
						bind:value={message}
						rows="3"
						class="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground transition-colors placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
						placeholder="Let them know why you need to reschedule..."
					></textarea>
				</div>
			</div>

			<!-- Footer -->
			<div class="flex justify-end gap-3 border-t border-border p-6">
				<button
					type="button"
					onclick={onClose}
					class="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={handleSubmit}
					disabled={!selectedDate || !selectedTime || submitting}
					class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft transition-all hover:bg-primary-hover hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-50"
				>
					{submitting ? 'Sending...' : 'Send Proposal'}
				</button>
			</div>
		</div>
	</div>
{/if}
