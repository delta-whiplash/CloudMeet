<script lang="ts">
	interface Props {
		size?: number;
		showWordmark?: boolean;
		class?: string;
	}

	let { size = 32, showWordmark = true, class: className = '' }: Props = $props();
</script>

<div class="flex items-center gap-2.5 {className}">
	<svg
		width={size}
		height={size}
		viewBox="0 0 32 32"
		fill="none"
		class="shrink-0"
		aria-hidden="true"
	>
		<defs>
			<linearGradient id="cm-logo-grad" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0" stop-color="#e2c182" />
				<stop offset="0.55" stop-color="#c89d4e" />
				<stop offset="1" stop-color="#7a5828" />
			</linearGradient>
		</defs>
		<rect width="32" height="32" rx="9" fill="url(#cm-logo-grad)" />
		<!-- clock ring -->
		<circle cx="16" cy="16" r="8" stroke="white" stroke-width="1.8" stroke-opacity="0.55" />
		<!-- hands -->
		<path
			d="M16 16 L16 10 M16 16 L20.5 18"
			stroke="white"
			stroke-width="1.9"
			stroke-linecap="round"
		/>
		<!-- selected slot pip -->
		<circle cx="23.2" cy="8.8" r="2.4" fill="white" />
	</svg>
	{#if showWordmark}
		<span class="font-display text-[1.15rem] font-semibold tracking-tight text-foreground">
			CloudMeet
		</span>
	{/if}
</div>
