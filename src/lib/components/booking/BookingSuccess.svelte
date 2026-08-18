<script lang="ts">
	interface Props {
		eventName: string;
		selectedDate: string;
		selectedSlot: { start: string; end: string };
		meetingUrl: string | null;
		meetingType?: 'google_meet' | 'teams';
		brandColor?: string;
		formatTimeRange?: (start: string, end: string) => string;
		formatSelectedDate?: (dateStr: string) => string;
		formattedTimeText?: string;
		formattedDateText?: string;
		onClose?: () => void;
		lang?: 'fr' | 'en';
	}

	let {
		eventName,
		selectedDate,
		selectedSlot,
		meetingUrl,
		meetingType = 'google_meet',
		brandColor = '#7a5828',
		formatTimeRange,
		formatSelectedDate,
		formattedTimeText = '',
		formattedDateText = '',
		onClose,
		lang = 'fr'
	}: Props = $props();

	const fr = $derived(lang === 'fr');

	const dateStrDisplay = $derived(
		formattedDateText || (formatSelectedDate ? formatSelectedDate(selectedDate) : selectedDate)
	);
	const timeStrDisplay = $derived(
		formattedTimeText ||
			(formatTimeRange ? formatTimeRange(selectedSlot.start, selectedSlot.end) : `${selectedSlot.start} - ${selectedSlot.end}`)
	);
</script>

<div class="w-full space-y-4 py-2 text-center">
	<div
		class="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-success/30 bg-success-muted text-success shadow-soft"
	>
		<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
		</svg>
	</div>
	<div>
		<h3 class="font-display text-lg font-semibold text-foreground">
			{fr ? 'Rendez-vous Confirmé' : 'Appointment Confirmed'}
		</h3>
		<p class="mt-1 text-xs text-muted-foreground">
			{fr
				? 'Une invitation vous a été adressée par e-mail.'
				: 'A calendar invitation has been sent to your inbox.'}
		</p>
	</div>

	<div class="space-y-2 rounded-xl border border-border bg-surface-2 p-3.5 text-left text-xs text-muted-foreground">
		<div class="flex justify-between">
			<span class="text-subtle">{fr ? 'Type :' : 'Type:'}</span>
			<span class="font-bold text-foreground">{eventName}</span>
		</div>
		<div class="flex justify-between">
			<span class="text-subtle">{fr ? 'Horaire :' : 'Time:'}</span>
			<span class="text-right font-bold text-foreground">{dateStrDisplay} — {timeStrDisplay}</span>
		</div>
		<div class="flex items-center justify-between gap-2">
			<span class="text-subtle">{fr ? "Lien d'accès :" : 'Meeting Link:'}</span>
			{#if meetingUrl}
				<a
					href={meetingUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="truncate font-mono text-xs hover:underline"
					style="color: var(--brand-color, var(--primary))"
				>
					{meetingUrl.replace('https://', '')}
				</a>
			{:else}
				<span class="font-mono text-xs" style="color: var(--brand-color, var(--primary))">
					meet.google.com/cloudmeet
				</span>
			{/if}
		</div>
	</div>

	<div class="pt-2">
		<button
			type="button"
			onclick={onClose}
			class="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-xs font-bold text-foreground shadow-soft transition-colors hover:bg-surface-2"
		>
			{fr ? 'Fermer' : 'Close'}
		</button>
	</div>
</div>
