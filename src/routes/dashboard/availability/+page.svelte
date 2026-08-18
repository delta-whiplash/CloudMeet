<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import TimezoneSelector from '$lib/components/TimezoneSelector.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const daysOfWeek = [
		{ id: 0, name: 'Sunday' },
		{ id: 1, name: 'Monday' },
		{ id: 2, name: 'Tuesday' },
		{ id: 3, name: 'Wednesday' },
		{ id: 4, name: 'Thursday' },
		{ id: 5, name: 'Friday' },
		{ id: 6, name: 'Saturday' }
	];

	// Initialize availability state from loaded data
	let availability = $state(
		daysOfWeek.map((day) => {
			const existingRules = data.rules?.filter((r) => r.day_of_week === day.id) || [];
			return {
				day: day.id,
				name: day.name,
				enabled: existingRules.length > 0,
				startTime: existingRules[0]?.start_time || '09:00',
				endTime: existingRules[0]?.end_time || '17:00'
			};
		})
	);

	let saving = $state(false);
	let showSuccess = $state(false);
	let selectedTimezone = $state(data.timezone || 'UTC');
	let showTimezoneDropdown = $state(false);

	// Timezone label helper
	const timezoneLabels: Record<string, string> = {
		'America/Los_Angeles': 'Pacific Time',
		'America/Denver': 'Mountain Time',
		'America/Chicago': 'Central Time',
		'America/New_York': 'Eastern Time',
		'Europe/London': 'UK, Ireland Time',
		'Europe/Paris': 'Central European Time',
		'Europe/Amsterdam': 'Amsterdam Time',
		'Europe/Berlin': 'Berlin Time',
		'Asia/Tokyo': 'Japan Time',
		'Asia/Shanghai': 'China Time',
		'Australia/Sydney': 'Sydney Time',
		'UTC': 'UTC Time'
	};

	function getTimezoneLabel(tz: string): string {
		return timezoneLabels[tz] || tz.replace(/_/g, ' ').split('/').pop() || tz;
	}

	function getCurrentTime(tz: string): string {
		try {
			return new Intl.DateTimeFormat('en-US', {
				hour: 'numeric',
				minute: '2-digit',
				hour12: true,
				timeZone: tz
			}).format(new Date());
		} catch {
			return '--:--';
		}
	}

	function handleSubmit() {
		saving = true;
		showSuccess = false;
		return async ({ update, result }: any) => {
			// Update to get the form action result, but don't reload the page data
			await update({ reset: false });
			saving = false;

			// Show success message if save was successful
			if (result.type === 'success' && result.data?.success) {
				showSuccess = true;
				// Hide success message after 3 seconds
				setTimeout(() => {
					showSuccess = false;
				}, 3000);
			}
		};
	}
</script>

<div class="min-h-screen bg-background">
	<!-- Header -->
	<header class="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-xl">
		<div class="mx-auto flex h-16 w-full max-w-3xl items-center gap-4 px-4 sm:px-6">
			<a href="/dashboard" class="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
				← Back to Dashboard
			</a>
			<h1 class="font-display text-lg font-semibold text-foreground">Set Availability</h1>
		</div>
	</header>

	<main class="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
		{#if showSuccess}
				<div class="mb-6 rounded-lg border border-success/30 bg-success-muted p-4 text-sm font-medium text-success">
					✓ Availability saved successfully!
				</div>
			{/if}

			{#if form?.error}
				<div class="mb-6 rounded-lg border border-danger/30 bg-danger-muted p-4 text-sm font-medium text-danger">
					Error: {form.error}
				</div>
			{/if}

		<!-- Timezone Selection -->
		<div class="mb-6 rounded-2xl border border-border bg-surface p-6 shadow-soft">
			<h2 class="font-display mb-4 text-lg font-semibold text-foreground">Your Timezone</h2>
			<p class="mb-4 text-sm text-muted-foreground">
				Set your timezone so that your availability is shown correctly to people booking meetings.
			</p>
			<div class="relative">
				<button
					type="button"
					onclick={() => showTimezoneDropdown = !showTimezoneDropdown}
					class="flex w-full items-center gap-3 rounded-lg border border-border-strong bg-surface px-4 py-3 transition-colors hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-auto"
				>
					<svg class="h-5 w-5 text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
					</svg>
					<div class="text-left">
						<div class="font-medium text-foreground">{getTimezoneLabel(selectedTimezone)}</div>
						<div class="text-sm text-subtle">{selectedTimezone} ({getCurrentTime(selectedTimezone)})</div>
					</div>
					<svg class="ml-auto h-5 w-5 text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
					</svg>
				</button>
				{#if showTimezoneDropdown}
					<TimezoneSelector
						{selectedTimezone}
						onSelect={(tz) => selectedTimezone = tz}
						onClose={() => showTimezoneDropdown = false}
					/>
				{/if}
			</div>
		</div>

		<div class="mb-6 rounded-2xl border border-border bg-surface p-6 shadow-soft">
			<h2 class="font-display mb-4 text-lg font-semibold text-foreground">Weekly Schedule</h2>
			<p class="mb-6 text-sm text-muted-foreground">
				Set your available hours for each day of the week. People can only book meetings during these times.
			</p>

			<form method="POST" action="?/save" use:enhance={handleSubmit}>
				<input type="hidden" name="rules" value={JSON.stringify(availability)} />
				<input type="hidden" name="timezone" value={selectedTimezone} />

				<div class="space-y-4">
					{#each availability as day}
						<div class="flex items-center gap-4 rounded-lg border border-border p-4">
							<div class="flex min-w-[120px] items-center">
								<input
									type="checkbox"
									bind:checked={day.enabled}
									class="h-4 w-4 rounded border-border-strong text-primary focus:ring-primary/20"
									id="day-{day.day}"
								/>
								<label for="day-{day.day}" class="ml-2 font-medium text-foreground">
									{day.name}
								</label>
							</div>

							{#if day.enabled}
								<div class="flex flex-1 items-center gap-2">
									<input
										type="time"
										bind:value={day.startTime}
										class="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
									/>
									<span class="text-muted-foreground">to</span>
									<input
										type="time"
										bind:value={day.endTime}
										class="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
									/>
								</div>
							{:else}
								<span class="text-sm text-subtle">Unavailable</span>
							{/if}
						</div>
					{/each}
				</div>

				<div class="mt-6 flex gap-4">
					<button
						type="submit"
						disabled={saving}
						class="rounded-lg bg-primary px-6 py-2 font-semibold text-primary-foreground shadow-soft transition-all hover:bg-primary-hover hover:shadow-glow disabled:opacity-50"
					>
						{saving ? 'Saving...' : 'Save Availability'}
					</button>

					<button
						type="button"
						onclick={() => {
							// Set typical work hours (Mon-Fri 9-5)
							availability = availability.map((day) => ({
								...day,
								enabled: day.day >= 1 && day.day <= 5,
								startTime: '09:00',
								endTime: '17:00'
							}));
						}}
						class="rounded-lg border border-border bg-surface px-6 py-2 font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
					>
						Set Default Hours (Mon-Fri, 9-5)
					</button>
				</div>
			</form>
		</div>

		<div class="rounded-lg border border-info/30 bg-info-muted p-4">
			<h3 class="mb-2 font-semibold text-info">Note</h3>
			<p class="text-sm text-info">
				Your connected calendars will also be checked for conflicts. Even if you're available according to these hours,
				if you have an event on your calendar during a time slot, it won't be shown as available to book.
			</p>
		</div>
	</main>
</div>
