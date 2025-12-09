import { test, expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

/** Return the first locator that actually exists (count > 0). */
async function firstThatExists(candidates: Locator[]): Promise<Locator> {
  for (const c of candidates) {
    if (await c.count()) return c.first();
  }
  return candidates[0].first();
}

/** Return the first locator that becomes visible (skips hidden nodes). */
async function firstVisible(candidates: Locator[], timeout = 15_000): Promise<Locator> {
  for (const c of candidates) {
    const loc = c.first();
    if (await loc.count()) {
      try {
        await loc.waitFor({ state: "visible", timeout });
        return loc;
      } catch {
        // exists but stayed hidden — try next candidate
      }
    }
  }
  throw new Error("No visible candidate found for provided locators.");
}

/** Wait for a visible suggestion, click it; otherwise fall back to ArrowDown+Enter. */
async function pickFirstSuggestion(page: Page) {
  const option = page.getByRole("option").first();
  try {
    await option.waitFor({ state: "visible", timeout: 15_000 });
    await option.click();
  } catch {
    // dropdown might be finicky across browsers; keyboard works reliably
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
  }
}

// Use absolute URL instead of test.use({ baseURL: ... })
const BASE_URL = process.env.BASE_URL || "https://aggiemap.tamu.edu";

test.describe("Sidebar.Directions — happy path (autocomplete)", () => {
  test("creates a route and shows steps", async ({ page }) => {
    // Make the test patient for a heavy map app
    test.setTimeout(150_000);                 // total test budget
    await page.setDefaultTimeout(40_000);     // default per action/locator
    await page.setDefaultNavigationTimeout(40_000);

    // ✅ Prevent permission popups (grant geolocation and set a TAMU-ish location)
    await page.context().grantPermissions(["geolocation"]);
    await page.context().setGeolocation({ latitude: 30.615, longitude: -96.341 });

    // Capture console errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    // 1) Open site & settle
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForLoadState("networkidle");

    // Sanity: some control visible (menu/layers or zoom)
    const someControl = await firstThatExists([
      page.getByRole("button", { name: /layers|menu|legend|search/i }),
      page.getByRole("button", { name: /zoom in/i }),
    ]);
    await expect(someControl).toBeVisible();

    // 2) Open Directions
    const directionsToggle = await firstThatExists([
      page.getByRole("button", { name: /toggle directions controls \(routing and way-finding\)/i }),
      page.getByRole("button", { name: /directions/i }),
    ]);
    try { await directionsToggle.click(); } catch { /* already active is fine */ }

    // 3) Two inputs: "Choose point or click on the map"
    const inputs = page.getByRole("textbox", { name: /choose point or click on the map/i });
    await expect(inputs.nth(0)).toBeVisible();
    await expect(inputs.nth(1)).toBeVisible();

    const originInput = inputs.nth(0);
    const destInput   = inputs.nth(1);

    // 4) Origin
    await originInput.click();
    await originInput.fill("Evans Library");
    await pickFirstSuggestion(page);

    // 5) Destination
    await destInput.click();
    await destInput.fill("Kyle Field");
    await pickFirstSuggestion(page);

    // Nudge enter just in case the UI requires confirm on destination
    await page.keyboard.press("Enter");

    // 6) Expect a summary & a visible step item (skip hidden listboxes)
    const summary = page.getByText(/\b(min|minutes|mi|miles|km)\b/i).first();
    await expect(summary).toBeVisible();

    const firstStep = await firstVisible([
      page.getByRole("listitem").first(),
      page.locator("li").first(),
      // Loose text fallback if steps aren't marked up as list items
      page.getByText(/\b(turn|head|continue|walk|drive|bike|bus)\b/i).first(),
    ]);
    await expect(firstStep).toBeVisible();

    // 7) URL sanity (non-strict)
    await expect(page).toHaveURL(/directions|route|from=|to=/i);

    if (consoleErrors.length) {
      throw new Error(`Console errors detected:\n${consoleErrors.join("\n")}`);
    }
  });
});
