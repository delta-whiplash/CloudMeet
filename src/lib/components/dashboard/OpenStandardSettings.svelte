<script lang="ts">
	interface Props {
		user: {
			caldavUrl?: string | null;
			caldavUsername?: string | null;
			caldavPassword?: string | null;
			caldavCalendarPath?: string | null;
			carddavUrl?: string | null;
			carddavUsername?: string | null;
			carddavPassword?: string | null;
			smtpHost?: string | null;
			smtpPort?: number | null;
			smtpUsername?: string | null;
			smtpPassword?: string | null;
			smtpSecure?: boolean | number | null;
			smtpFrom?: string | null;
			contactEmail?: string | null;
			email?: string;
		} | null;
	}

	let { user }: Props = $props();

	// CalDAV state
	let caldavUrl = $state(user?.caldavUrl || '');
	let caldavUsername = $state(user?.caldavUsername || '');
	let caldavPassword = $state(user?.caldavPassword || '');
	let caldavCalendarPath = $state(user?.caldavCalendarPath || '');

	// CardDAV state
	let carddavUrl = $state(user?.carddavUrl || '');
	let carddavUsername = $state(user?.carddavUsername || '');
	let carddavPassword = $state(user?.carddavPassword || '');

	// SMTP state
	let smtpHost = $state(user?.smtpHost || '');
	let smtpPort = $state(user?.smtpPort || 587);
	let smtpUsername = $state(user?.smtpUsername || '');
	let smtpPassword = $state(user?.smtpPassword || '');
	let smtpSecure = $state(Boolean(user?.smtpSecure));
	let smtpFrom = $state(user?.smtpFrom || user?.contactEmail || user?.email || '');

	// UI feedback
	let saving = $state(false);
	let testingCaldav = $state(false);
	let testingCarddav = $state(false);
	let testingSmtp = $state(false);
	let message = $state({ text: '', type: 'info' as 'success' | 'error' | 'info' });

	async function saveSettings() {
		saving = true;
		message = { text: '', type: 'info' };
		try {
			const res = await fetch('/api/profile', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					caldavUrl,
					caldavUsername,
					caldavPassword,
					caldavCalendarPath,
					carddavUrl,
					carddavUsername,
					carddavPassword,
					smtpHost,
					smtpPort: Number(smtpPort),
					smtpUsername,
					smtpPassword,
					smtpSecure,
					smtpFrom
				})
			});
			if (res.ok) {
				message = { text: 'Open Standard settings saved successfully!', type: 'success' };
			} else {
				const err = await res.json() as { message?: string };
				message = { text: err.message || 'Failed to save settings', type: 'error' };
			}
		} catch (err) {
			message = { text: 'Network error saving settings', type: 'error' };
		} finally {
			saving = false;
		}
	}

	async function testCaldav() {
		testingCaldav = true;
		message = { text: 'Testing CalDAV connection...', type: 'info' };
		try {
			const res = await fetch('/api/integrations/test-caldav', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					serverUrl: caldavUrl,
					username: caldavUsername,
					password: caldavPassword,
					calendarPath: caldavCalendarPath
				})
			});
			const data = await res.json() as { success: boolean; message: string };
			message = { text: data.message, type: data.success ? 'success' : 'error' };
		} catch (err) {
			message = { text: 'CalDAV connection test failed', type: 'error' };
		} finally {
			testingCaldav = false;
		}
	}

	async function testCarddav() {
		testingCarddav = true;
		message = { text: 'Testing CardDAV connection...', type: 'info' };
		try {
			const res = await fetch('/api/integrations/test-carddav', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					serverUrl: carddavUrl,
					username: carddavUsername,
					password: carddavPassword
				})
			});
			const data = await res.json() as { success: boolean; message: string };
			message = { text: data.message, type: data.success ? 'success' : 'error' };
		} catch (err) {
			message = { text: 'CardDAV connection test failed', type: 'error' };
		} finally {
			testingCarddav = false;
		}
	}

	async function testSmtp() {
		testingSmtp = true;
		message = { text: 'Sending test email via SMTP...', type: 'info' };
		try {
			const res = await fetch('/api/integrations/test-smtp', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					host: smtpHost,
					port: Number(smtpPort),
					username: smtpUsername,
					password: smtpPassword,
					secure: smtpSecure,
					from: smtpFrom,
					recipientEmail: user?.contactEmail || user?.email || smtpFrom
				})
			});
			const data = await res.json() as { success: boolean; message: string };
			message = { text: data.message, type: data.success ? 'success' : 'error' };
		} catch (err) {
			message = { text: 'SMTP test failed', type: 'error' };
		} finally {
			testingSmtp = false;
		}
	}
