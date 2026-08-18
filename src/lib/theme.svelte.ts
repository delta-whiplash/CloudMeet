import { browser } from '$app/environment';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'cloudmeet-theme';

function resolveInitial(): ThemeMode {
	if (!browser) return 'light';
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === 'light' || stored === 'dark') return stored;
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Theme controller (Svelte 5 runes).
 * The `.dark` class is applied on <html> — both here (post-hydration) and by
 * the inline anti-FOUC script in app.html (pre-paint) so they never disagree.
 */
class ThemeController {
	mode = $state<ThemeMode>('light');

	constructor() {
		if (browser) {
			this.mode = resolveInitial();
			this.#apply();
			// Follow OS changes when the user hasn't made an explicit choice.
			window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
				if (!localStorage.getItem(STORAGE_KEY)) {
					this.mode = e.matches ? 'dark' : 'light';
					this.#apply();
				}
			});
		}
	}

	get isDark() {
		return this.mode === 'dark';
	}

	#apply() {
		if (!browser) return;
		document.documentElement.classList.toggle('dark', this.mode === 'dark');
	}

	#persist(mode: ThemeMode) {
		if (!browser) return;
		localStorage.setItem(STORAGE_KEY, mode);
	}

	toggle() {
		this.mode = this.mode === 'dark' ? 'light' : 'dark';
		this.#persist(this.mode);
		this.#apply();
	}

	set(mode: ThemeMode) {
		this.mode = mode;
		this.#persist(mode);
		this.#apply();
	}
}

export const theme = new ThemeController();
