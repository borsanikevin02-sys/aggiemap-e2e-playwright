import { test, expect } from "@playwright/test";
const BASE_URL = process.env.BASE_URL || "https://aggiemap.tamu.edu";

test.describe("Team H — Layers & Legends (smoke)", () => {
  test("Construction Zone layer button is visible and clickable", async ({ page }) => {
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

    const layerNameRe = /^construction zone$/i;
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
      test.skip(true, "Construction Zone layer appears disabled in this build");
    }

    if (consoleErrors.length) throw new Error(`Console errors detected:\n${consoleErrors.join("\n")}`);
  });
});

//this is a copy of the aggieprint test with modifications for contsruction zone layer
//test code worked successfully in chromium, firefox and webkit browsers