</script>

<div class="mt-6 rounded-2xl border border-border bg-surface p-6 shadow-soft">
	<div class="mb-4 flex items-center justify-between">
		<div>
			<h3 class="font-display text-lg font-semibold text-foreground">Open Standards (CalDAV, CardDAV & SMTP)</h3>
			<p class="text-sm text-muted-foreground">
				Use standard open protocols (Nextcloud, Baïkal, Radicale, Synology, Custom SMTP) instead of proprietary APIs.
			</p>
		</div>
	</div>

	{#if message.text}
		<div class="mb-4 rounded-lg p-3 text-sm font-medium {message.type === 'success' ? 'border border-success/30 bg-success-muted text-success' : message.type === 'error' ? 'border border-danger/30 bg-danger-muted text-danger' : 'border border-info/30 bg-info-muted text-info'}">
			{message.text}
		</div>
	{/if}

	<div class="space-y-6">
		<!-- CalDAV Calendar Integration -->
		<div class="rounded-lg bg-surface-2 p-4 space-y-4">
			<h4 class="flex items-center gap-2 font-medium text-foreground">
				📅 CalDAV Calendar Connector
			</h4>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label for="caldavUrl" class="mb-1 block text-sm font-medium text-foreground">Server URL</label>
					<input
						id="caldavUrl"
						type="url"
						placeholder="https://caldav.example.com/dav/calendars/user/"
						bind:value={caldavUrl}
						class="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground transition-colors placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
					/>
				</div>
				<div>
					<label for="caldavCalendarPath" class="mb-1 block text-sm font-medium text-foreground">Calendar Path (optional)</label>
					<input
						id="caldavCalendarPath"
						type="text"
						placeholder="personal"
						bind:value={caldavCalendarPath}
						class="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground transition-colors placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
					/>
				</div>
				<div>
					<label for="caldavUsername" class="mb-1 block text-sm font-medium text-foreground">Username</label>
					<input
						id="caldavUsername"
						type="text"
						placeholder="user@example.com"
						bind:value={caldavUsername}
						class="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground transition-colors placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
					/>
				</div>
				<div>
					<label for="caldavPassword" class="mb-1 block text-sm font-medium text-foreground">Password</label>
					<input
						id="caldavPassword"
						type="password"
						placeholder="••••••••"
						bind:value={caldavPassword}
						class="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground transition-colors placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
					/>
				</div>
			</div>
			<button
				type="button"
				onclick={testCaldav}
				disabled={testingCaldav || !caldavUrl || !caldavUsername || !caldavPassword}
				class="rounded-lg border border-primary px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary-muted disabled:opacity-50"
			>
				{testingCaldav ? 'Testing...' : 'Test CalDAV Connection'}
			</button>
		</div>

		<!-- CardDAV Contacts Integration -->
		<div class="rounded-lg bg-surface-2 p-4 space-y-4">
			<h4 class="flex items-center gap-2 font-medium text-foreground">
				📇 CardDAV Addressbook Connector
			</h4>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div>
					<label for="carddavUrl" class="mb-1 block text-sm font-medium text-foreground">Server URL</label>
					<input
						id="carddavUrl"
						type="url"
						placeholder="https://carddav.example.com/dav/addressbooks/user/"
						bind:value={carddavUrl}
						class="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground transition-colors placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
					/>
				</div>
				<div>
					<label for="carddavUsername" class="mb-1 block text-sm font-medium text-foreground">Username</label>
					<input
						id="carddavUsername"
						type="text"
						placeholder="user@example.com"
						bind:value={carddavUsername}
						class="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground transition-colors placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
					/>
				</div>
				<div>
					<label for="carddavPassword" class="mb-1 block text-sm font-medium text-foreground">Password</label>
					<input
						id="carddavPassword"
						type="password"
						placeholder="••••••••"
						bind:value={carddavPassword}
						class="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground transition-colors placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
					/>
				</div>
			</div>
			<button
				type="button"
				onclick={testCarddav}
				disabled={testingCarddav || !carddavUrl || !carddavUsername || !carddavPassword}
				class="rounded-lg border border-primary px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary-muted disabled:opacity-50"
			>
				{testingCarddav ? 'Testing...' : 'Test CardDAV Connection'}
			</button>
		</div>

		<!-- SMTP Email Integration -->
		<div class="rounded-lg bg-surface-2 p-4 space-y-4">
			<h4 class="flex items-center gap-2 font-medium text-foreground">
				✉️ Generic SMTP Email Server Connector
			</h4>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div>
					<label for="smtpHost" class="mb-1 block text-sm font-medium text-foreground">SMTP Host</label>
					<input
						id="smtpHost"
						type="text"
						placeholder="mail.domain.com"
						bind:value={smtpHost}
						class="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground transition-colors placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
					/>
				</div>
				<div>
					<label for="smtpPort" class="mb-1 block text-sm font-medium text-foreground">SMTP Port</label>
					<input
						id="smtpPort"
						type="number"
						placeholder="587"
						bind:value={smtpPort}
						class="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground transition-colors placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
					/>
				</div>
				<div>
					<label for="smtpFrom" class="mb-1 block text-sm font-medium text-foreground">From Email Address</label>
					<input
						id="smtpFrom"
						type="email"
						placeholder="notifications@domain.com"
						bind:value={smtpFrom}
						class="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground transition-colors placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
					/>
				</div>
				<div>
					<label for="smtpUsername" class="mb-1 block text-sm font-medium text-foreground">SMTP Username</label>
					<input
						id="smtpUsername"
						type="text"
						placeholder="user@domain.com"
						bind:value={smtpUsername}
						class="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground transition-colors placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
					/>
				</div>
				<div>
					<label for="smtpPassword" class="mb-1 block text-sm font-medium text-foreground">SMTP Password</label>
					<input
						id="smtpPassword"
						type="password"
						placeholder="••••••••"
						bind:value={smtpPassword}
						class="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground transition-colors placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
					/>
				</div>
				<div class="flex items-center pt-6">
					<label class="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							bind:checked={smtpSecure}
							class="h-4 w-4 rounded border-border-strong text-primary focus:ring-primary/20"
						/>
						<span class="text-sm text-muted-foreground">Direct SSL/TLS (Port 465)</span>
					</label>
				</div>
			</div>
			<button
				type="button"
				onclick={testSmtp}
				disabled={testingSmtp || !smtpHost || !smtpFrom}
				class="rounded-lg border border-primary px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary-muted disabled:opacity-50"
			>
				{testingSmtp ? 'Sending...' : 'Send Test Email via SMTP'}
			</button>
		</div>

		<div class="border-t border-border pt-4">
			<button
				type="button"
				onclick={saveSettings}
				disabled={saving}
				class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft transition-all hover:bg-primary-hover hover:shadow-glow disabled:opacity-50"
			>
				{saving ? 'Saving...' : 'Save Open Standard Settings'}
			</button>
		</div>
	</div>
</div>
