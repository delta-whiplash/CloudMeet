<script lang="ts">
	import { createFormatters } from '$lib/utils/dateFormatters';

	interface Booking {
		id: string;
		event_type_name: string;
		attendee_name: string;
		attendee_email: string;
		start_time: string;
		status: string;
	}

	interface Props {
		booking: Booking | null;
		show: boolean;
		onClose: () => void;
		onCancel: (message: string) => Promise<void>;
	}

	let { booking, show, onClose, onCancel }: Props = $props();

	let cancelMessage = $state('');
	let cancelError = $state('');
	let cancelling = $state(false);

	const { formatCompactDateTime } = createFormatters();

	async function handleCancel() {
		if (!booking) return;

		cancelling = true;
		cancelError = '';

		try {
			await onCancel(cancelMessage.trim() || '');
			cancelMessage = '';
			cancelError = '';
		} catch (err: any) {
			cancelError = err.message || 'Failed to cancel booking';
		} finally {
			cancelling = false;
		}
	}

	function handleClose() {
		cancelMessage = '';
		cancelError = '';
		onClose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (show && e.key === 'Escape') handleClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if show && booking}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
		<div
			role="dialog"
			aria-modal="true"
			aria-label="Cancel booking"
			class="w-full max-w-md rounded-2xl border border-border bg-surface shadow-card"
		>
			<div class="p-6">
				<h3 class="font-display mb-2 text-lg font-semibold text-foreground">Cancel Booking</h3>
				<p class="mb-4 text-sm text-muted-foreground">
					Cancel <strong>{booking.event_type_name}</strong> with <strong>{booking.attendee_name}</strong> on {formatCompactDateTime(new Date(booking.start_time))}?
				</p>

				{#if cancelError}
					<div class="mb-4 rounded-lg border border-danger/30 bg-danger-muted p-3 text-sm font-medium text-danger">
						{cancelError}
					</div>
				{/if}

				<div class="mb-4">
					<label for="cancel-message" class="mb-1 block text-sm font-medium text-foreground">
						Message to attendee (optional)
					</label>
					<textarea
						id="cancel-message"
						bind:value={cancelMessage}
						placeholder="Let them know why you're cancelling..."
						rows="3"
						class="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground transition-colors placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
					></textarea>
					<p class="mt-1 text-xs text-subtle">This message will be included in the cancellation email</p>
				</div>

				<div class="flex justify-end gap-3">
					<button
						onclick={handleClose}
						class="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
					>
						Keep Booking
					</button>
					<button
						onclick={handleCancel}
						disabled={cancelling}
						class="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft transition-all hover:bg-danger/90 disabled:opacity-50"
					>
						{cancelling ? 'Cancelling...' : 'Cancel Booking'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
