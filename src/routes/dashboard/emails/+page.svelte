<script lang="ts">
	import { onMount } from 'svelte';

	interface EmailTemplate {
		template_type: string;
		name: string;
		description: string;
		default_subject: string;
		id: string | null;
		is_enabled: boolean;
		subject: string;
		custom_message: string | null;
	}

	let templates = $state<EmailTemplate[]>([]);
	let loading = $state(true);
	let saving = $state<string | null>(null);
	let error = $state('');
	let success = $state('');

	// Track which template is expanded for editing
	let expandedTemplate = $state<string | null>(null);

	// Edit states for each template
	let editSubjects = $state<Record<string, string>>({});
	let editMessages = $state<Record<string, string>>({});

	onMount(async () => {
		await fetchTemplates();
	});

	async function fetchTemplates() {
		try {
			const response = await fetch('/api/email-templates');
			if (!response.ok) throw new Error('Failed to fetch templates');
			const data = await response.json() as { templates: EmailTemplate[] };
			templates = data.templates;

			// Initialize edit states
			templates.forEach(t => {
				editSubjects[t.template_type] = t.subject || t.default_subject;
				editMessages[t.template_type] = t.custom_message || '';
			});
		} catch (err: any) {
			error = err.message || 'Failed to load email templates';
		} finally {
			loading = false;
		}
	}

	async function toggleTemplate(template: EmailTemplate) {
		saving = template.template_type;
		error = '';

		try {
			const response = await fetch('/api/email-templates', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					template_type: template.template_type,
					is_enabled: !template.is_enabled,
					subject: editSubjects[template.template_type],
					custom_message: editMessages[template.template_type] || null
				})
			});

			if (!response.ok) throw new Error('Failed to update template');

			// Update local state
			templates = templates.map(t =>
				t.template_type === template.template_type
					? { ...t, is_enabled: !t.is_enabled }
					: t
			);
		} catch (err: any) {
			error = err.message || 'Failed to update template';
		} finally {
			saving = null;
		}
	}

	async function saveTemplate(template: EmailTemplate) {
		saving = template.template_type;
		error = '';
		success = '';

		try {
			const response = await fetch('/api/email-templates', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					template_type: template.template_type,
					is_enabled: template.is_enabled,
					subject: editSubjects[template.template_type],
					custom_message: editMessages[template.template_type] || null
				})
			});

			if (!response.ok) throw new Error('Failed to save template');

			// Update local state
			templates = templates.map(t =>
				t.template_type === template.template_type
					? {
						...t,
						subject: editSubjects[template.template_type],
						custom_message: editMessages[template.template_type] || null
					}
					: t
			);

			success = `${template.name} settings saved`;
			setTimeout(() => success = '', 3000);
			expandedTemplate = null;
		} catch (err: any) {
			error = err.message || 'Failed to save template';
		} finally {
			saving = null;
		}
	}

	function getTemplateIcon(type: string) {
		switch (type) {
			case 'confirmation':
				return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
			case 'cancellation':
				return 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z';
			case 'reschedule':
				return 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15';
			case 'reminder_24h':
			case 'reminder_1h':
			case 'reminder_30m':
				return 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z';
			default:
				return 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z';
		}
	}

	function getCategoryLabel(type: string) {
		if (type.startsWith('reminder_')) return 'Reminder';
		return 'Notification';
	}
</script>

