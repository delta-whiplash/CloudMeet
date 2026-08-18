<script lang="ts">
	import { formatDateLocal } from '$lib/utils/dateFormatters';

	interface Props {
		currentMonth: Date;
		selectedDate: string | null;
		availableDates: Set<string>;
		brandColor?: string;
		brandLighter?: string;
		brandDark?: string;
		onDateSelect: (dateStr: string) => void;
		onPrevMonth: () => void;
		onNextMonth: () => void;
		onGoToToday?: () => void;
		lang?: 'fr' | 'en';
	}

	let {
		currentMonth,
		selectedDate,
		availableDates,
		brandColor = '#7a5828',
		brandLighter,
		brandDark,
		onDateSelect,
		onPrevMonth,
		onNextMonth,
		onGoToToday,
		lang = 'fr'
	}: Props = $props();

	const fr = $derived(lang === 'fr');

	const monthNames = {
		fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
		en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
	};

	const weekDays = {
		fr: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
		en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
	};

	function formatMonthYear(date: Date) {
		const m = monthNames[lang][date.getMonth()];
		return `${m} ${date.getFullYear()}`;
	}

	const calendarDays = $derived.by(() => {
		const year = currentMonth.getFullYear();
		const month = currentMonth.getMonth();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const startPadding = (firstDay.getDay() + 6) % 7;
		const days: Array<{ date: Date; isCurrentMonth: boolean; isAvailable: boolean; dateStr: string }> = [];

		for (let i = 0; i < startPadding; i++) {
			const date = new Date(year, month, i - startPadding + 1);
			days.push({ date, isCurrentMonth: false, isAvailable: false, dateStr: formatDateLocal(date) });
		}

		const today = new Date();
		today.setHours(0, 0, 0, 0);
		for (let i = 1; i <= lastDay.getDate(); i++) {
			const date = new Date(year, month, i);
			const dateStr = formatDateLocal(date);
			const isAvailable = date >= today && date <= new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
			days.push({ date, isCurrentMonth: true, isAvailable, dateStr });
		}

		const remaining = 42 - days.length;
		for (let i = 1; i <= remaining; i++) {
			const date = new Date(year, month + 1, i);
			days.push({ date, isCurrentMonth: false, isAvailable: false, dateStr: formatDateLocal(date) });
		}

		return days;
	});
</script>

<div
	id="panel-step-2"
	class="flex h-full w-full min-w-0 flex-col justify-between overflow-hidden bg-surface p-6 sm:p-7 md:p-8"
>
	<div>
		<div>
			<span
				class="mb-1 block text-xs font-bold uppercase tracking-wider"
				style="color: var(--brand-color, var(--primary))"
			>
				{fr ? 'Étape 2' : 'Step 2'}
			</span>
			<div class="mb-4 flex items-center justify-between gap-2">
				<div class="min-w-0">
					<h3 class="font-display truncate text-base font-semibold text-foreground sm:text-lg">
						{formatMonthYear(currentMonth)}
					</h3>
					<p class="mt-0.5 truncate text-xs text-muted-foreground">
						{fr ? 'Choisissez un jour disponible' : 'Select an available date'}
					</p>
				</div>

				<div class="flex flex-shrink-0 items-center gap-2">
					{#if onGoToToday}
						<button
							type="button"
							onclick={onGoToToday}
							class="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-bold text-muted-foreground shadow-soft transition-colors hover:bg-surface-2 hover:text-foreground"
							title={fr ? 'Revenir au mois actuel' : 'Return to current month'}
						>
							{fr ? "Aujourd'hui" : 'Today'}
						</button>
					{/if}
					<div class="flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5">
						<button
							type="button"
							onclick={onPrevMonth}
							class="rounded p-1.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
							aria-label="Previous month"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
						</button>
						<button
							type="button"
							onclick={onNextMonth}
							class="rounded p-1.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
							aria-label="Next month"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Weekday headers -->
		<div class="grid grid-cols-7 border-b border-border py-2 text-center text-xs font-bold uppercase text-subtle">
			{#each weekDays[lang] as dayName}
				<span>{dayName}</span>
			{/each}
		</div>

		<!-- Day grid -->
		<div class="grid grid-cols-7 gap-1.5 pt-3.5 text-center font-bold">
			{#each calendarDays as day (day.dateStr)}
				{@const hasSlots = availableDates.has(day.dateStr)}
				{@const isClickable = day.isCurrentMonth && day.isAvailable && hasSlots}
				{@const isSelected = selectedDate === day.dateStr}

				{#if !day.isCurrentMonth}
					<div class="aspect-square"></div>
				{:else}
					<button
						type="button"
						onclick={() => isClickable && onDateSelect(day.dateStr)}
						disabled={!isClickable}
						class="flex aspect-square items-center justify-center rounded-xl text-xs font-bold transition-all sm:text-sm {isSelected
							? 'scale-105'
							: isClickable
								? 'cursor-pointer border border-border bg-surface text-foreground hover:border-border-strong hover:bg-surface-2'
								: 'cursor-not-allowed text-subtle opacity-50'}"
						style={isSelected
							? 'background: var(--brand-color, var(--primary)); color: var(--primary-foreground); box-shadow: 0 4px 14px -4px color-mix(in oklab, var(--brand-color, var(--primary)) 60%, transparent);'
							: ''}
					>
						<span>{day.date.getDate()}</span>
					</button>
				{/if}
			{/each}
		</div>
	</div>

	<!-- Legend -->
	<div class="mt-4 flex items-center justify-around border-t border-border pt-4 text-xs text-muted-foreground">
		<span class="flex items-center gap-1.5">
			<span class="h-3.5 w-3.5 rounded" style="background: var(--brand-color, var(--primary))"></span>
			<span>{fr ? 'Sélectionné' : 'Selected'}</span>
		</span>
		<span class="flex items-center gap-1.5">
			<span class="h-3.5 w-3.5 rounded border border-border bg-surface"></span>
			<span>{fr ? 'Disponible' : 'Available'}</span>
		</span>
	</div>
</div>
