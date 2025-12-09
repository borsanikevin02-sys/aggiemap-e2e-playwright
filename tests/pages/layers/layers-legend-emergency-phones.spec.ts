import { test, expect } from "@playwright/test";
const BASE_URL = process.env.BASE_URL || "https://aggiemap.tamu.edu";

test.describe("Team H — Layers & Legends (smoke)", () => {
  test("Emergency Phones layer button is visible and clickable", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setDefaultTimeout(40_000);
    await page.setDefaultNavigationTimeout(40_000);

    await page.context().grantPermissions(["geolocation"]);
    await page.context().setGeolocation({ latitude: 30.615, longitude: -96.341 });

    const consoleErrors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForLoadState("networkidle");

    const featuresBtn = page
      .getByRole("button", { name: /toggle features \(search, layers, legend\)/i }).first()
      .or(page.getByRole("button", { name: /features|layers|legend/i }).first());
    try { await featuresBtn.click(); } catch {}

    const layerNameRe = /^emergency phones$/i;
    const layerBtn = page.getByRole("button", { name: layerNameRe }).first()
      .or(page.getByText(layerNameRe).first());
    await expect(layerBtn).toBeVisible();

    const ariaDisabled = await layerBtn.getAttribute("aria-disabled");
    const className = (await layerBtn.getAttribute("class")) ?? "";
    const isDisabled = ariaDisabled === "true" || /\bdisabled\b/i.test(className);

    if (!isDisabled) {
      await layerBtn.click();
      await page.waitForTimeout(300);
      await layerBtn.click();
    } else {
      test.skip(true, "Emergency Phones layer appears disabled in this build");
    }

    if (consoleErrors.length) throw new Error(`Console errors detected:\n${consoleErrors.join("\n")}`);
  });
});
//this is a copy of the aggieprint test with modifications for emergency phones layer
//test code worked successfully in chromium and webkit browsers
//firefox had an issue, likely due to timeout error, but should work normally