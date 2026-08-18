<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let cancelling = $state(false);
	let reason = $state('');
	const success = $derived($page.url.searchParams.get('success') === 'true');

	function formatDateTime(dateStr: string) {
		const date = new Date(dateStr);
		return new Intl.DateTimeFormat('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		}).format(date);
	}

	function handleSubmit() {
		cancelling = true;
		return async ({ update }: any) => {
			await update();
			cancelling = false;
		};
	}
</script>

<svelte:head>
	<title>Cancel Booking</title>
</svelte:head>

<div class="flex min-h-[70vh] flex-col items-center justify-center bg-background px-4 py-12">
	<div class="w-full max-w-2xl">
		{#if success || data.alreadyCanceled}
			<!-- Success Message -->
			<div class="standard-card animate-fade-in rounded-2xl p-8 text-center">
				<div
					class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-success/30 bg-success-muted text-success shadow-soft"
				>
					<svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M5 13l4 4L19 7"
						></path>
					</svg>
				</div>
				<h1 class="font-display mb-2 text-2xl font-semibold text-foreground">Booking Cancelled</h1>
				<p class="mb-6 text-muted-foreground">
					Your meeting has been cancelled successfully. The host has been notified.
				</p>
				<a
					href="/{data.booking.event_slug}"
					class="inline-block rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-soft transition-all hover:bg-primary-hover hover:shadow-glow"
				>
					Book Another Meeting
				</a>
			</div>
		{:else}
			<!-- Cancellation Form -->
			<div class="standard-card animate-fade-in rounded-2xl p-8">
				<h1 class="font-display mb-6 text-2xl font-semibold text-foreground">Cancel Booking</h1>

				{#if form?.error}
					<div class="mb-6 rounded-xl border border-danger/30 bg-danger-muted p-4 text-danger">
						Error: {form.error}
					</div>
				{/if}

				<div class="mb-6 rounded-xl border border-border bg-surface-2 p-6">
					<h2 class="font-display mb-4 font-semibold text-foreground">Booking Details</h2>
					<div class="space-y-2 text-sm">
						<div>
							<span class="text-muted-foreground">Event:</span>
							<span class="ml-2 font-medium text-foreground">{data.booking.event_name}</span>
						</div>
						<div>
							<span class="text-muted-foreground">With:</span>
							<span class="ml-2 font-medium text-foreground">{data.booking.host_name}</span>
						</div>
						<div>
							<span class="text-muted-foreground">Time:</span>
							<span class="ml-2 font-medium text-foreground"
								>{formatDateTime(data.booking.start_time)}</span
							>
						</div>
						<div>
							<span class="text-muted-foreground">Attendee:</span>
							<span class="ml-2 font-medium text-foreground">{data.booking.attendee_name}</span>
						</div>
					</div>
				</div>

				<div class="mb-6">
					<label for="reason" class="mb-2 block text-sm font-medium text-muted-foreground">
						Reason for cancellation (optional)
					</label>
					<textarea
						id="reason"
						name="reason"
						bind:value={reason}
						rows="3"
						class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
						placeholder="Let the host know why you're cancelling..."
					></textarea>
				</div>

				<div class="mb-6 rounded-xl border border-warning/30 bg-warning-muted p-4">
					<p class="text-sm text-warning">
						<strong>Warning:</strong> This action cannot be undone. The host will be notified of the cancellation.
					</p>
				</div>

				<form method="POST" use:enhance={handleSubmit}>
					<input type="hidden" name="reason" value={reason} />
					<div class="flex gap-4">
						<button
							type="submit"
							disabled={cancelling}
							class="flex-1 rounded-xl bg-danger px-6 py-3 font-semibold text-primary-foreground shadow-soft transition-all hover:opacity-90 disabled:opacity-50"
						>
							{cancelling ? 'Cancelling...' : 'Yes, Cancel Booking'}
						</button>
						<a
							href="/{data.booking.event_slug}"
							class="flex-1 rounded-xl border border-border bg-surface px-6 py-3 text-center font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
						>
							Keep Booking
						</a>
					</div>
				</form>
			</div>
		{/if}
	</div>
</div>
