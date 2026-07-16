const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("renders the game, original credit, and generated version", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Mäkihyppy — browser port" })).toBeVisible();
  await expect(page.getByText("Original game by Anssi Pulkkinen, published in Mikrobitti 1/1985.")).toBeVisible();
  await expect(page.locator("#game")).toHaveAttribute("width", "768");
  await expect(page.locator("#game")).toHaveAttribute("height", "576");
  await expect(page.locator("#version")).toHaveText(/^v[0-9a-f]{12} built \d{8}-\d{6} UTC$/);
});

test("starts the practice approach with Space", async ({ page }) => {
  await page.keyboard.press("Space");
  await expect(page.locator("#status")).toHaveText(/Approach run/);
  await expect(page.locator("#hint")).toHaveText(/takeoff window/);
});

test("uses Finnish when the browser prefers Finnish", async ({ browser }) => {
  const context = await browser.newContext({ locale: "fi-FI" });
  const page = await context.newPage();
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "fi");
  await expect(page.getByRole("button", { name: "Harjoitus" })).toBeVisible();
  await expect(page.locator("#status")).toHaveText("Aloita vauhti painamalla välilyöntiä.");

  await context.close();
});

test("renders separate practice and competition hall-of-fame lists from local storage", async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem("makihyppy.hall-of-fame.practice", JSON.stringify([
      { name: "Ada", distance: 115.5 },
      { name: "Bea", distance: 122 },
    ]));
    localStorage.setItem("makihyppy.hall-of-fame.competition", JSON.stringify([
      { name: "Kai", distance: 118 },
    ]));
  });
  await page.reload();

  await page.getByRole("button", { name: "Top jumps" }).click();
  await expect(page.locator("#hallOfFameDialog")).toBeVisible();
  await expect(page.locator("#practiceHallList li")).toHaveText(["Bea122.0 m", "Ada115.5 m"]);
  await expect(page.locator("#competitionHallList li")).toHaveText(["Kai118.0 m"]);
});

test("starts a competition and shows configured entrants", async ({ page }) => {
  await page.getByRole("button", { name: "Competition" }).click();
  await expect(page.locator("#competitionSetup")).toBeVisible();

  await page.getByRole("spinbutton", { name: "Competitors" }).fill("2");
  await page.getByRole("spinbutton", { name: "Rounds" }).focus();
  await expect(page.locator(".competitorInput")).toHaveCount(2);

  await page.getByRole("button", { name: "Start competition" }).click();
  await expect(page.getByRole("region", { name: "Competition standings" })).toBeVisible();
  await expect(page.locator("#scoreboardBody tr")).toHaveCount(2);
  await expect(page.locator("#status")).toHaveText(/Round 1: Player, prepare to jump/);
});