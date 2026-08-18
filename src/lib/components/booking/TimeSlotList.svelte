<script lang="ts">
	import { formatSelectedDate } from '$lib/utils/dateFormatters';

	interface TimeSlot {
		start: string;
		end: string;
	}

	interface Props {
		selectedDate: string;
		availableSlots: TimeSlot[];
		selectedSlot: TimeSlot | null;
		loading: boolean;
		brandColor?: string;
		formatTime: (isoStr: string) => string;
		formatDateDisplay?: (dateStr: string) => string;
		onSelectSlot: (slot: TimeSlot) => void;
		onConfirm: () => void;
		lang?: 'fr' | 'en';
	}

	let {
		selectedDate,
		availableSlots,
		selectedSlot,
		loading,
		brandColor = '#7a5828',
		formatTime,
		formatDateDisplay,
		onSelectSlot,
		onConfirm,
		lang = 'fr'
	}: Props = $props();

	const fr = $derived(lang === 'fr');

	const dateTitle = $derived(
		formatDateDisplay ? formatDateDisplay(selectedDate) : formatSelectedDate(selectedDate)
	);
</script>

<div
	id="panel-step-3"
	class="flex h-full w-full min-w-0 flex-col justify-between overflow-hidden bg-surface p-6 sm:p-7 md:p-8"
>
	<div>
		<span
			class="mb-1 block text-xs font-bold uppercase tracking-wider"
			style="color: var(--brand-color, var(--primary))"
		>
			{fr ? 'Étape 3' : 'Step 3'}
		</span>
		<div class="mb-4">
			<h3 class="text-xs font-bold uppercase tracking-wider text-subtle">
				{fr ? 'Horaire du rendez-vous' : 'Appointment Time'}
			</h3>
			<p class="mt-0.5 truncate text-sm font-semibold text-foreground sm:text-base">{dateTitle}</p>
		</div>

		{#if loading}
			<div class="flex items-center justify-center py-8">
				<div
					class="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
					style="border-color: color-mix(in oklab, var(--brand-color, var(--primary)) 30%, transparent); border-top-color: var(--brand-color, var(--primary));"
				></div>
			</div>
		{:else if availableSlots.length === 0}
			<div class="rounded-xl border border-border bg-surface-2 p-3.5 text-center text-xs text-muted-foreground">
				{fr ? 'Aucun créneau disponible pour cette date.' : 'No available slots for this date.'}
			</div>
		{:else}
			<div class="scrollbar-thin max-h-[280px] space-y-2.5 overflow-y-auto pr-1">
				{#each availableSlots as slot (slot.start)}
					{@const isSelected =
						selectedSlot === slot ||
						(selectedSlot && selectedSlot.start === slot.start && selectedSlot.end === slot.end)}
					<button
						type="button"
						onclick={() => onSelectSlot(slot)}
						class="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 font-mono text-xs font-medium transition-all sm:text-sm {isSelected
							? 'font-bold'
							: 'border border-border bg-surface text-foreground hover:bg-surface-2'}"
						style={isSelected
							? 'background: var(--brand-color, var(--primary)); color: var(--primary-foreground);'
							: ''}
					>
						<span>{formatTime(slot.start)}</span>
						<span class="text-xs font-bold {isSelected ? '' : 'text-subtle'}">
							{#if isSelected}✓{/if}
						</span>
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Confirm action -->
	{#if selectedSlot}
		<div class="mt-4 border-t border-border pt-4">
			<button
				type="button"
				onclick={onConfirm}
				class="cm-brand-btn flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold text-primary-foreground shadow-soft transition-all hover:opacity-90 hover:shadow-glow sm:text-sm"
				style="background: var(--brand-color, var(--primary));"
			>
				<span>{fr ? 'Confirmer le créneau' : 'Confirm Slot'}</span>
				<svg class="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7-7 7M3 12h18"></path>
				</svg>
			</button>
		</div>
	{/if}
</div>
