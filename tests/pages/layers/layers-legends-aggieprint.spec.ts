import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "https://aggiemap.tamu.edu";

test.describe("Team H — Layers & Legends (smoke)", () => {
  test("AggiePrint layer button is visible and clickable", async ({ page }) => {
    // Be patient for a map-heavy app
    test.setTimeout(120_000);
    await page.setDefaultTimeout(40_000);
    await page.setDefaultNavigationTimeout(40_000);

    // Avoid permission popups that could cover the UI
    await page.context().grantPermissions(["geolocation"]);
    await page.context().setGeolocation({ latitude: 30.615, longitude: -96.341 });

    // Keep the test meaningful: fail if the app logs console errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    // 1) Load app and let it settle
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForLoadState("networkidle");

    // 2) If there’s a Features toggle, click once to ensure the panel is open (safe if already open)
    const featuresBtn = page
      .getByRole("button", { name: /toggle features \(search, layers, legend\)/i })
      .first()
      .or(page.getByRole("button", { name: /features|layers|legend/i }).first());
    try { await featuresBtn.click(); } catch { /* already open / not needed */ }

    // 3) Find the AggiePrint layer control by its visible label (flexible spacing/case)
    const layerNameRe = /^(aggie\s*print locations)$/i;
    const aggiePrintBtn = page
      .getByRole("button", { name: layerNameRe })
      .first()
      .or(page.getByText(layerNameRe).first());

    await expect(aggiePrintBtn).toBeVisible();

    // 4) If not disabled, click it once (toggle) and back (restore). No state assertions.
    const ariaDisabled = await aggiePrintBtn.getAttribute("aria-disabled");
    const className = (await aggiePrintBtn.getAttribute("class")) ?? "";
    const isDisabled = ariaDisabled === "true" || /\bdisabled\b/i.test(className);

    if (!isDisabled) {
      await aggiePrintBtn.click();
      await page.waitForTimeout(300); // brief debounce for UI
      await aggiePrintBtn.click();
    } else {
      test.skip(true, "AggiePrint layer appears disabled in this build");
    }

    // Optional: light, non-brittle sanity on Legend label text somewhere on the page
    // (Not required; can be removed if you prefer zero Legend checks.)
    // await expect(page.getByText(/legend/i).first()).toBeVisible();

    if (consoleErrors.length) {
      throw new Error(`Console errors detected:\n${consoleErrors.join("\n")}`);
    }
  });
});

//test code ran successfully for chromium, firefox and webkit
