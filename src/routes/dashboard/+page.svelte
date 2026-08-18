<script lang="ts">
	import type { PageData } from './$types';
	import { ProfileSection, OpenStandardSettings, CancelBookingModal, HostRescheduleModal, BookingsList, EventTypesList } from '$lib/components/dashboard';
	import Logo from '$lib/components/Logo.svelte';
	import { theme } from '$lib/theme.svelte';

	let { data }: { data: PageData } = $props();

	let bookings = $state(data.recentBookings || []);
	let cancellingBookingId = $state<string | null>(null);
	let showCancelModal = $state(false);
	let cancelSuccess = $state('');
	let reschedulingBookingId = $state<string | null>(null);
	let rescheduleSuccess = $state('');
	let showOpenStandards = $state(false);

	function openCancelModal(bookingId: string) {
		cancellingBookingId = bookingId;
		showCancelModal = true;
	}

	function closeCancelModal() {
		showCancelModal = false;
		cancellingBookingId = null;
	}

	async function cancelBooking(message: string) {
		if (!cancellingBookingId) return;

		const response = await fetch('/api/bookings/cancel', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				bookingId: cancellingBookingId,
				message: message || null
			})
		});

		if (!response.ok) {
			const errData = await response.json() as { message?: string };
			throw new Error(errData.message || 'Failed to cancel booking');
		}

		bookings = bookings.map((b) => (b.id === cancellingBookingId ? { ...b, status: 'canceled' } : b));

		cancelSuccess = 'Booking cancelled successfully';
		closeCancelModal();
		setTimeout(() => (cancelSuccess = ''), 3000);
	}

	function getBookingById(bookingId: string | null) {
		if (!bookingId) return null;
		return bookings.find((b) => b.id === bookingId) || null;
	}

	function openRescheduleModal(bookingId: string) {
		reschedulingBookingId = bookingId;
	}

	function closeRescheduleModal() {
		reschedulingBookingId = null;
	}

	async function submitRescheduleProposal(
		bookingId: string,
		newStartTime: string,
		newEndTime: string,
		message: string
	) {
		const response = await fetch('/api/bookings/propose-reschedule', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				bookingId,
				proposedStartTime: newStartTime,
				proposedEndTime: newEndTime,
				message: message || null
			})
		});

		if (!response.ok) {
			const errData = await response.json() as { message?: string };
			throw new Error(errData.message || 'Failed to send reschedule proposal');
		}

		bookings = bookings.map((b) => (b.id === bookingId ? { ...b, status: 'rescheduled' } : b));

		rescheduleSuccess = 'Reschedule proposal sent to attendee';
		closeRescheduleModal();
		setTimeout(() => (rescheduleSuccess = ''), 3000);
	}

	let copied = $state(false);
	function copyLink() {
		navigator.clipboard?.writeText(data.appUrl + '/');
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="min-h-screen bg-background">
	<!-- Dashboard header -->
	<header class="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-xl">
		<div class="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
			<div class="flex min-w-0 items-center gap-3">
				<a href="/" class="transition-opacity hover:opacity-80" aria-label="CloudMeet — accueil">
					<Logo showWordmark={false} />
				</a>
				<div class="min-w-0">
					<h1 class="font-display truncate text-lg font-semibold text-foreground">Dashboard</h1>
					<p class="hidden truncate text-xs text-muted-foreground sm:block">
						Welcome back, {data.user?.name || 'User'}!
					</p>
				</div>
			</div>

			<div class="flex flex-wrap items-center justify-end gap-2">
				<button
					onclick={() => (showOpenStandards = !showOpenStandards)}
					class="rounded-lg px-3 py-2 text-sm font-medium transition-colors {showOpenStandards
						? 'bg-primary text-primary-foreground'
						: 'border border-border bg-surface text-muted-foreground hover:bg-surface-2 hover:text-foreground'}"
				>
					CalDAV & SMTP
				</button>
				<a
					href="/dashboard/calendars"
					class="hidden rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground sm:inline-block"
				>
					Calendars
				</a>
				<a
					href="/dashboard/emails"
					class="hidden rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground sm:inline-block"
				>
					Emails
				</a>
				<a
					href="/dashboard/availability"
					class="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:bg-primary-hover hover:shadow-glow"
				>
					Availability
				</a>

				<button
					type="button"
					onclick={() => theme.toggle()}
					class="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
					aria-label="Toggle theme"
					title="Toggle theme"
				>
					{#if theme.isDark}
						<svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
						</svg>
					{:else}
						<svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
						</svg>
					{/if}
				</button>

				<form method="POST" action="/auth/logout">
					<button
						type="submit"
						class="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
					>
						Logout
					</button>
				</form>
			</div>
		</div>
	</header>

	<main class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Profile -->
		<ProfileSection user={data.user} />

		<!-- Open standards (CalDAV / CardDAV / SMTP) -->
		{#if showOpenStandards}
			<OpenStandardSettings user={data.user} />
		{/if}

		<!-- Booking link -->
		<div class="mb-8 rounded-2xl border border-border bg-surface p-5 shadow-soft">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 class="font-display text-base font-semibold text-foreground">Your booking page</h2>
					<p class="mt-0.5 text-sm text-muted-foreground">Share this link so people can book time with you.</p>
				</div>
				<div class="flex items-center gap-2">
					<input
						type="text"
						readonly
						value="{data.appUrl}/"
						class="w-full min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-muted-foreground sm:w-auto"
					/>
					<button
						onclick={copyLink}
						class="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:bg-primary-hover hover:shadow-glow"
					>
						{copied ? 'Copied!' : 'Copy'}
					</button>
				</div>
			</div>
		</div>

		{#if cancelSuccess || rescheduleSuccess}
			<div class="mb-4 rounded-lg border border-success/30 bg-success-muted p-3 text-sm font-medium text-success">
				{cancelSuccess || rescheduleSuccess}
			</div>
		{/if}

		<div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
			<EventTypesList eventTypes={data.eventTypes || []} />
			<BookingsList {bookings} onCancelClick={openCancelModal} onRescheduleClick={openRescheduleModal} />
		</div>
	</main>
</div>

<CancelBookingModal
	booking={getBookingById(cancellingBookingId)}
	show={showCancelModal}
	onClose={closeCancelModal}
	onCancel={cancelBooking}
/>

<HostRescheduleModal
	booking={getBookingById(reschedulingBookingId)}
	onClose={closeRescheduleModal}
	onSubmit={submitRescheduleProposal}
/>
