import { test, expect } from '@playwright/test';

test.describe('Authentication & Dev Mode Login Non-Regression', () => {
	test('GET /auth/login renders login page without 500 error', async ({ page }) => {
		const response = await page.goto('/auth/login');
		expect(response?.status()).toBe(200);
		await expect(page.locator('h2')).toContainText('Connexion à votre espace');
	});

	test('Dev Mode 1-click login creates session and redirects to Dashboard', async ({ page }) => {
		await page.goto('/auth/login');

		// Click instant dev login button
		await page.getByRole('button', { name: /Connexion Instantanée/i }).click();

		// Should redirect to /dashboard
		await page.waitForURL('**/dashboard');
		expect(page.url()).toContain('/dashboard');

		// Dashboard should render profile (view mode shows the welcome line)
		await expect(page.locator('h1')).toContainText('Dashboard');
		await expect(page.getByText('Welcome back, Admin Demo!')).toBeVisible();
	});

	test('Unauthenticated access to /dashboard redirects to /auth/login', async ({ page }) => {
		await page.goto('/dashboard');

		// Should automatically redirect to /auth/login
		await page.waitForURL('**/auth/login');
		expect(page.url()).toContain('/auth/login');
	});
});
