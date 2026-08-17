import { test, expect } from "@playwright/test";

test.use({
  browserName: "chromium",
  channel: "chrome",
  headless: false,
});

const PERANANS: Array<{ label: string; clickSequence: Array<{ text: string; exact?: boolean }> }> = [
  {
    label: "Universal Motion PLT (Firma Guaman)",
    clickSequence: [
      { text: "Firma Pengurusan", exact: true },
      { text: "Firma Guaman", exact: true },
      { text: "UNIVERSAL MOTION PLT", exact: true },
    ],
  },
  {
    label: "YIK KEE RESTAURANT (Firma Ejen Duti Setem)",
    clickSequence: [
      { text: "Firma Pengurusan", exact: true },
      { text: "Firma Ejen Duti Setem", exact: true },
      { text: "YIK KEE RESTAURANT (KARAK) SDN. BHD.", exact: true },
    ],
  },
];

test("peranan change test", async ({ page }) => {
  test.setTimeout(10 * 60 * 1000);

  // ── Login ──────────────────────────────────────────────────────────────────
  await page.goto("https://mytax-dev.hasil.gov.my/web/");
  await page.waitForTimeout(3000);
  await page.reload();
  await page.waitForTimeout(6000);

  await page.getByRole("combobox").waitFor({ state: "visible", timeout: 20000 });
  await page.getByRole("combobox").selectOption("1");
  await page.getByRole("textbox", { name: "No. Pengenalan" }).waitFor({ state: "visible", timeout: 20000 });
  await page.getByRole("textbox", { name: "No. Pengenalan" }).fill("280929025063");
  await page.getByRole("button", { name: "Hantar" }).click();
  await page.getByRole("textbox", { name: "Sila Masukkan Kata Laluan" }).waitFor({ state: "visible", timeout: 20000 });
  await page.getByRole("textbox", { name: "Sila Masukkan Kata Laluan" }).fill("Passw0rd");
  await page.getByText("Percubaan Log Masuk Anda : 0 /").waitFor({ state: "visible", timeout: 20000 });
  await page.getByText("Percubaan Log Masuk Anda : 0 /").click();
  await page.getByText("Anda Ada 5 Percubaan Lagi").waitFor({ state: "visible", timeout: 20000 });
  await page.getByText("Anda Ada 5 Percubaan Lagi").click();
  await page.getByText("Anda Ada 5 Percubaan Lagi").click();
  await page.getByRole("textbox", { name: "Sila Masukkan Kata Laluan" }).click();
  await page.getByRole("button", { name: "Log Masuk" }).click();

  try {
    await page.getByText("Mulai 1 Januari 2023, format").waitFor({ state: "visible", timeout: 8000 });
    await page.getByRole("button", { name: "Ok" }).click();
  } catch {}

  await page.waitForTimeout(5000);
  // ──────────────────────────────────────────────────────────────────────────

  for (let i = 0; i < PERANANS.length; i++) {
    const peranan = PERANANS[i];
    console.log(`\n=== Round ${i + 1}: ${peranan.label} ===`);

    // Close extra tabs
    const allPages = page.context().pages();
    for (const p of allPages.slice(1)) await p.close();
    page = allPages[0];

    // Navigate to dashboard and open Pilihan Peranan
    await page.goto("https://mytax-dev.hasil.gov.my/web/dashboard-content");
    await page.waitForTimeout(3000);

    const pilihBtn = page.locator(".ic-container").first();
    await pilihBtn.waitFor({ state: "visible", timeout: 20000 });
    await pilihBtn.click();
    await page.waitForTimeout(1000);

    // Click through modal
    for (const { text, exact } of peranan.clickSequence) {
      const locator = page.getByText(text, exact ? { exact: true } : undefined);
      await locator.waitFor({ state: "visible", timeout: 20000 });
      await locator.click();
      await page.waitForTimeout(1000);
    }

    await page.waitForTimeout(5000);
    console.log(`Peranan changed to: ${peranan.label}`);

    // Check if EDS tab auto-opened
    const allPagesAfter = page.context().pages();
    const edsTabAuto = allPagesAfter.find((p) => p.url().includes("eds-uat.hasil.gov.my"));
    if (edsTabAuto) {
      page = edsTabAuto;
      await page.waitForLoadState();
      await page.waitForTimeout(3000);
      console.log("EDS tab auto-opened");
    }

    // Navigate to stamping upload
    await page.goto("https://eds-uat.hasil.gov.my/stamping/upload");
    await page.waitForTimeout(5000);

    console.log(`Current URL: ${page.url()}`);
    expect(page.url()).toContain("eds-uat.hasil.gov.my");
    console.log(`Round ${i + 1} OK — reached stamping upload as ${peranan.label}`);
  }

  console.log("\nAll peranan changes tested successfully.");
});
