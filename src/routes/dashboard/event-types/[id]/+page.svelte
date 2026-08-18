<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import SimpleWysiwyg from '$lib/components/SimpleWysiwyg.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let name = $state(data.eventType.name);
	let slug = $state(data.eventType.slug);
	let duration = $state(data.eventType.duration);
	let description = $state(data.eventType.description || '');
	let isActive = $state(data.eventType.is_active === 1);
	let coverImage = $state(data.eventType.cover_image || '');
	let saving = $state(false);
	let uploadingCover = $state(false);

	// Check which calendars are available
	const hasGoogle = data.googleConnected;
	const hasOutlook = data.outlookConnected && data.outlookConfigured;

	// Check if this event type has custom calendar settings (override is enabled)
	// If availability_calendars or invite_calendar is set, override was enabled
	const hasCustomSettings = !!(data.eventType.availability_calendars || data.eventType.invite_calendar);
	let overrideCalendarSettings = $state(hasCustomSettings);

	// Get global defaults
	function getGlobalAvailability() {
		if (data.defaultAvailabilityCalendars) return data.defaultAvailabilityCalendars;
		if (hasGoogle && hasOutlook) return 'both';
		if (hasOutlook) return 'outlook';
		return 'google';
	}

	function getGlobalInviteCalendar() {
		if (data.defaultInviteCalendar) return data.defaultInviteCalendar;
		if (hasGoogle) return 'google';
		if (hasOutlook) return 'outlook';
		return 'google';
	}

	// Get values for form (use custom if set, otherwise use global)
	function getDefaultAvailability() {
		if (data.eventType.availability_calendars) return data.eventType.availability_calendars;
		return getGlobalAvailability();
	}

	function getDefaultInviteCalendar() {
		if (data.eventType.invite_calendar) return data.eventType.invite_calendar;
		return getGlobalInviteCalendar();
	}

	let availabilityCalendars = $state(getDefaultAvailability());
	let inviteCalendar = $state(getDefaultInviteCalendar());

	// Labels for displaying current global settings
	function getAvailabilityLabel(val: string) {
		if (val === 'both') return 'Both calendars';
		if (val === 'outlook') return 'Outlook Calendar';
		return 'Google Calendar';
	}

	function getInviteLabel(val: string) {
		if (val === 'outlook') return 'Outlook (Microsoft Teams)';
		return 'Google Calendar (Google Meet)';
	}

	async function handleCoverUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		// Check file size (max 2MB)
		if (file.size > 2 * 1024 * 1024) {
			alert('Image must be less than 2MB');
			return;
		}

		uploadingCover = true;
		try {
			// Convert to base64
			const reader = new FileReader();
			reader.onload = () => {
				coverImage = reader.result as string;
				uploadingCover = false;
			};
			reader.onerror = () => {
				alert('Failed to read image');
				uploadingCover = false;
			};
			reader.readAsDataURL(file);
		} catch (err) {
			alert('Failed to upload image');
			uploadingCover = false;
		}
	}

	function removeCoverImage() {
		coverImage = '';
	}

	// Auto-generate slug from name
	$effect(() => {
		if (name && name !== data.eventType.name) {
			slug = name
				.toLowerCase()
				.replace(/[^a-z0-9\s-]/g, '')
				.replace(/\s+/g, '-')
				.replace(/-+/g, '-')
				.trim();
		}
	});

	function handleSubmit() {
		saving = true;
		return async ({ update }: any) => {
			await update();
			saving = false;
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
			<h1 class="font-display text-lg font-semibold text-foreground">Edit Event Type</h1>
		</div>
	</header>

	<main class="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
		{#if form?.error}
			<div class="mb-6 rounded-lg border border-danger/30 bg-danger-muted p-4 text-sm font-medium text-danger">
				Error: {form.error}
			</div>
		{/if}

		<div class="rounded-2xl border border-border bg-surface p-6 shadow-soft">
			<form method="POST" use:enhance={handleSubmit}>
				<div class="space-y-6">
					<!-- Event Name -->
					<div>
						<label for="name" class="mb-2 block text-sm font-medium text-foreground">
							Event Name *
						</label>
						<input
							type="text"
							id="name"
							name="name"
							bind:value={name}
							required
							placeholder="e.g., 30 Minute Meeting"
							class="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-foreground transition-colors placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
						/>
					</div>

					<!-- Slug -->
					<div>
						<label for="slug" class="mb-2 block text-sm font-medium text-foreground">
							URL Slug *
						</label>
						<input
							type="text"
							id="slug"
							name="slug"
							bind:value={slug}
							required
							pattern="[a-z0-9\-]+"
							placeholder="e.g., 30min"
							class="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-foreground transition-colors placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
						/>
						<p class="mt-1 text-xs text-subtle">
							Only lowercase letters, numbers, and hyphens. This will be part of your booking URL.
						</p>
					</div>

					<!-- Duration -->
					<div>
						<label for="duration" class="mb-2 block text-sm font-medium text-foreground">
							Duration (minutes) *
						</label>
						<select
							id="duration"
							name="duration"
							bind:value={duration}
							required
							class="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-foreground transition-colors placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
						>
							<option value={15}>15 minutes</option>
							<option value={30}>30 minutes</option>
							<option value={45}>45 minutes</option>
							<option value={60}>60 minutes</option>
							<option value={90}>90 minutes</option>
							<option value={120}>2 hours</option>
						</select>
					</div>

					<!-- Description -->
					<div>
						<label for="description" class="mb-2 block text-sm font-medium text-foreground">
							Description
						</label>
						<SimpleWysiwyg
							bind:value={description}
							placeholder="Describe what this meeting is for..."
						/>
						<input type="hidden" name="description" value={description} />
					</div>

					<!-- Cover Image -->
					<div>
						<label class="mb-2 block text-sm font-medium text-foreground">
							Cover Image
						</label>
						<p class="mb-3 text-xs text-subtle">
							This image will be displayed at the top of your booking page (like Calendly)
						</p>

						{#if coverImage}
							<div class="relative mb-3 rounded-lg bg-surface-2 p-4">
								<img
									src={coverImage}
									alt="Cover preview"
									class="mx-auto max-h-20 w-auto object-contain"
								/>
								<button
									type="button"
									onclick={removeCoverImage}
									class="absolute right-2 top-2 rounded-full bg-danger p-1.5 text-primary-foreground transition-colors hover:bg-danger/90"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
									</svg>
								</button>
							</div>
						{/if}

						<label class="flex h-32 w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border-strong transition hover:border-primary hover:bg-primary-muted {coverImage ? 'hidden' : ''}">
							<input
								type="file"
								accept="image/*"
								onchange={handleCoverUpload}
								class="hidden"
								disabled={uploadingCover}
							/>
							{#if uploadingCover}
								<div class="flex items-center gap-2 text-muted-foreground">
									<div class="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
									<span>Uploading...</span>
								</div>
							{:else}
								<div class="text-center">
									<svg class="mx-auto mb-2 h-8 w-8 text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
									</svg>
									<p class="text-sm text-muted-foreground">Click to upload cover image</p>
									<p class="text-xs text-subtle">Max 2MB</p>
								</div>
							{/if}
						</label>
						<input type="hidden" name="cover_image" value={coverImage} />
					</div>

					<!-- Calendar Settings -->
					{#if hasGoogle || hasOutlook}
						<div class="border-t border-border pt-6">
							<h3 class="mb-4 text-sm font-medium text-foreground">Calendar Settings</h3>

							<!-- Show current global settings -->
							<div class="mb-4 rounded-lg bg-surface-2 p-3 text-sm">
								<p class="mb-1 text-muted-foreground">
									<span class="font-medium text-foreground">Check availability from:</span> {getAvailabilityLabel(getGlobalAvailability())}
								</p>
								<p class="text-muted-foreground">
									<span class="font-medium text-foreground">Send invite via:</span> {getInviteLabel(getGlobalInviteCalendar())}
								</p>
								<p class="mt-2 text-xs text-subtle">
									These are your global settings. <a href="/dashboard" class="text-primary hover:underline">Change in Dashboard</a>
								</p>
							</div>

							<!-- Override checkbox -->
							<div class="flex items-center mb-4">
								<input
									type="checkbox"
									id="override_calendar_settings"
									name="override_calendar_settings"
									bind:checked={overrideCalendarSettings}
									class="h-4 w-4 rounded border-border-strong text-primary focus:ring-primary/20"
								/>
								<label for="override_calendar_settings" class="ml-2 text-sm text-muted-foreground">
									Override global calendar settings for this event type
								</label>
							</div>

							{#if overrideCalendarSettings}
								<!-- Availability Calendars -->
								<div class="mb-4">
									<label for="availability_calendars" class="mb-2 block text-sm font-medium text-foreground">
										Check availability from
									</label>
									<select
										id="availability_calendars"
										name="availability_calendars"
										bind:value={availabilityCalendars}
										class="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-foreground transition-colors placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
									>
										{#if hasGoogle && hasOutlook}
											<option value="both">Both Google & Outlook calendars</option>
										{/if}
										{#if hasGoogle}
											<option value="google">Google Calendar only</option>
										{/if}
										{#if hasOutlook}
											<option value="outlook">Outlook Calendar only</option>
										{/if}
									</select>
									<p class="mt-1 text-xs text-subtle">
										Which calendars to check when showing available time slots
									</p>
								</div>

								<!-- Invite Calendar -->
								<div>
									<label for="invite_calendar" class="mb-2 block text-sm font-medium text-foreground">
										Send calendar invite via
									</label>
									<select
										id="invite_calendar"
										name="invite_calendar"
										bind:value={inviteCalendar}
										class="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-foreground transition-colors placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
									>
										{#if hasGoogle}
											<option value="google">Google Calendar (with Google Meet)</option>
										{/if}
										{#if hasOutlook}
											<option value="outlook">Outlook Calendar (with Microsoft Teams)</option>
										{/if}
									</select>
									<p class="mt-1 text-xs text-subtle">
										The attendee will receive an invite from this calendar with the meeting link
									</p>
								</div>
							{/if}
						</div>
					{:else}
						<div class="border-t border-border pt-6">
							<p class="text-sm text-muted-foreground">
								Connect a calendar in <a href="/dashboard" class="text-primary hover:underline">Dashboard Settings</a> to configure calendar options.
							</p>
						</div>
					{/if}

					<!-- Is Active -->
					<div class="flex items-center">
						<input
							type="checkbox"
							id="is_active"
							name="is_active"
							bind:checked={isActive}
							class="h-4 w-4 rounded border-border-strong text-primary focus:ring-primary/20"
						/>
						<label for="is_active" class="ml-2 text-sm text-muted-foreground">
							Active (allow people to book this event type)
						</label>
					</div>

					<!-- Submit -->
					<div class="flex gap-4 pt-4">
						<button
							type="submit"
							disabled={saving}
							class="rounded-lg bg-primary px-6 py-2 font-semibold text-primary-foreground shadow-soft transition-all hover:bg-primary-hover hover:shadow-glow disabled:opacity-50"
						>
							{saving ? 'Saving...' : 'Save Changes'}
						</button>
						<a
							href="/dashboard"
							class="rounded-lg border border-border bg-surface px-6 py-2 font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
						>
							Cancel
						</a>
					</div>
				</div>
			</form>
		</div>
	</main>
</div>
