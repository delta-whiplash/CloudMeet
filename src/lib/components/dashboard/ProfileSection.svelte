<script lang="ts">
	interface Props {
		user: {
			name?: string;
			email?: string;
			profile_image?: string | null;
			brand_color?: string | null;
			contact_email?: string | null;
			settings?: string | null;
		} | null;
		onProfileSaved?: () => void;
	}

	let { user, onProfileSaved }: Props = $props();

	// Parse user settings
	function getUserSettings() {
		try {
			return user?.settings ? JSON.parse(user.settings) : {};
		} catch {
			return {};
		}
	}

	// Profile edit state
	let showProfileEdit = $state(false);
	let profileName = $state(user?.name || '');
	let profileImage = $state(user?.profile_image || '');
	let brandColor = $state(user?.brand_color || '#7a5828');
	let contactEmail = $state(user?.contact_email || '');
	let timeFormat = $state<'12h' | '24h'>(getUserSettings().timeFormat || '12h');
	let savingProfile = $state(false);
	let uploadingImage = $state(false);
	let profileError = $state('');
	let profileSuccess = $state('');

	// Preset brand colors
	const presetColors = [
		'#7a5828', // Bronze
		'#a9761a', // Antique gold
		'#b8893f', // Champagne
		'#0d9488', // Teal
		'#3d7a5a', // Emerald
		'#356990', // Slate blue
		'#6e2433', // Bordeaux
		'#8b5cf6', // Purple
		'#ec4899', // Pink
		'#ef4444', // Red
		'#111827', // Ink
		'#6b7280' // Gray
	];

	async function handleImageUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		uploadingImage = true;
		profileError = '';

		try {
			const formData = new FormData();
			formData.append('image', file);

			const response = await fetch('/api/profile', {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				const errData = await response.json() as { message?: string };
				throw new Error(errData.message || 'Failed to upload image');
			}

			const result = await response.json() as { imageUrl?: string };
			profileImage = result.imageUrl || '';
			profileSuccess = 'Image uploaded successfully';
			setTimeout(() => (profileSuccess = ''), 3000);
		} catch (err: any) {
			profileError = err.message || 'Failed to upload image';
		} finally {
			uploadingImage = false;
		}
	}

	async function saveProfile() {
		savingProfile = true;
		profileError = '';
		profileSuccess = '';

		try {
			const response = await fetch('/api/profile', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: profileName,
					profileImage,
					brandColor,
					contactEmail,
					timeFormat
				})
			});

			if (!response.ok) {
				const errData = await response.json() as { message?: string };
				throw new Error(errData.message || 'Failed to save profile');
			}

			profileSuccess = 'Profile saved successfully';
			showProfileEdit = false;
			onProfileSaved?.();
		} catch (err: any) {
			profileError = err.message || 'Failed to save profile';
		} finally {
			savingProfile = false;
		}
	}
</script>