<div class="min-h-screen bg-background">
	<!-- Header -->
	<header class="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-xl">
		<div class="mx-auto flex h-16 w-full max-w-5xl items-center gap-4 px-4 sm:px-6">
			<a href="/dashboard" class="text-muted-foreground transition-colors hover:text-foreground" aria-label="Back to dashboard">
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
				</svg>
			</a>
			<div class="min-w-0">
				<h1 class="font-display truncate text-lg font-semibold text-foreground">Email Settings</h1>
				<p class="hidden truncate text-xs text-muted-foreground sm:block">Manage your automated email notifications</p>
			</div>
		</div>
	</header>

	<main class="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
		{#if error}
			<div class="mb-6 rounded-lg border border-danger/30 bg-danger-muted p-4 text-sm font-medium text-danger">
				{error}
			</div>
		{/if}

		{#if success}
			<div class="mb-6 rounded-lg border border-success/30 bg-success-muted p-4 text-sm font-medium text-success">
				{success}
			</div>
		{/if}

		{#if loading}
			<div class="flex justify-center py-12">
				<div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
			</div>
		{:else}
			<!-- Google Calendar Notice -->
			<div class="mb-6 rounded-lg border border-success/30 bg-success-muted p-4">
				<div class="flex gap-3">
					<svg class="mt-0.5 h-5 w-5 flex-shrink-0 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
					</svg>
					<div class="text-sm text-success">
						<p class="mb-1 font-medium">Calendar Notifications</p>
						<p>Your attendees will always receive calendar invitations with meeting details and video call links (Google Meet or Microsoft Teams). The emails below are <strong>additional</strong> custom notifications you can send.</p>
					</div>
				</div>
			</div>

			<!-- Info Box -->
			<div class="mb-6 rounded-lg border border-info/30 bg-info-muted p-4">
				<div class="flex gap-3">
					<svg class="mt-0.5 h-5 w-5 flex-shrink-0 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
					</svg>
					<div class="text-sm text-info">
						<p class="mb-1 font-medium">Email Variables</p>
						<p>You can use these variables in your subject lines:</p>
						<code class="rounded bg-info-muted px-1 py-0.5 font-mono text-xs text-info">{'{event_name}'}</code>,
						<code class="rounded bg-info-muted px-1 py-0.5 font-mono text-xs text-info">{'{host_name}'}</code>,
						<code class="rounded bg-info-muted px-1 py-0.5 font-mono text-xs text-info">{'{attendee_name}'}</code>,
						<code class="rounded bg-info-muted px-1 py-0.5 font-mono text-xs text-info">{'{date}'}</code>,
						<code class="rounded bg-info-muted px-1 py-0.5 font-mono text-xs text-info">{'{time}'}</code>
					</div>
				</div>
			</div>

			<!-- Notification Emails -->
			<div class="mb-8">
				<h2 class="font-display mb-4 text-lg font-semibold text-foreground">Booking Notifications</h2>
				<div class="space-y-3">
					{#each templates.filter(t => !t.template_type.startsWith('reminder_')) as template}
						<div class="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
							<div class="p-4">
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-3">
										<div class="rounded-lg bg-surface-2 p-2">
											<svg class="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getTemplateIcon(template.template_type)}></path>
											</svg>
										</div>
										<div>
											<h3 class="font-medium text-foreground">{template.name}</h3>
											<p class="text-sm text-subtle">{template.description}</p>
										</div>
									</div>
									<div class="flex items-center gap-3">
										<button
											onclick={() => expandedTemplate = expandedTemplate === template.template_type ? null : template.template_type}
											class="text-sm font-medium text-primary transition-opacity hover:opacity-80"
										>
											{expandedTemplate === template.template_type ? 'Close' : 'Edit'}
										</button>
										<label class="relative inline-flex items-center cursor-pointer">
											<input
												type="checkbox"
												checked={template.is_enabled}
												onchange={() => toggleTemplate(template)}
												disabled={saving === template.template_type}
												class="sr-only peer"
											/>
											<div class="peer h-6 w-11 rounded-full bg-surface-2 peer-checked:after:translate-x-full peer-checked:bg-primary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rtl:peer-checked:after:-translate-x-full after:absolute after:top-[2px] after:start-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-surface after:transition-all after:content-[''] peer-checked:after:border-surface"></div>
										</label>
									</div>
								</div>
							</div>

							{#if expandedTemplate === template.template_type}
								<div class="border-t border-border bg-surface-2 p-4">
									<div class="space-y-4">
										<div>
											<label class="mb-1 block text-sm font-medium text-foreground">
												Subject Line
											</label>
											<input
												type="text"
												bind:value={editSubjects[template.template_type]}
												placeholder={template.default_subject}
												class="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground transition-colors placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
											/>
										</div>

										<div>
											<label class="mb-1 block text-sm font-medium text-foreground">
												Custom Message (Optional)
											</label>
											<textarea
												bind:value={editMessages[template.template_type]}
												placeholder="Add a personal message that will appear in the email..."
												rows="3"
												class="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground transition-colors placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
											></textarea>
											<p class="mt-1 text-xs text-subtle">This message will be added to the email template</p>
										</div>

										<div class="flex justify-end gap-2">
											<button
												onclick={() => expandedTemplate = null}
												class="px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
											>
												Cancel
											</button>
											<button
												onclick={() => saveTemplate(template)}
												disabled={saving === template.template_type}
												class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft transition-all hover:bg-primary-hover hover:shadow-glow disabled:opacity-50"
											>
												{saving === template.template_type ? 'Saving...' : 'Save Changes'}
											</button>
										</div>
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<!-- Reminder Emails -->
			<div>
				<h2 class="font-display mb-4 text-lg font-semibold text-foreground">Meeting Reminders</h2>
				<p class="mb-4 text-sm text-muted-foreground">Automatically remind attendees before their scheduled meetings.</p>
				<div class="space-y-3">
					{#each templates.filter(t => t.template_type.startsWith('reminder_')) as template}
						<div class="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
							<div class="p-4">
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-3">
										<div class="rounded-lg bg-warning-muted p-2">
											<svg class="h-5 w-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getTemplateIcon(template.template_type)}></path>
											</svg>
										</div>
										<div>
											<h3 class="font-medium text-foreground">{template.name}</h3>
											<p class="text-sm text-subtle">{template.description}</p>
										</div>
									</div>
									<div class="flex items-center gap-3">
										<button
											onclick={() => expandedTemplate = expandedTemplate === template.template_type ? null : template.template_type}
											class="text-sm font-medium text-primary transition-opacity hover:opacity-80"
										>
											{expandedTemplate === template.template_type ? 'Close' : 'Edit'}
										</button>
										<label class="relative inline-flex items-center cursor-pointer">
											<input
												type="checkbox"
												checked={template.is_enabled}
												onchange={() => toggleTemplate(template)}
												disabled={saving === template.template_type}
												class="sr-only peer"
											/>
											<div class="peer h-6 w-11 rounded-full bg-surface-2 peer-checked:after:translate-x-full peer-checked:bg-primary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rtl:peer-checked:after:-translate-x-full after:absolute after:top-[2px] after:start-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-surface after:transition-all after:content-[''] peer-checked:after:border-surface"></div>
										</label>
									</div>
								</div>
							</div>

							{#if expandedTemplate === template.template_type}
								<div class="border-t border-border bg-surface-2 p-4">
									<div class="space-y-4">
										<div>
											<label class="mb-1 block text-sm font-medium text-foreground">
												Subject Line
											</label>
											<input
												type="text"
												bind:value={editSubjects[template.template_type]}
												placeholder={template.default_subject}
												class="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground transition-colors placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
											/>
										</div>

										<div>
											<label class="mb-1 block text-sm font-medium text-foreground">
												Custom Message (Optional)
											</label>
											<textarea
												bind:value={editMessages[template.template_type]}
												placeholder="Add a personal message that will appear in the reminder..."
												rows="3"
												class="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground transition-colors placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
											></textarea>
										</div>

										<div class="flex justify-end gap-2">
											<button
												onclick={() => expandedTemplate = null}
												class="px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
											>
												Cancel
											</button>
											<button
												onclick={() => saveTemplate(template)}
												disabled={saving === template.template_type}
												class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft transition-all hover:bg-primary-hover hover:shadow-glow disabled:opacity-50"
											>
												{saving === template.template_type ? 'Saving...' : 'Save Changes'}
											</button>
										</div>
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<!-- Note about reminders -->
			<div class="mt-6 rounded-lg border border-warning/30 bg-warning-muted p-4">
				<div class="flex gap-3">
					<svg class="mt-0.5 h-5 w-5 flex-shrink-0 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
					</svg>
					<div class="text-sm text-warning">
						<p class="font-medium">Reminder emails are processed every few minutes</p>
						<p class="mt-1">Reminders are sent automatically based on your settings. Make sure your email configuration is set up correctly in your environment.</p>
					</div>
				</div>
			</div>
		{/if}
	</main>
</div>
