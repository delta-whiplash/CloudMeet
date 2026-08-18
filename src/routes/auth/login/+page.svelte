<script lang="ts">
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Connexion | CloudMeet</title>
	<meta name="description" content="Accédez à votre tableau de bord CloudMeet pour gérer vos rendez-vous." />
</svelte:head>

<div class="flex min-h-[70vh] flex-col justify-center bg-background py-12 sm:px-6 lg:px-8">
	<div class="sm:mx-auto sm:w-full sm:max-w-md">
		<div class="flex justify-center">
			<a href="/" class="flex items-center gap-2 text-2xl font-bold text-foreground transition-opacity hover:opacity-90">
				<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
						></path>
					</svg>
				</div>
				<span>CloudMeet</span>
			</a>
		</div>
		<h2 class="font-display mt-6 text-center text-3xl font-semibold tracking-tight text-foreground">
			Connexion à votre espace
		</h2>
		<p class="mt-2 text-center text-sm text-muted-foreground">
			Planificateur de rendez-vous Open Source sur Cloudflare
		</p>
	</div>

	<div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
		<div class="standard-card rounded-2xl px-4 py-8 sm:px-10">
			{#if form?.missingConfig || form?.error}
				<div class="mb-6 rounded-xl border border-warning/30 bg-warning-muted p-4 text-sm text-warning">
					<div class="flex items-start gap-3">
						<svg class="mt-0.5 h-5 w-5 shrink-0 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
						</svg>
						<div>
							<p class="mb-1 font-semibold">Configuration manquante</p>
							<p class="text-warning/80">{form?.message || 'Identifiants OAuth non configurés.'}</p>
						</div>
					</div>
				</div>
			{/if}

			{#if data.hasOauthConfig}
				<form action="?/google" method="POST">
					<button
						type="submit"
						class="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground shadow-soft transition-colors hover:bg-surface-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
					>
						<svg class="h-5 w-5" viewBox="0 0 24 24">
							<path
								fill="#4285F4"
								d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
							/>
							<path
								fill="#34A853"
								d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
							/>
							<path
								fill="#FBBC05"
								d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
							/>
							<path
								fill="#EA4335"
								d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
							/>
						</svg>
						Continuer avec Google
					</button>
				</form>
			{:else}
				<div class="mb-6 rounded-xl border border-info/30 bg-info-muted p-4 text-sm text-info">
					<div class="flex items-start gap-3">
						<svg class="mt-0.5 h-5 w-5 shrink-0 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
						</svg>
						<div>
							<p class="mb-1 font-semibold">OAuth non configuré</p>
							<p class="text-info/80 text-xs leading-relaxed">
								Les variables <code class="rounded bg-info/15 px-1 py-0.5 font-mono">GOOGLE_CLIENT_ID</code> et <code class="rounded bg-info/15 px-1 py-0.5 font-mono">APP_URL</code> ne sont pas définies. Configurez OAuth pour activer la connexion Google.
							</p>
						</div>
					</div>
				</div>
			{/if}

			{#if data.demoEnabled}
				<div class="mt-6">
					<div class="relative">
						<div class="absolute inset-0 flex items-center">
							<div class="w-full border-t border-border"></div>
						</div>
						<div class="relative flex justify-center text-xs uppercase">
							<span class="bg-surface px-2 font-medium text-subtle">Mode Démo</span>
						</div>
					</div>

					<form action="?/devLogin" method="POST" class="mt-6">
						<button
							type="submit"
							class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:bg-primary-hover hover:shadow-glow focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
							</svg>
							Connexion Instantanée (Mode Démo / Dev)
						</button>
					</form>
				</div>
			{/if}

			<div class="mt-8 text-center">
				<a href="/" class="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
					← Retour à l'accueil
				</a>
			</div>
		</div>
	</div>
</div>
