<script lang="ts">
	import type { PageData } from './$types';
	import { CalendarSettings } from '$lib/components/dashboard';

	let { data }: { data: PageData } = $props();
</script>

<div class="min-h-screen bg-background">
	<!-- Header -->
	<header class="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-xl">
		<div class="mx-auto flex h-16 w-full max-w-3xl items-center gap-4 px-4 sm:px-6">
			<a href="/dashboard" class="text-muted-foreground transition-colors hover:text-foreground" aria-label="Back to dashboard">
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
				</svg>
			</a>
			<div class="min-w-0">
				<h1 class="font-display truncate text-lg font-semibold text-foreground">Calendar Settings</h1>
				<p class="hidden truncate text-xs text-muted-foreground sm:block">Connect calendars and configure defaults</p>
			</div>
		</div>
	</header>

	<main class="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
		<CalendarSettings user={data.user} outlookConfigured={data.outlookConfigured} />
	</main>
</div>
