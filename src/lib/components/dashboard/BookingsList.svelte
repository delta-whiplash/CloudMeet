<script lang="ts">
	import { createFormatters } from '$lib/utils/dateFormatters';

	interface Booking {
		id: string;
		event_type_name: string;
		event_type_slug: string;
		event_type_id: string;
		duration_minutes: number;
		attendee_name: string;
		attendee_email: string;
		start_time: string;
		end_time: string;
		status: string;
		attendee_notes?: string | null;
		canceled_by?: string | null;
		cancellation_reason?: string | null;
	}

	interface Props {
		bookings: Booking[];
		onCancelClick: (bookingId: string) => void;
		onRescheduleClick: (bookingId: string) => void;
	}

	let { bookings, onCancelClick, onRescheduleClick }: Props = $props();

	const { formatCompactDateTime } = createFormatters();

	let sortOrder = $state<'last_booked' | 'upcoming'>('last_booked');

	const sortedBookings = $derived.by(() => {
		if (!bookings) return [];
		const sorted = [...bookings];
		if (sortOrder === 'upcoming') {
			sorted.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
		}
		return sorted;
	});

	function getStatusStyle(status: string) {
		switch (status) {
			case 'confirmed':
				return 'bg-success-muted text-success';
			case 'canceled':
				return 'bg-danger-muted text-danger';
			case 'pending':
				return 'bg-warning-muted text-warning';
			case 'rescheduled':
				return 'bg-info-muted text-info';
			default:
				return 'bg-surface-2 text-muted-foreground';
		}
	}
</script>

<div>
	<div class="mb-4 flex items-center justify-between">
		<h2 class="font-display text-xl font-semibold text-foreground">Bookings</h2>
		<select
			bind:value={sortOrder}
			class="rounded-lg border border-border-strong bg-surface px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
		>
			<option value="last_booked">Last booked</option>
			<option value="upcoming">Upcoming first</option>
		</select>
	</div>

	<div class="space-y-3">
		{#if sortedBookings.length > 0}
			{#each sortedBookings as booking (booking.id)}
				<div class="rounded-xl border border-border bg-surface p-4 shadow-soft">
					<div class="mb-2 flex items-start justify-between gap-2">
						<div class="min-w-0">
							<h3 class="truncate font-semibold text-foreground">{booking.event_type_name}</h3>
							<p class="truncate text-sm text-muted-foreground">{booking.attendee_name}</p>
							<p class="truncate text-xs text-subtle">{booking.attendee_email}</p>
						</div>
						<div class="flex shrink-0 flex-col items-end gap-2">
							<span class="rounded-full px-2 py-0.5 text-xs font-medium capitalize {getStatusStyle(booking.status)}">
								{booking.status}
							</span>
							{#if booking.status === 'confirmed'}
								<div class="flex items-center gap-2 text-xs">
									<button
										onclick={() => onRescheduleClick(booking.id)}
										class="font-medium text-primary transition-opacity hover:opacity-80"
									>
										Reschedule
									</button>
									<span class="text-subtle">·</span>
									<button
										onclick={() => onCancelClick(booking.id)}
										class="font-medium text-danger transition-opacity hover:opacity-80"
									>
										Cancel
									</button>
								</div>
							{/if}
						</div>
					</div>
					<div class="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
						<svg class="h-3.5 w-3.5 text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						{formatCompactDateTime(new Date(booking.start_time))}
					</div>
					{#if booking.attendee_notes}
						<div class="mt-2 rounded-lg bg-surface-2 p-2 text-sm text-muted-foreground">
							<span class="font-medium text-foreground">Message:</span> {booking.attendee_notes}
						</div>
					{/if}
					{#if booking.status === 'canceled'}
						<div class="mt-2 rounded-lg bg-danger-muted p-2 text-sm text-danger">
							<span class="font-medium">Cancelled by {booking.canceled_by === 'host' ? 'you' : 'attendee'}</span>
							{#if booking.cancellation_reason}
								<span>: {booking.cancellation_reason}</span>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		{:else}
			<div class="rounded-xl border border-dashed border-border bg-surface p-8 text-center">
				<p class="text-muted-foreground">No bookings yet</p>
			</div>
		{/if}
	</div>
</div>
