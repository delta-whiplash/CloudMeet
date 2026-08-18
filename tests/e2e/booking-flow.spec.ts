import { test, expect } from '@playwright/test';

test.describe('Public Booking Page E2E Non-Regression', () => {
	test('Landing/Profile page loads successfully with 200 OK', async ({ page }) => {
		const response = await page.goto('/');
		expect(response?.status()).toBe(200);

		// Single-user app shows user name if user exists, or Meeting Scheduler landing page
		const pageTitle = await page.locator('h1').first().textContent();
		expect(pageTitle).toBeTruthy();
	});

	test('Public booking page for 30min event type loads', async ({ page }) => {
		// Log in first to create default 30min event type
		await page.goto('/auth/login');
		await page.getByRole('button', { name: /Connexion Instantanée/i }).click();
		await page.waitForURL('**/dashboard');

		// Visit public /30min booking page
		const response = await page.goto('/30min');
		expect(response?.status()).toBe(200);

		await expect(page.locator('h1').first()).toContainText('30 Min Meeting');
		await expect(page.locator('body')).toContainText('Admin Demo');
	});
});
