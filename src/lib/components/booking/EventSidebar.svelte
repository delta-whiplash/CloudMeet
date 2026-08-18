<script lang="ts">
	import { browser } from '$app/environment';
	import {
		getSidebarTimezones,
		getTimezoneDisplayLabel,
		getTimezoneOffset
	} from '$lib/constants/timezones';

	interface EventTypeItem {
		id: string;
		slug?: string;
		name: string;
		duration: number;
		description?: string | null;
	}

	interface Props {
		user: {
			profileImage?: string | null;
			name?: string;
			role?: string;
		} | null;
		eventType: {
			id?: string;
			slug?: string;
			name: string;
			duration: number;
			description?: string | null;
			cover_image?: string | null;
			invite_calendar?: string | null;
		} | null;
		eventTypes?: EventTypeItem[];
		selectedMeetingId?: string | null;
		onSelectMeeting?: (type: EventTypeItem) => void;
		selectedDate?: string | null;
		selectedSlot?: { start: string; end: string } | null;
		brandColor?: string;
		formatTime?: (isoStr: string) => string;
		selectedTimezone?: string;
		timezoneLabel?: string;
		onSelectTimezone?: (tz: string, label: string) => void;
		use24h?: boolean;
		onToggleTimeFormat?: () => void;
		lang?: 'fr' | 'en';
		onSetLanguage?: (lang: 'fr' | 'en') => void;
	}

	let {
		user,
		eventType,
		eventTypes = [],
		selectedMeetingId = null,
		onSelectMeeting,
		selectedDate = null,
		selectedSlot = null,
		brandColor = '#7a5828',
		formatTime,
		selectedTimezone = 'Europe/Paris',
		timezoneLabel = getTimezoneDisplayLabel(selectedTimezone),
		onSelectTimezone,
		use24h = true,
		onToggleTimeFormat,
		lang = 'fr',
		onSetLanguage
	}: Props = $props();

	let showTzDropdown = $state(false);

	function toggleTzDropdown() {
		showTzDropdown = !showTzDropdown;
	}

	function selectTz(tz: string, label: string) {
		if (onSelectTimezone) {
			onSelectTimezone(tz, label);
		}
		showTzDropdown = false;
	}

	function handleWindowClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (showTzDropdown && !target.closest('#tz-menu-container-side')) {
			showTzDropdown = false;
		}
	}

	let sanitizedDescription = $state('');
	$effect(() => {
		if (eventType?.description) {
			if (browser) {
				import('isomorphic-dompurify').then(({ default: DOMPurify }) => {
					sanitizedDescription = DOMPurify.sanitize(eventType.description!);
				});
			} else {
				sanitizedDescription = eventType.description
					.replace(/&/g, '&amp;')
					.replace(/</g, '&lt;')
					.replace(/>/g, '&gt;');
			}
		} else {
			sanitizedDescription = '';
		}
	});

	const fr = $derived(lang === 'fr');
	const meetingLabel = eventType?.invite_calendar === 'outlook' ? 'Microsoft Teams' : 'Google Meet';

	// Real event types only — never invent booking options for the host.
	const displayOptions = $derived<EventTypeItem[]>(
		eventTypes.length > 0
			? eventTypes
			: eventType
				? [
						{
							id: eventType.id ?? eventType.name,
							slug: eventType.slug,
							name: eventType.name,
							duration: eventType.duration,
							description: eventType.description
						}
					]
				: []
	);

	function getInitials(name?: string) {
		if (!name) return 'CM';
		const parts = name.trim().split(' ');
		if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
		return name.slice(0, 2).toUpperCase();
	}
</script>

<svelte:window onclick={handleWindowClick} />

<div
	id="panel-step-1"
	class="relative flex h-full w-full min-w-0 flex-col justify-between overflow-hidden bg-surface p-6 sm:p-7 md:p-8"
