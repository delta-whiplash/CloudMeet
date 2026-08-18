import { test, expect } from '@playwright/test';

test.describe('Dashboard Navigation E2E Non-Regression', () => {
	test.beforeEach(async ({ page }) => {
		// Log in via dev login before each test
		await page.goto('/auth/login');
		await page.getByRole('button', { name: /Connexion Instantanée/i }).click();
		await page.waitForURL('**/dashboard');
	});

	test('Can navigate to Calendars page', async ({ page }) => {
		await page.getByRole('link', { name: 'Calendars' }).click();
		await page.waitForURL('**/dashboard/calendars');
		await expect(page.locator('h1')).toContainText('Calendar Settings');
	});

	test('Can navigate to Emails page', async ({ page }) => {
		await page.getByRole('link', { name: 'Emails' }).click();
		await page.waitForURL('**/dashboard/emails');
		await expect(page.locator('h1')).toContainText('Email Settings');
	});

	test('Can navigate to Availability page', async ({ page }) => {
		await page.getByRole('link', { name: 'Availability', exact: true }).click();
		await page.waitForURL('**/dashboard/availability');
		await expect(page.locator('h1')).toContainText('Set Availability');
	});
});