<div class="mb-8 rounded-2xl border border-border bg-surface p-6 shadow-soft">
	<div class="mb-4 flex items-center justify-between">
		<h2 class="font-display text-lg font-semibold text-foreground">Your profile</h2>
		<button
			onclick={() => (showProfileEdit = !showProfileEdit)}
			class="text-sm font-medium text-primary transition-opacity hover:opacity-80"
		>
			{showProfileEdit ? 'Cancel' : 'Edit profile'}
		</button>
	</div>

	{#if showProfileEdit}
		<div class="space-y-4">
			{#if profileError}
				<div class="rounded-lg border border-danger/30 bg-danger-muted p-3 text-sm font-medium text-danger">
					{profileError}
				</div>
			{/if}
			{#if profileSuccess}
				<div class="rounded-lg border border-success/30 bg-success-muted p-3 text-sm font-medium text-success">
					{profileSuccess}
				</div>
			{/if}

			<div class="flex items-start gap-6">
				<!-- Avatar -->
				<div class="shrink-0">
					<div class="relative">
						{#if profileImage}
							<img src={profileImage} alt="Profile" class="h-24 w-24 rounded-full object-cover" />
						{:else}
							<div
								class="flex h-24 w-24 items-center justify-center text-3xl font-semibold text-primary-foreground"
								style="background-color: {brandColor}"
							>
								{profileName?.charAt(0) || 'U'}
							</div>
						{/if}
						<label
							class="absolute bottom-0 right-0 cursor-pointer rounded-full border border-border bg-surface p-2 shadow-card transition-colors hover:bg-surface-2"
						>
							<input type="file" accept="image/*" onchange={handleImageUpload} class="hidden" disabled={uploadingImage} />
							{#if uploadingImage}
								<div class="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
							{:else}
								<svg class="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
								</svg>
							{/if}
						</label>
					</div>
					<p class="mt-2 text-center text-xs text-subtle">Max 2MB</p>
				</div>

				<div class="flex-1 space-y-4">
					<div>
						<label for="profile-name" class="mb-2 block text-sm font-medium text-foreground">
							Display name
						</label>
						<input
							type="text"
							id="profile-name"
							bind:value={profileName}
							class="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-foreground transition-colors placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
							placeholder="Your name"
						/>
						<p class="mt-1 text-xs text-subtle">Shown on your booking page</p>
					</div>

					<div>
						<label for="contact-email" class="mb-2 block text-sm font-medium text-foreground">
							Contact email
						</label>
						<input
							type="email"
							id="contact-email"
							bind:value={contactEmail}
							class="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-foreground transition-colors placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
							placeholder="your@business-email.com"
						/>
						<p class="mt-1 text-xs text-subtle">
							Business email used in booking emails. Leave empty to use {user?.email}
						</p>
					</div>
				</div>
			</div>

			<!-- Brand color -->
			<div class="mt-6">
				<label class="mb-3 block text-sm font-medium text-foreground">Brand color</label>
				<div class="flex flex-wrap items-center gap-4">
					<div class="flex flex-wrap gap-2">
						{#each presetColors as color (color)}
							<button
								type="button"
								onclick={() => (brandColor = color)}
								class="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 {brandColor === color
									? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-surface'
									: 'border-border'}"
								style="background-color: {color}"
								title={color}
								aria-label="Brand color {color}"
							></button>
						{/each}
					</div>
					<div class="flex items-center gap-2">
						<label class="relative cursor-pointer">
							<input type="color" bind:value={brandColor} class="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
							<div
								class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-border-strong transition-colors hover:border-primary"
								style="background-color: {brandColor}"
							>
								<svg class="h-4 w-4 text-white drop-shadow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
								</svg>
							</div>
						</label>
						<span class="font-mono text-sm text-subtle">{brandColor}</span>
					</div>
				</div>
				<p class="mt-2 text-xs text-subtle">Used on your booking page for buttons and accents</p>
			</div>

			<!-- Time format -->
			<div class="mt-6">
				<label class="mb-3 block text-sm font-medium text-foreground">Time format</label>
				<div class="flex gap-3">
					<button
						type="button"
						onclick={() => (timeFormat = '12h')}
						class="rounded-lg border-2 px-4 py-2 text-sm font-medium transition {timeFormat === '12h'
							? 'border-primary bg-primary-muted text-primary'
							: 'border-border text-muted-foreground hover:border-border-strong'}"
					>
						12-hour (AM/PM)
					</button>
					<button
						type="button"
						onclick={() => (timeFormat = '24h')}
						class="rounded-lg border-2 px-4 py-2 text-sm font-medium transition {timeFormat === '24h'
							? 'border-primary bg-primary-muted text-primary'
							: 'border-border text-muted-foreground hover:border-border-strong'}"
					>
						24-hour
					</button>
				</div>
			</div>

			<div class="mt-6 flex justify-end">
				<button
					onclick={saveProfile}
					disabled={savingProfile}
					class="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground shadow-soft transition-all hover:bg-primary-hover hover:shadow-glow disabled:opacity-50"
				>
					{savingProfile ? 'Saving...' : 'Save profile'}
				</button>
			</div>
		</div>
	{:else}
		<!-- View mode -->
		<div class="flex items-center gap-4">
			{#if user?.profile_image}
				<img src={user.profile_image} alt="Profile" class="h-16 w-16 rounded-full object-cover" />
			{:else}
				<div
					class="flex h-16 w-16 items-center justify-center text-2xl font-semibold text-primary-foreground"
					style="background-color: {user?.brand_color || '#7a5828'}"
				>
					{user?.name?.charAt(0) || 'U'}
				</div>
			{/if}
			<div>
				<p class="font-semibold text-foreground">{user?.name}</p>
				<p class="text-sm text-muted-foreground">{user?.email}</p>
			</div>
		</div>
	{/if}
</div>
