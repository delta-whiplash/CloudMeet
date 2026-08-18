<script lang="ts">
	interface Props {
		bookingForm: {
			name: string;
			email: string;
			notes: string;
		};
		bookingStatus: 'idle' | 'submitting' | 'success' | 'error';
		bookingError: string;
		slotRecapText?: string;
		brandColor?: string;
		brandDark?: string;
		onSubmit: (e: Event) => void;
		lang?: 'fr' | 'en';
	}

	let {
		bookingForm = $bindable(),
		bookingStatus,
		bookingError,
		slotRecapText = '',
		brandColor = '#7a5828',
		brandDark,
		onSubmit,
		lang = 'fr'
	}: Props = $props();

	const fr = $derived(lang === 'fr');
</script>

<div class="w-full">
	<div class="mb-5">
		<span
			class="mb-1 block text-xs font-bold uppercase tracking-wider"
			style="color: var(--brand-color, var(--primary))"
		>
			{fr ? 'Confirmation' : 'Confirmation'}
		</span>
		<h3 class="font-display text-lg font-semibold text-foreground">
			{fr ? 'Vos coordonnées' : 'Contact Information'}
		</h3>
		{#if slotRecapText}
			<p class="mt-1 text-xs text-muted-foreground">{slotRecapText}</p>
		{/if}
	</div>

	{#if bookingError}
		<div class="mb-4 rounded-lg border border-danger/30 bg-danger-muted p-3 text-xs font-medium text-danger">
			{bookingError}
		</div>
	{/if}

	<form onsubmit={onSubmit} class="space-y-4">
		<div>
			<label for="booking-name" class="mb-1 block text-xs font-semibold text-foreground">
				{fr ? 'Nom complet *' : 'Full Name *'}
			</label>
			<input
				type="text"
				id="booking-name"
				bind:value={bookingForm.name}
				required
				placeholder={fr ? 'ex: Sarah Miller' : 'e.g. Sarah Miller'}
				class="w-full rounded-lg border border-border-strong bg-surface px-3.5 py-2.5 text-xs text-foreground transition-colors placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
			/>
		</div>

		<div>
			<label for="booking-email" class="mb-1 block text-xs font-semibold text-foreground">
				{fr ? 'Adresse e-mail professionnelle *' : 'Business Email *'}
			</label>
			<input
				type="email"
				id="booking-email"
				bind:value={bookingForm.email}
				required
				placeholder="sarah.miller@entreprise.com"
				class="w-full rounded-lg border border-border-strong bg-surface px-3.5 py-2.5 text-xs text-foreground transition-colors placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
			/>
		</div>

		<div>
			<label for="booking-notes" class="mb-1 block text-xs font-semibold text-foreground">
				{fr ? "Sujet de l'entretien (Optionnel)" : 'Meeting Agenda (Optional)'}
			</label>
			<textarea
				id="booking-notes"
				bind:value={bookingForm.notes}
				rows="3"
				placeholder={fr ? 'Précisez vos objectifs...' : 'Specify your goals...'}
				class="w-full resize-none rounded-lg border border-border-strong bg-surface px-3.5 py-2.5 text-xs text-foreground transition-colors placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
			></textarea>
		</div>

		<button
			type="submit"
			disabled={bookingStatus === 'submitting'}
			class="mt-2 w-full rounded-xl px-4 py-3 text-xs font-bold text-primary-foreground shadow-soft transition-all hover:opacity-90 hover:shadow-glow disabled:opacity-50"
			style="background: var(--brand-color, var(--primary));"
		>
			{bookingStatus === 'submitting'
				? fr
					? 'Réservation en cours...'
					: 'Confirming...'
				: fr
					? 'Valider le rendez-vous'
					: 'Confirm Appointment'}
		</button>
	</form>
</div>
