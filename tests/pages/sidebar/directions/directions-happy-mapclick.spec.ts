/**
 * Team D — Sidebar.Directions: invalid inputs
 *
 * Scenario:
 *  - Open the Directions panel
 *  - Leave one or both fields empty
 *  - Try to request a route
 *  - Expect: button disabled OR validation/help text appears (flexible checks)
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "https://aggiemap.tamu.edu";

test.describe("Sidebar.Directions — happy path (map-click)", () => {
  test("creates a route and shows steps (map-click version)", async ({ page }) => {
    // Make this map-heavy app patient
    test.setTimeout(150_000);
    await page.setDefaultTimeout(40_000);
    await page.setDefaultNavigationTimeout(40_000);

    // Avoid permission popups
    await page.context().grantPermissions(["geolocation"]);
    await page.context().setGeolocation({ latitude: 30.615, longitude: -96.341 });

    // Fail fast on console errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });

    // Go to site and settle
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForLoadState("networkidle");

    // Open Directions controls (text may vary; try the explicit label first)
    const directionsBtn = page.getByRole("button", { name: /toggle directions controls \(routing and way-finding\)|directions/i }).first();
    try { await directionsBtn.click(); } catch { /* already active */ }

    // Get the two inputs: "Choose point or click on the map"
    const inputs = page.getByRole("textbox", { name: /choose point or click on the map/i });
    await expect(inputs.nth(0)).toBeVisible();
    await expect(inputs.nth(1)).toBeVisible();

    // Find the map (works for most builds: OL/Canvas/div)
    const map = page.locator('#map, [data-testid="map"], .ol-viewport, canvas').first();
    await expect(map).toBeVisible();

    // Helper to click a relative position on the map
    async function clickMap(px: number, py: number) {
      const box = await map.boundingBox();
      if (!box) throw new Error("Map bounding box not found");
      await map.click({
        position: { x: Math.floor(box.width * px), y: Math.floor(box.height * py) }
      });
    }

    // Set origin by focusing first input, then clicking map
    await inputs.nth(0).click();
    await clickMap(0.35, 0.40);

    // Set destination by focusing second input, then clicking map
    await inputs.nth(1).click();
    await clickMap(0.65, 0.60);

    // Some builds need an Enter to confirm
    await page.keyboard.press("Enter");

    // Wait for clear success evidence: summary (min/mi/km) OR any step-like list item
    await page.waitForFunction(() => {
      const txt = document.body.innerText.toLowerCase();
      const hasSummary = /\b(min|minutes|mi|miles|km)\b/.test(txt);
      const hasStep = !!document.querySelector('li, [role="listitem"]');
      return hasSummary || hasStep;
    }, { timeout: 30_000 });

    // Light assertions
    await expect(page.getByText(/\b(min|minutes|mi|miles|km)\b/i).first()).toBeVisible({ timeout: 10_000 });

    // URL shows a directions/route state (loose)
    await expect(page).toHaveURL(/directions|route|from=|to=/i);

    if (consoleErrors.length) {
      throw new Error(`Console errors detected:\n${consoleErrors.join("\n")}`);
    }
  });
});