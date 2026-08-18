<script lang="ts">
	import type { PageData } from './$types';
	import { createBrandColors } from '$lib/utils/colorUtils';
	import { BookingCalendar, TimeSlotList, BookingForm, BookingSuccess, EventSidebar } from '$lib/components/booking';
	import { createBookingFlow } from '$lib/components/booking/bookingFlow.svelte';
	import Logo from '$lib/components/Logo.svelte';

	let { data }: { data: PageData } = $props();

	// Available event types from load
	const eventTypesList = $derived(
		(data.eventTypes || []).map((e) => ({
			id: e.id,
			slug: e.slug,
			name: e.name,
			duration: e.duration,
			description: e.description
		}))
	);

	const flow = createBookingFlow({
		events: eventTypesList,
		timeFormat: '24h'
	});

	const fr = $derived(flow.lang === 'fr');

	// Brand colors
	const brandColor = data.user?.brandColor || '#7a5828';
	const colors = createBrandColors(brandColor);

	$effect(() => {
		if (data.user) {
			flow.fetchMonthAvailability();
		}
	});
</script>

<svelte:head>
	<title>CloudMeet — {fr ? 'Réservation de rendez-vous' : 'Meeting scheduling'}</title>
	<meta
		name="description"
		content={fr
			? 'CloudMeet — plateforme de réservation de rendez-vous open-source et auto-hébergée.'
			: 'CloudMeet — open-source, self-hosted meeting scheduling.'}
	/>
</svelte:head>

{#if data.user}
	<!-- Progressive booking flow (configured host) -->
	<section class="mx-auto flex w-full max-w-7xl flex-col items-center justify-center px-4 py-10 sm:px-6">
		<h1 class="sr-only">{data.user.name} — CloudMeet</h1>
		<div
			class="card-container w-full {flow.containerMaxWidthClass} standard-card overflow-hidden rounded-2xl"
			style="--brand-color:{brandColor}; --brand-light:{colors.light}; --brand-lighter:{colors.lighter}; --brand-dark:{colors.dark};"
		>
			<div class="grid {flow.gridColsClass} divide-border md:divide-x">
				<EventSidebar
					user={data.user}
					eventType={null}
					eventTypes={eventTypesList}
					selectedMeetingId={flow.selectedMeetingId}
					onSelectMeeting={flow.handleSelectMeeting}
					selectedDate={flow.selectedDate}
					selectedSlot={flow.selectedSlot}
					{brandColor}
					formatTime={flow.formatTime}
					selectedTimezone={flow.selectedTimezone}
					timezoneLabel={flow.timezoneLabel}
					onSelectTimezone={flow.setTimezone}
					use24h={flow.use24h}
					onToggleTimeFormat={flow.toggleTimeFormat}
					lang={flow.lang}
					onSetLanguage={flow.setLanguage}
				/>

				{#if flow.currentStep >= 2}
					<div class="step-panel-anim panel-visible h-full w-full min-w-0 flex-col flex-1 overflow-hidden">
						<BookingCalendar
							currentMonth={flow.currentMonth}
							selectedDate={flow.selectedDate}
							availableDates={flow.availableDates}
							{brandColor}
							brandLighter={colors.lighter}
							brandDark={colors.dark}
							onDateSelect={flow.handleDateSelect}
							onPrevMonth={flow.prevMonth}
							onNextMonth={flow.nextMonth}
							onGoToToday={flow.goToToday}
							lang={flow.lang}
						/>
					</div>
				{/if}

				{#if flow.currentStep >= 3 && flow.selectedDate}
					<div class="step-panel-anim panel-visible h-full w-full min-w-0 flex-col flex-1 overflow-hidden">
						<TimeSlotList
							selectedDate={flow.selectedDate}
							availableSlots={flow.availableSlots}
							selectedSlot={flow.selectedSlot}
							loading={flow.loading}
							{brandColor}
							formatTime={flow.formatTime}
							formatDateDisplay={flow.formatDisplayDate}
							onSelectSlot={flow.handleSelectSlot}
							onConfirm={flow.openBookingModal}
							lang={flow.lang}
						/>
					</div>
				{/if}
			</div>
		</div>
	</section>

	{#if flow.showModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
			<div class="standard-card animate-fade-in relative w-full max-w-md rounded-2xl p-6 sm:p-7">
				<button
					type="button"
					onclick={flow.closeBookingModal}
					class="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
					aria-label={fr ? 'Fermer' : 'Close'}
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
					</svg>
				</button>

				{#if flow.bookingStatus !== 'success'}
					<BookingForm
						bind:bookingForm={flow.bookingForm}
						bookingStatus={flow.bookingStatus}
						bookingError={flow.bookingError}
						slotRecapText={flow.slotRecapText}
						{brandColor}
						brandDark={colors.dark}
						onSubmit={flow.handleSubmit}
						lang={flow.lang}
					/>
				{:else}
					<BookingSuccess
						eventName={flow.selectedMeetingTitle}
						selectedDate={flow.selectedDate || ''}
						selectedSlot={flow.selectedSlot!}
						meetingUrl={flow.meetingUrl}
						meetingType={flow.meetingType}
						{brandColor}
						formattedDateText={flow.selectedDate ? flow.formatDisplayDate(flow.selectedDate) : ''}
						formattedTimeText={flow.selectedSlot ? flow.formatTime(flow.selectedSlot.start) : ''}
						onClose={flow.closeBookingModal}
						lang={flow.lang}
					/>
				{/if}
			</div>
		</div>
	{/if}
{:else}
	<!-- No host configured yet — minimal get-started state -->
	<div class="mx-auto flex min-h-[68vh] w-full max-w-md flex-col items-center justify-center px-4 text-center">
		<div class="animate-fade-in">
			<Logo size={56} showWordmark={false} class="mx-auto" />
			<h1 class="font-display mt-5 text-3xl font-semibold text-foreground">CloudMeet</h1>
			<p class="mt-2 text-muted-foreground">
				{fr
					? "Configurez votre profil pour commencer à recevoir des réservations."
					: 'Set up your profile to start receiving bookings.'}
			</p>
			<a
				href="/dashboard"
				class="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:bg-primary-hover hover:shadow-glow"
			>
				{fr ? 'Accéder au tableau de bord' : 'Go to dashboard'}
				<svg
					class="h-4 w-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M5 12h14M13 5l7 7-7 7" />
				</svg>
			</a>
		</div>
	</div>
{/if}
