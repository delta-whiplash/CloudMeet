import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: 'http://localhost:8788',
		trace: 'on-first-retry',
		headless: true
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	],
	webServer: {
		command: 'pnpm run build && npx wrangler pages dev .svelte-kit/cloudflare --ip 0.0.0.0 --port 8788',
		url: 'http://localhost:8788/api/health',
		reuseExistingServer: true,
		timeout: 60000
	}
});
