<script lang="ts">
	import type { PageData } from './$types';
	import { createBrandColors } from '$lib/utils/colorUtils';
	import { BookingCalendar, TimeSlotList, BookingForm, BookingSuccess, EventSidebar } from '$lib/components/booking';
	import { createBookingFlow } from '$lib/components/booking/bookingFlow.svelte';

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

	const flow = createBookingFlow({
		events: data.eventType
			? [
					{
						id: data.eventType.id,
						slug: data.eventType.slug,
						name: data.eventType.name,
						duration: data.eventType.duration,
						description: data.eventType.description
					}
				]
			: [],
		initialSlug: data.slug,
		timeFormat: data.user?.timeFormat
	});

	// Brand colors
	const brandColor = data.user?.brandColor || '#7a5828';
	const colors = createBrandColors(brandColor);

	const metaDescription = $derived(
		data.eventType && data.user
			? `${data.eventType.name} (${data.eventType.duration} min) avec ${data.user.name} — réservez votre créneau en quelques secondes.`
			: 'Réservez votre rendez-vous en quelques secondes sur CloudMeet.'
	);

	$effect(() => {
		flow.fetchMonthAvailability();
	});
</script>

<svelte:head>
	<title>{flow.selectedMeetingTitle} — CloudMeet</title>
	<meta
		name="description"
		content={metaDescription}
	/>
	<meta property="og:title" content="{flow.selectedMeetingTitle} — {data.user?.name}" />
	<meta property="og:description" content={metaDescription} />
	<meta property="og:type" content="website" />
</svelte:head>

<div class="flex min-h-screen flex-col justify-between bg-background font-sans text-foreground">
	<!-- Main Floating Progressive Booking Card -->
	<main class="mx-auto flex w-full max-w-7xl flex-col items-center justify-center px-4 py-10 sm:px-6">
		<h1 class="sr-only">{flow.selectedMeetingTitle} — {data.user?.name}</h1>
		<div
			class="card-container w-full {flow.containerMaxWidthClass} standard-card overflow-hidden rounded-2xl"
			style="--brand-color:{brandColor}; --brand-light:{colors.light}; --brand-lighter:{colors.lighter}; --brand-dark:{colors.dark};"
		>
			<div class="grid {flow.gridColsClass} divide-border md:divide-x">
				<!-- Step 1: Appointment Type & Host Profile Panel -->
				<EventSidebar
					user={data.user}
					eventType={data.eventType}
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

				<!-- Step 2: Calendar Panel -->
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

				<!-- Step 3: Time Slot Panel -->
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
	</main>

	<!-- Modal Form / Success Pop-up -->
	{#if flow.showModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
			<div class="standard-card animate-fade-in relative w-full max-w-md rounded-2xl p-6 sm:p-7">
				<!-- Close Modal Button -->
				<button
					type="button"
					onclick={flow.closeBookingModal}
					class="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
					aria-label={flow.lang === 'fr' ? 'Fermer' : 'Close'}
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
</div>