>
	<!-- Top controls -->
	<div class="absolute right-4 top-4 z-10 flex items-center gap-2">
		{#if onToggleTimeFormat}
			<button
				type="button"
				onclick={onToggleTimeFormat}
				class="flex items-center rounded-lg border border-border bg-surface px-2 py-1 font-mono text-xs text-muted-foreground transition-colors hover:bg-surface-2"
				title={fr ? 'Format horaire' : 'Time format'}
			>
				{use24h ? '24h' : '12h'}
			</button>
		{/if}

		{#if onSetLanguage}
			<div class="flex items-center gap-0.5 rounded-lg border border-border bg-surface-2 p-0.5 text-xs font-bold">
				<button
					type="button"
					onclick={() => onSetLanguage('fr')}
					class="rounded px-2 py-0.5 transition-colors {lang === 'fr' ? 'bg-surface text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'}"
				>
					FR
				</button>
				<button
					type="button"
					onclick={() => onSetLanguage('en')}
					class="rounded px-2 py-0.5 transition-colors {lang === 'en' ? 'bg-surface text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'}"
				>
					EN
				</button>
			</div>
		{/if}
	</div>

	<div class="space-y-5 pt-2">
		<!-- Host profile -->
		<div class="border-b border-border pb-5 text-center">
			<div class="relative mb-2 inline-block">
				{#if user?.profileImage}
					<img
						src={user.profileImage}
						alt={user.name}
						class="mx-auto h-18 w-18 rounded-full border-4 border-surface-2 object-cover shadow-soft sm:h-20 sm:w-20"
					/>
				{:else}
					<div
						class="mx-auto flex h-18 w-18 items-center justify-center rounded-full border-4 border-surface-2 text-xl font-bold text-primary-foreground shadow-soft sm:h-20 sm:w-20"
						style="background: var(--brand-color, var(--primary))"
					>
						{getInitials(user?.name)}
					</div>
				{/if}
			</div>
			<h2 class="font-display text-xl font-semibold tracking-tight text-foreground">
				{user?.name || (fr ? 'Votre hôte' : 'Your host')}
			</h2>
			{#if user?.role}
				<p class="mt-0.5 text-xs font-medium text-muted-foreground">{user.role}</p>
			{/if}
		</div>

		<div>
			<span
				class="mb-1 block text-xs font-bold uppercase tracking-wider"
				style="color: var(--brand-color, var(--primary))"
			>
				{fr ? 'Étape 1' : 'Step 1'}
			</span>
			<h3 class="font-display text-base font-semibold text-foreground">
				{fr ? 'Type de rendez-vous' : 'Appointment Type'}
			</h3>
			<p class="mt-1 text-xs text-muted-foreground">
				{fr
					? 'Sélectionnez la formule souhaitée pour afficher les disponibilités.'
					: 'Select a meeting duration to view available calendar slots.'}
			</p>
		</div>

		<!-- Event type options -->
		{#if displayOptions.length === 0}
			<p class="rounded-xl border border-border bg-surface-2 p-4 text-sm text-muted-foreground">
				{fr
					? "Aucun rendez-vous n'est proposé pour le moment. Revenez bientôt !"
					: 'No appointments are available yet. Please check back soon!'}
			</p>
		{/if}

		<div class="space-y-3">
			{#each displayOptions as option (option.id)}
				{@const isSelected =
					selectedMeetingId === option.id ||
					(eventType && eventType.duration === option.duration && !selectedMeetingId)}
				<button
					type="button"
					onclick={() => onSelectMeeting && onSelectMeeting(option)}
					class="group flex w-full cursor-pointer items-center justify-between rounded-xl p-3.5 text-left transition-all sm:p-4 {isSelected
						? 'border-2'
						: 'standard-interactive'}"
					style={isSelected
						? 'border-color: var(--brand-color, var(--primary)); background: color-mix(in oklab, var(--brand-color, var(--primary)) 10%, var(--surface));'
						: ''}
				>
					<div class="flex min-w-0 items-center gap-3.5">
						<div
							class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border text-xs font-bold transition-colors"
							style={isSelected
								? 'background: var(--brand-color, var(--primary)); color: var(--primary-foreground); border-color: var(--brand-color, var(--primary));'
								: 'background: var(--surface-2); color: var(--muted-foreground); border-color: var(--border);'}
						>
							{option.duration}m
						</div>
						<div class="min-w-0 flex-1">
							<div class="truncate text-sm font-semibold text-foreground">{option.name}</div>
							{#if option.description}
								<div class="truncate text-xs text-muted-foreground">{option.description}</div>
							{/if}
						</div>
					</div>
					<svg
						class="ml-2 h-4 w-4 flex-shrink-0 transition-all"
						style={isSelected ? 'color: var(--brand-color, var(--primary))' : 'color: var(--subtle)'}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
					</svg>
				</button>
			{/each}
		</div>

		{#if sanitizedDescription && (!eventTypes || eventTypes.length === 0)}
			<div class="prose prose-sm mt-2 max-w-none border-t border-border pt-2 text-xs text-muted-foreground">
				{@html sanitizedDescription}
			</div>
		{/if}
	</div>

	<!-- Metadata -->
	<div class="mt-6 space-y-2 border-t border-border pt-5 text-xs text-muted-foreground">
		<div class="flex items-center justify-between">
			<span class="text-subtle">{fr ? 'Format :' : 'Format:'}</span>
			<span class="flex items-center gap-1.5 font-semibold text-foreground">
				<svg class="h-4 w-4 flex-shrink-0" style="color: var(--brand-color, var(--primary))" fill="currentColor" viewBox="0 0 24 24">
					<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
				</svg>
				<span class="truncate">{meetingLabel}</span>
			</span>
		</div>

		<!-- Timezone selector -->
		<div class="flex items-center justify-between">
			<span class="text-subtle">{fr ? 'Fuseau horaire :' : 'Timezone:'}</span>
			<div id="tz-menu-container-side" class="relative">
				<button
					type="button"
					onclick={toggleTzDropdown}
					class="flex items-center gap-1 font-semibold text-foreground transition-colors hover:opacity-80"
				>
					<svg class="h-3.5 w-3.5 flex-shrink-0 text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
					</svg>
					<span class="truncate">{timezoneLabel}</span>
					<svg class="h-3 w-3 flex-shrink-0 text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
					</svg>
				</button>

				{#if showTzDropdown}
					<div class="absolute bottom-6 right-0 z-40 max-h-56 w-56 overflow-y-auto rounded-lg border border-border bg-surface py-1 text-xs shadow-card">
						<div class="border-b border-border px-3 py-1 text-[10px] font-bold uppercase text-subtle">
							{fr ? 'Fuseaux Horaires' : 'Timezones'}
						</div>
						{#each getSidebarTimezones(selectedTimezone || 'Europe/Paris') as tz (tz)}
							<button
								type="button"
								onclick={() => selectTz(tz, getTimezoneDisplayLabel(tz))}
								class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-foreground transition-colors hover:bg-surface-2"
							>
								<span class="truncate">{tz.replace(/_/g, ' ')}</span>
								<span class="font-mono text-[10px] text-subtle">{getTimezoneOffset(tz)}</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<div class="flex items-center justify-between">
			<span class="text-subtle">{fr ? 'Confirmation :' : 'Confirmation:'}</span>
			<span class="font-semibold text-foreground">{fr ? 'Instantanée' : 'Instant'}</span>
		</div>
	</div>
</div>
