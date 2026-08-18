<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	let { children } = $props();

	// The dashboard renders its own navigation chrome and its own theme toggle.
	const hasOwnChrome = $derived(page.url.pathname.startsWith('/dashboard'));
</script>

<div class="flex min-h-screen flex-col bg-background text-foreground">
	<main class="flex-1">
		{@render children()}
	</main>
</div>

{#if !hasOwnChrome}
	<!-- Minimal floating theme toggle (no full top/bottom bar) -->
	<div class="fixed bottom-4 right-4 z-40">
		<ThemeToggle />
	</div>
{/if}
