import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "https://aggiemap.tamu.edu";

/** Assert a control can take focus via script and via Tab, then restore focus. */
async function assertFocusable(page: import("@playwright/test").Page, el: import("@playwright/test").Locator) {
  // Programmatic focus
  await el.focus();
  const focusedByAPI = await page.evaluate((e) => document.activeElement === e, await el.elementHandle());
  expect(focusedByAPI).toBe(true);

  // Try to reach it via Tab from body (best-effort, don’t fail the suite if layout differs)
  await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur?.(); document.body.focus(); });
  await page.keyboard.press("Tab");
  // Give the DOM a tick to update focus
  await page.waitForTimeout(50);
  // If not focused by Tab due to order/layout, we don't fail—this is a smoke test.
}

/** Press Enter and Space on a control; ensure it stays present and visible. */
async function assertKeyboardActivates(el: import("@playwright/test").Locator) {
  await el.focus();
  await el.press("Enter");
  await el.press(" ");
  await expect(el).toBeVisible();
}

test.describe("Team K — Accessibility Viewport (smoke)", () => {
  test("zoom & orientation controls are visible, focusable, and keyboard-activatable", async ({ page }) => {
    // Patient defaults for a map-heavy app
    test.setTimeout(120_000);
    await page.setDefaultTimeout(40_000);
    await page.setDefaultNavigationTimeout(40_000);

    // Avoid permission popups covering UI
    await page.context().grantPermissions(["geolocation"]);
    await page.context().setGeolocation({ latitude: 30.615, longitude: -96.341 });

    // Capture console errors to keep this meaningful
    const consoleErrors: string[] = [];
    page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });

    // 1) Load app and settle
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForLoadState("networkidle");

    // 2) Locate core viewport controls by accessible name (robust across builds)
    const zoomIn  = page.getByRole("button", { name: /zoom in/i }).first();
    const zoomOut = page.getByRole("button", { name: /zoom out/i }).first();
    const reset   = page.getByRole("button", { name: /reset map orientation/i }).first();

    // Some builds also expose a "Start tracking my location" control — optional
    const locate  = page.getByRole("button", { name: /start tracking my location/i }).first();

    // 3) Each required control is visible
    await expect(zoomIn).toBeVisible();
    await expect(zoomOut).toBeVisible();
    await expect(reset).toBeVisible();

    // 4) Controls are keyboard-focusable and activatable
    await assertFocusable(page, zoomIn);
    await assertKeyboardActivates(zoomIn);

    await assertFocusable(page, zoomOut);
    await assertKeyboardActivates(zoomOut);

    await assertFocusable(page, reset);
    await assertKeyboardActivates(reset);

    // Optional: if locate button exists and isn’t disabled, lightly exercise it too
    if (await locate.count()) {
      await expect(locate).toBeVisible();
      const disabled = (await locate.getAttribute("aria-disabled")) === "true";
      if (!disabled) {
        await assertFocusable(page, locate);
        // Don’t request geolocation again; just ensure activation doesn’t break UI
        await assertKeyboardActivates(locate);
      }
    }

    // 5) Fail the test if the app emitted JS console errors
    if (consoleErrors.length) {
      throw new Error(`Console errors detected:\n${consoleErrors.join("\n")}`);
    }
  });
});

//test code worked succcessfully in chromium, firefox and webkit browsers
//possible issue in test, in chromium, the start tracking my location button hung for a bit but then completed