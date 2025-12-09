import { test, expect } from "@playwright/test";

/**
 * Team D — Sidebar.Directions: invalid inputs
 *
 * Scenario:
 *  - Open the Directions panel
 *  - Leave one or both fields empty
 *  - Try to request a route
 *  - Expect: button disabled OR validation/help text appears (flexible checks)
 */
test.use({
  baseURL: process.env.BASE_URL || "https://aggiemap.tamu.edu",
  viewport: { width: 1440, height: 900 },
  headless: true,
  actionTimeout: 15_000,
  navigationTimeout: 20_000,
});

test.describe("Sidebar.Directions — invalid inputs", () => {
  test("cannot route with empty required fields", async ({ page }) => {
    await page.goto("/");

    // Open Directions
    const directionsButton =
      page.getByRole("button", { name: /directions/i }).first()
        .or(page.getByRole("tab", { name: /directions/i }).first());
    await directionsButton.click();

    const directionsPanel = page.getByRole("region", { name: /directions/i }).first()
      .or(page.getByRole("complementary", { name: /directions/i }).first())
      .or(page.getByTestId("sidebar-directions-panel").first());
    await expect(directionsPanel).toBeVisible();

    // Try to click "Get Directions" immediately (with empty fields)
    const getDirectionsBtn =
      directionsPanel.getByRole("button", { name: /get directions|route|go/i }).first();

    // Some UIs disable the button when inputs are empty:
    const isDisabled = await getDirectionsBtn.isDisabled().catch(() => false);

    if (!isDisabled) {
      // If not disabled, click and expect a validation cue (toast, helper text, etc.)
      await getDirectionsBtn.click();

      // Flexible checks for common validation text. Adjust if your app has specific copy.
      const validationMessage =
        directionsPanel.getByText(/required|enter|missing|please|select/i).first()
          .or(page.getByRole("alert").first())
          .or(page.getByRole("status").first());

      await expect(validationMessage).toBeVisible();
    } else {
      // Button is disabled -> good enough signal that invalid inputs are blocked.
      await expect(getDirectionsBtn).toBeDisabled();
    }
  });

  test("shows feedback for unresolvable locations", async ({ page }) => {
    await page.goto("/");

    // Open Directions
    const directionsButton =
      page.getByRole("button", { name: /directions/i }).first()
        .or(page.getByRole("tab", { name: /directions/i }).first());
    await directionsButton.click();

    const directionsPanel = page.getByRole("region", { name: /directions/i }).first()
      .or(page.getByRole("complementary", { name: /directions/i }).first())
      .or(page.getByTestId("sidebar-directions-panel").first());
    await expect(directionsPanel).toBeVisible();

    // Find origin/destination fields (flexible labels/placeholders)
    const originInput =
      page.getByLabel(/from|start/i).first()
        .or(page.getByPlaceholder(/from|start/i).first())
        .or(directionsPanel.getByRole("combobox").nth(0));
    const destInput =
      page.getByLabel(/to|end/i).first()
        .or(page.getByPlaceholder(/to|end/i).first())
        .or(directionsPanel.getByRole("combobox").nth(1));

    // Type nonsense so geocoder should fail or show "no results"
    await originInput.fill("zzzzzzzzzz not a place");
    await destInput.fill("yyyyyyyyyy nowhere");

    const getDirectionsBtn =
      directionsPanel.getByRole("button", { name: /get directions|route|go/i }).first();

    // If app requires you to choose an autocomplete option, it should prompt you.
    await getDirectionsBtn.click();

    // Look for “no results / not found / select suggestion / invalid” style feedback
    const feedback =
      directionsPanel.getByText(/no results|not found|select a suggestion|invalid/i).first()
        .or(page.getByRole("alert").first())
        .or(page.getByRole("status").first());

    await expect(feedback).toBeVisible();
  });
});

//this test is not finished and is very buggy