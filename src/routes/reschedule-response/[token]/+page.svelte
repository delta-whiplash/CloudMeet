<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const success = $derived($page.url.searchParams.get('success'));
	const action = $derived(data.action);

	const brandColor = data.proposal?.brand_color || '#7a5828';

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

	function formatDate(dateStr: string) {
		const date = new Date(dateStr);
		return new Intl.DateTimeFormat('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		}).format(date);
	}

	function formatTime(dateStr: string) {
		const date = new Date(dateStr);
		return new Intl.DateTimeFormat('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		}).format(date);
	}
</script>

<svelte:head>
	<title>Reschedule Response</title>
</svelte:head>

<div class="flex min-h-[70vh] flex-col items-center justify-center bg-background p-4">
	{#if success === 'accepted'}
		<!-- Accepted Success -->
		<div class="standard-card animate-fade-in w-full max-w-md rounded-2xl p-8 text-center">
			<div
				class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-success/30 bg-success-muted text-success shadow-soft"
			>
				<svg class="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
				</svg>
			</div>
			<h1 class="font-display mb-2 text-2xl font-semibold text-foreground">Meeting Rescheduled!</h1>
			<p class="mb-6 text-muted-foreground">
				Your meeting has been confirmed for the new time. A calendar update has been sent to your email.
			</p>
			<div class="rounded-xl border border-border bg-surface-2 p-4 text-left">
				<p class="font-display mb-2 font-semibold text-foreground">{data.proposal?.event_name}</p>
				<p class="text-sm text-muted-foreground">{formatDateTime(data.proposal?.proposed_start_time || '')}</p>
			</div>
		</div>
	{:else if success === 'declined'}
		<!-- Declined Success -->
		<div class="standard-card animate-fade-in w-full max-w-md rounded-2xl p-8 text-center">
			<div
				class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-danger/30 bg-danger-muted text-danger shadow-soft"
			>
				<svg class="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
				</svg>
			</div>
			<h1 class="font-display mb-2 text-2xl font-semibold text-foreground">Meeting Cancelled</h1>
			<p class="mb-6 text-muted-foreground">
				The meeting has been cancelled. The host has been notified.
			</p>
			<a
				href="/{data.proposal?.event_slug}"
				class="inline-block rounded-xl px-6 py-3 font-semibold text-primary-foreground shadow-soft transition-all hover:opacity-90"
				style="background-color: {brandColor}"
			>
				Book a New Time
			</a>
		</div>
	{:else if data.alreadyResponded}
		<!-- Already Responded -->
		<div class="standard-card animate-fade-in w-full max-w-md rounded-2xl p-8 text-center">
			<div
				class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-warning/30 bg-warning-muted text-warning shadow-soft"
			>
				<svg class="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
				</svg>
			</div>
			<h1 class="font-display mb-2 text-2xl font-semibold text-foreground">Already Responded</h1>
			<p class="text-muted-foreground">
				This reschedule request has already been {data.proposal?.status}.
			</p>
		</div>
	{:else if action === 'counter'}
		<!-- Counter Propose - Redirect to reschedule page -->
		<div class="standard-card animate-fade-in w-full max-w-md rounded-2xl p-8 text-center">
			<h1 class="font-display mb-4 text-2xl font-semibold text-foreground">Propose Different Time</h1>
			<p class="mb-6 text-muted-foreground">
				You'll be redirected to choose a different time for your meeting.
			</p>
			<a
				href="/reschedule/{data.proposal?.booking_id}"
				class="inline-block rounded-xl px-6 py-3 font-semibold text-primary-foreground shadow-soft transition-all hover:opacity-90"
				style="background-color: {brandColor}"
			>
				Choose Different Time
			</a>
		</div>
	{:else}
		<!-- Response Form -->
		<div class="standard-card animate-fade-in w-full max-w-lg rounded-2xl p-8">
			<h1 class="font-display mb-2 text-center text-2xl font-semibold text-foreground">Reschedule Request</h1>
			<p class="mb-6 text-center text-muted-foreground">
				<strong>{data.proposal?.host_name}</strong> would like to reschedule your meeting.
			</p>

			{#if form?.error}
				<div class="mb-6 rounded-xl border border-danger/30 bg-danger-muted p-4 text-danger">
					{form.error}
				</div>
			{/if}

			{#if data.proposal?.message}
				<div class="mb-6 rounded-xl border border-warning/30 bg-warning-muted p-4">
					<p class="text-sm text-warning">{data.proposal.message}</p>
				</div>
			{/if}

			<div class="mb-6 space-y-4">
				<!-- Original Time -->
				<div class="rounded-xl border border-danger/30 bg-danger-muted p-4">
					<div class="mb-2 text-xs font-semibold uppercase text-danger">Original Time</div>
					<div class="text-muted-foreground line-through">
						<p class="font-medium">{formatDate(data.proposal?.original_start_time || '')}</p>
						<p class="text-sm">{formatTime(data.proposal?.original_start_time || '')} - {formatTime(data.proposal?.original_end_time || '')}</p>
					</div>
				</div>

				<!-- Proposed New Time -->
				<div class="rounded-xl border border-success/30 bg-success-muted p-4">
					<div class="mb-2 text-xs font-semibold uppercase text-success">Proposed New Time</div>
					<div class="text-foreground">
						<p class="font-medium">{formatDate(data.proposal?.proposed_start_time || '')}</p>
						<p class="text-sm">{formatTime(data.proposal?.proposed_start_time || '')} - {formatTime(data.proposal?.proposed_end_time || '')}</p>
					</div>
				</div>
			</div>

			<div class="mb-6 rounded-xl border border-border bg-surface-2 p-4">
				<p class="text-sm"><span class="text-muted-foreground">Meeting:</span> <span class="font-medium text-foreground">{data.proposal?.event_name}</span></p>
				<p class="text-sm"><span class="text-muted-foreground">With:</span> <span class="font-medium text-foreground">{data.proposal?.host_name}</span></p>
			</div>

			<div class="space-y-3">
				<form method="POST" action="?/accept" use:enhance>
					<button
						type="submit"
						class="w-full rounded-xl bg-success px-6 py-3 font-semibold text-primary-foreground shadow-soft transition-all hover:opacity-90"
					>
						Accept New Time
					</button>
				</form>

				<form method="POST" action="?/decline" use:enhance>
					<button
						type="submit"
						class="w-full rounded-xl bg-danger px-6 py-3 font-semibold text-primary-foreground shadow-soft transition-all hover:opacity-90"
					>
						Decline & Cancel Meeting
					</button>
				</form>

				<a
					href="/reschedule/{data.proposal?.booking_id}"
					class="block w-full rounded-xl border-2 px-6 py-3 text-center font-medium transition-colors hover:bg-surface-2"
					style="border-color: {brandColor}; color: {brandColor}"
				>
					Propose Different Time
				</a>
			</div>
		</div>
	{/if}
</div>
