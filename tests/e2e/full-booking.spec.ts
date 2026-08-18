import { test, expect, type Locator } from '@playwright/test';

test.describe('Full Booking Journey E2E', () => {
	test('visitor completes a booking from event page to confirmation', async ({ page }) => {
		// Ensure the demo host and its 30min event type exist
		await page.goto('/auth/login');
		await page.getByRole('button', { name: /Connexion Instantanée/i }).click();
		await page.waitForURL('**/dashboard');

		await page.goto('/30min');
		await expect(page.locator('h1').first()).toContainText('30 Min Meeting');

		// Step 1: select the event type to reveal the calendar
		await page.getByRole('button', { name: /30 Min Meeting/ }).click();

		// Step 2: pick the first day with available slots (search up to 3 months)
		const dayGrid = page.locator('.grid.grid-cols-7.gap-1\\.5');
		let dayButton = dayGrid.locator('button:not([disabled])').first();
		for (let month = 0; month < 3; month++) {
			await expect(dayButton).toBeVisible();
			const count = await dayGrid.locator('button:not([disabled])').count();
			if (count > 0) break;
			await page.getByRole('button', { name: 'Next month' }).click();
		}
		await dayButton.click();

		// Step 3 + booking form. Slots taken by earlier runs persist in the local
		// D1 database, so retry from the last slot backwards until one is free.
		const slots = page.getByRole('button', { name: /^\d{1,2}:\d{2}/ });
		await expect(slots.first()).toBeVisible({ timeout: 10000 });
		const slotCount = await slots.count();

		const successToast = page.getByText('Rendez-vous Confirmé');
		const conflictError = page.getByText(/créneau n'est plus disponible|no longer available/);

		let confirmed = false;
		for (let i = slotCount - 1; i >= 0; i--) {
			await slots.nth(i).click();
			await page.getByRole('button', { name: /Confirmer le créneau/ }).click();

			await page.locator('#booking-name').fill('E2E Visitor');
			await page.locator('#booking-email').fill('e2e-visitor@example.com');
			await page.locator('#booking-notes').fill('Playwright end-to-end booking');
			await page.getByRole('button', { name: /Valider le rendez-vous/ }).click();

			await Promise.race([
				successToast.waitFor({ state: 'visible', timeout: 15000 }),
				conflictError.waitFor({ state: 'visible', timeout: 15000 })
			]);

			if (await successToast.isVisible()) {
				confirmed = true;
				break;
			}

			// Slot taken — close the modal and try the previous one
			await page.getByRole('button', { name: 'Fermer', exact: true }).click();
		}

		expect(confirmed, 'at least one slot must be bookable').toBeTruthy();
		await expect(page.getByText('Une invitation vous a été adressée par e-mail')).toBeVisible();
	});
});
