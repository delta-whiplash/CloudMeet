<script lang="ts">
	interface EventType {
		id: string;
		name: string;
		slug: string;
		duration: number;
		description?: string | null;
		is_active: boolean | number;
	}

	interface Props {
		eventTypes: EventType[];
	}

	let { eventTypes }: Props = $props();
</script>

<div>
	<div class="mb-4 flex items-center justify-between">
		<h2 class="font-display text-xl font-semibold text-foreground">Event types</h2>
		<a
			href="/dashboard/event-types/new"
			class="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:bg-primary-hover hover:shadow-glow"
		>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 5v14M5 12h14" /></svg>
			New
		</a>
	</div>

	<div class="space-y-3">
		{#if eventTypes && eventTypes.length > 0}
			{#each eventTypes as eventType (eventType.id)}
				<div class="rounded-xl border border-border bg-surface p-4 shadow-soft transition-shadow hover:shadow-card">
					<div class="mb-2 flex items-start justify-between gap-2">
						<div class="min-w-0">
							<h3 class="truncate font-semibold text-foreground">{eventType.name}</h3>
							<p class="text-sm text-muted-foreground">{eventType.duration} minutes</p>
						</div>
						<span
							class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium {eventType.is_active
								? 'bg-success-muted text-success'
								: 'bg-surface-2 text-muted-foreground'}"
						>
							{eventType.is_active ? 'Active' : 'Inactive'}
						</span>
					</div>
					{#if eventType.description}
						<p class="mb-3 line-clamp-2 text-sm text-muted-foreground">{eventType.description}</p>
					{/if}
					<div class="flex items-center gap-3 text-sm">
						<a href="/{eventType.slug}" target="_blank" rel="noopener" class="font-medium text-primary transition-opacity hover:opacity-80">
							View page
						</a>
						<span class="text-subtle">·</span>
						<a href="/dashboard/event-types/{eventType.id}" class="font-medium text-primary transition-opacity hover:opacity-80">
							Edit
						</a>
					</div>
				</div>
			{/each}
		{:else}
			<div class="rounded-xl border border-dashed border-border bg-surface p-8 text-center">
				<p class="mb-4 text-muted-foreground">No event types yet</p>
				<a
					href="/dashboard/event-types/new"
					class="inline-block rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground shadow-soft transition-all hover:bg-primary-hover"
				>
					Create your first event type
				</a>
			</div>
		{/if}
	</div>
</div>
