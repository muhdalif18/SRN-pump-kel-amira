import { test } from "@playwright/test";
import * as fs from "fs";

test.use({
  browserName: "chromium",
  channel: "chrome",
  headless: false,
});

const namaList = ["Form of Transfer of Securites"];

function getCurrentDate(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// ─── PERANAN CONFIG ──────────────────────────────────────────────────────────
// Cycles through these per outer iteration.
// Each iteration: goto dashboard-content → click the blue Pilihan Peranan button
// → execute clickSequence items inside the modal.
//
// clickSequence: clicks to make INSIDE the "Pilihan Peranan" modal after it opens.
//   For Individu:       [{ text: "Individu", exact: true }]
//   For Firma Guaman company:
//     [{ text: "Firma Guaman" }, { text: "UNIVERSAL MOTION PLT" }]
//   Expand a collapsed category first (e.g. "Firma Pengurusan"), then sub-category,
//   then company.
const PERANANS: Array<{
  label: string;
  clickSequence: Array<{ text: string; exact?: boolean }>;
}> = [
  {
    label: "JANGAN PERGIIIIIIIII)",
    clickSequence: [
      { text: "Individu", exact: true },
      //  { text: "Firma Ejen Duti Setem", exact: true },
      //  { text: "HHL RESOURCES SENDIRIAN BERHAD - ISKANDAR PUTERI", exact: true }, // expand Firma Ejen Duti Setem (nested)
    ],
  },
];
// ─────────────────────────────────────────────────────────────────────────────

test("test", async ({ page }, testInfo) => {
  test.setTimeout(4 * 60 * 60 * 1000); // 4 hours

  const browserTag = testInfo.project.name;

  // Clear browser cache and cookies before starting
  const client = await page.context().newCDPSession(page);
  await client.send("Network.clearBrowserCache");
  await client.send("Network.clearBrowserCookies");

  // Load addresses data
  const addressesData = JSON.parse(
    fs.readFileSync("./test-data/addresses_my.json", "utf-8"),
  );
  const addresses = addressesData.INDIVIDU;

  //EDS SIDE
  await page.goto("https://mytax-dev.hasil.gov.my/web/");
  await page.waitForTimeout(3000);
  try {
    await page.reload();
  } catch (_) {}
  await page.waitForTimeout(6000);
  await page
    .getByRole("combobox")
    .waitFor({ state: "visible", timeout: 20000 });
  await page.waitForTimeout(3000);

  await page.getByRole("combobox").selectOption("1");
  await page
    .getByRole("textbox", { name: "No. Pengenalan" })
    .waitFor({ state: "visible", timeout: 20000 });
  await page.getByRole("textbox", { name: "No. Pengenalan" }).click();
  await page.waitForTimeout(3000);
  await page
    .getByRole("textbox", { name: "No. Pengenalan" })
    .waitFor({ state: "visible", timeout: 20000 });
  await page
    .getByRole("textbox", { name: "No. Pengenalan" })
    //.fill("710424115474");
    .fill("710424115474");
  await page.waitForTimeout(2000);
  await page
    .getByRole("button", { name: "Hantar" })
    .waitFor({ state: "visible", timeout: 20000 });
  await page.getByRole("button", { name: "Hantar" }).click();
  await page
    .getByRole("textbox", { name: "Sila Masukkan Kata Laluan" })
    .waitFor({ state: "visible", timeout: 20000 });
  await page
    .getByRole("textbox", { name: "Sila Masukkan Kata Laluan" })
    .click();
  await page
    .getByRole("textbox", { name: "Sila Masukkan Kata Laluan" })
    .fill("Passw0rd");
  await page
    .getByText("Percubaan Log Masuk Anda : 0 /")
    .waitFor({ state: "visible", timeout: 20000 });
  await page.getByText("Percubaan Log Masuk Anda : 0 /").click();
  await page
    .getByText("Anda Ada 5 Percubaan Lagi")
    .waitFor({ state: "visible", timeout: 20000 });
  await page.getByText("Anda Ada 5 Percubaan Lagi").click();
  await page.getByText("Anda Ada 5 Percubaan Lagi").click();
  await page
    .getByRole("textbox", { name: "Sila Masukkan Kata Laluan" })
    .waitFor({ state: "visible", timeout: 20000 });
  await page
    .getByRole("textbox", { name: "Sila Masukkan Kata Laluan" })
    .click();
  await page.getByRole("button", { name: "Log Masuk" }).click();

  // Notification modal — may or may not appear
  try {
    await page
      .getByText("Mulai 1 Januari 2023, format")
      .waitFor({ state: "visible", timeout: 8000 });
    await page.getByText("Mulai 1 Januari 2023, format").click();
    await page.getByRole("button", { name: "Ok" }).click();
  } catch {
    // modal did not appear, continue
  }

  await page.waitForTimeout(5000);

  // Safety: dismiss modal if appeared late
  try {
    const lateModal = page.getByText("Mulai 1 Januari 2023, format");
    if (await lateModal.isVisible()) {
      await page.getByRole("button", { name: "Ok" }).click();
      await page.waitForTimeout(1000);
    }
  } catch {}

  // Clear the URL log file before starting
  const currentUrlLogFile = `./test-data/current-url-kel-normal-second-${browserTag}.txt`;
  fs.writeFileSync(
    currentUrlLogFile,
    "Stamping Submission URLs (NORMAL SECOND)\n==================================\n\n",
  );

  // Write a run separator to the permanent log
  const runTimestamp = new Date().toISOString();
  fs.appendFileSync(
    "./test-data/srn-permanent-log.txt",
    `\n=== Run started: ${runTimestamp} (KEL NORMAL SECOND) ===\n`,
  );

  // Progress tracking: Read last completed iteration
  const progressFile = `./test-data/progress-SRN-PUMP-KEL-NORMAL-SECOND-${browserTag}.txt`;
  let startIteration = 1;

  if (fs.existsSync(progressFile)) {
    try {
      const lastCompleted = parseInt(
        fs.readFileSync(progressFile, "utf-8").trim(),
        10,
      );
      if (!isNaN(lastCompleted) && lastCompleted > 0) {
        startIteration = lastCompleted + 1;
        console.log(
          `Resuming from iteration ${startIteration} (last completed: ${lastCompleted})`,
        );
        fs.appendFileSync(
          "./test-data/srn-permanent-log.txt",
          `[${new Date().toISOString()}] Resuming from iteration ${startIteration}\n`,
        );
      }
    } catch (err) {
      console.log("Could not read progress file, starting from iteration 1");
    }
  }

  for (let i = startIteration; i <= 2000; i++) {
    const flowLabel = "NORMAL";
    const peranan = PERANANS[(i - 1) % PERANANS.length];
    console.log(
      `--- Loop iteration ${i} | peranan: ${peranan.label} | [${flowLabel}]`,
    );

    // ── Close any extra tabs from previous EDS session ───────────────────────
    const allPages = page.context().pages();
    for (const p of allPages.slice(1)) await p.close();
    page = allPages[0];

    // ── Navigate to MyTax dashboard and change peranan ───────────────────────
    console.log("[" + i + "] → Tukar peranan...");
    await page.goto("https://mytax-dev.hasil.gov.my/web/dashboard-content");
    await page.waitForTimeout(3000);

    // Dismiss "Pemberitahuan MyTax" notification popup if it appears
    try {
      await page
        .getByRole("button", { name: "Ok" })
        .waitFor({ state: "visible", timeout: 5000 });
      await page.getByRole("button", { name: "Ok" }).click();
      await page.waitForTimeout(1000);
    } catch {
      /* popup did not appear, continue */
    }

    const pilihBtn = page.locator(".ic-container").first();
    await pilihBtn.waitFor({ state: "visible", timeout: 20000 });
    await pilihBtn.click();
    await page.waitForTimeout(1000);

    for (const { text, exact } of peranan.clickSequence) {
      const locator = page
        .getByText(text, exact ? { exact: true } : undefined)
        .last();
      await locator.waitFor({ state: "visible", timeout: 20000 });
      await locator.click();
      await page.waitForTimeout(1000);
    }
    await page.waitForTimeout(5000);

    // If peranan change auto-opened a new EDS tab, switch page to it.
    const allPagesAfter = page.context().pages();
    const edsTabAuto = allPagesAfter.find((p) =>
      p.url().includes("eds-uat.hasil.gov.my"),
    );
    if (edsTabAuto) {
      page = edsTabAuto;
      await page.waitForLoadState();
      await page.waitForTimeout(3000);
    } else {
      // No EDS tab auto-opened — navigate via Perkhidmatan ezHasil on dashboard
      await page
        .getByText("Perkhidmatan ezHasil")
        .waitFor({ state: "visible", timeout: 20000 });
      await page.getByText("Perkhidmatan ezHasil").click();
      await page.waitForTimeout(2000);
      await page
        .getByText("Duti Setem 2.0 (UAT) e-Duti")
        .waitFor({ state: "visible", timeout: 20000 });
      await page.getByText("Duti Setem 2.0 (UAT) e-Duti").click();
      const [newEdsPage] = await Promise.all([
        page.context().waitForEvent("page"),
        page.getByRole("link", { name: "e-Duti Setem" }).click(),
      ]);
      await newEdsPage.waitForLoadState();
      page = newEdsPage;
      await page.waitForTimeout(3000);
    }
    // ─────────────────────────────────────────────────────────────────────────

    console.log("[" + i + "] → EDS: Upload dokumen...");
    await page.goto("https://eds-uat.hasil.gov.my/stamping/upload");
    await page.waitForTimeout(5000);
    try {
      await page
        .getByRole("button", { name: "Faham" })
        .waitFor({ state: "visible", timeout: 8000 });
      await page.getByRole("button", { name: "Faham" }).click();
    } catch {
      // banner notification did not appear, continue
    }
    await page
      .locator("#fileInput_single")
      .setInputFiles("./test-data/image (19).png");

    await page
      .getByRole("button", { name: "Hantar" })
      .waitFor({ state: "visible", timeout: 20000 });
    await page.getByRole("button", { name: "Hantar" }).click();
    await page.getByRole("button", { name: "Teruskan tanpa AI" }).click();
    await page
      .getByRole("option", { name: "DS 2: Pindah Milik Saham" })
      .waitFor({ state: "visible", timeout: 20000 });
    await page
      .getByRole("option", { name: "DS 2: Pindah Milik Saham" })
      .click();
    await page.waitForTimeout(5000);
    await page
      .getByText("Tempat Surat Cara Ditandatangan*")
      .waitFor({ state: "visible", timeout: 20000 });
    await page.getByText("Tempat Surat Cara Ditandatangan*").click();
    await page.locator("#DocTitleStep0").click();
    await page.locator("#DocTitleStep0").fill(`OBJECTION USE.  ${i}`);
    await page
      .getByRole("textbox", { name: "dd/MM/yyyy" })
      .first()
      .waitFor({ state: "visible", timeout: 20000 });
    for (let _calTry = 0; _calTry < 5; _calTry++) {
      await page.getByRole("textbox", { name: "dd/MM/yyyy" }).first().click();
      await page.waitForTimeout(1000);
      if (await page.locator(".flatpickr-calendar.open").isVisible()) break;
    }
    const _cur = getCurrentDate();
    const [_dd, _mm] = _cur.split("/");
    const _mNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const _mName = _mNames[parseInt(_mm, 10) - 1];
    await page
      .getByLabel("Month")
      .first()
      .selectOption(String(parseInt(_mm, 10) - 1));
    await page
      .locator(".flatpickr-calendar.open")
      .getByLabel(`${_mName} ${parseInt(_dd, 10)},`)
      .click();
    await page.getByText("Tempat Surat Cara Ditandatangan*").click();

    await page.getByRole("radio", { name: "Luar Malaysia" }).check();
    await page.getByRole("radio", { name: "Malaysia", exact: true }).check();
    await page.waitForTimeout(6000);
    await page
      .locator("button.nextBtn:has(span:text-is('Seterusnya'))")
      .first()
      .click({ force: true });
    await page.waitForTimeout(3000);

    await page
      .getByRole("checkbox", { name: "Saya / Syarikat sebagai" })
      .waitFor({ state: "visible", timeout: 20000 });
    await page
      .getByRole("checkbox", { name: "Saya / Syarikat sebagai" })
      .check();
    await page.waitForTimeout(4000);

    // Detect which party type was auto-selected
    const formAIsIndividu = await page
      .getByRole("radio", { name: "Individu" })
      .isChecked();
    const formAIsSyarikat = await page
      .getByRole("radio", { name: "Syarikat / Perniagaan Milikan" })
      .isChecked();

    if (formAIsIndividu) {
      const fillInd = async (sel: string, val: string) => {
        const v = await page
          .locator(sel)
          .inputValue()
          .catch(() => "");
        if (!v.trim()) await page.locator(sel).fill(val);
      };
      await fillInd(
        'input[name="StampingForm.FormAIndividualList[0].TelNo"]',
        "0199184986",
      );
      const emailInd = await page
        .locator("#fld-email-ind-0Step1")
        .inputValue()
        .catch(() => "");
      if (!emailInd.trim())
        await page.locator("#fld-email-ind-0Step1").fill("syed@gmail.com");
      const addr1Ind = await page
        .locator('input[name="StampingForm.FormAIndividualList[0].Addr1"]')
        .inputValue()
        .catch(() => "");
      if (!addr1Ind.trim()) {
        const randomAddrA0 =
          addresses[Math.floor(Math.random() * addresses.length)];
        await page
          .locator('input[name="StampingForm.FormAIndividualList[0].Addr1"]')
          .fill(randomAddrA0.Addr1);
        await page
          .locator('input[name="StampingForm.FormAIndividualList[0].Addr2"]')
          .fill(randomAddrA0.Addr2);
        await page
          .locator('input[name="StampingForm.FormAIndividualList[0].Addr3"]')
          .fill(randomAddrA0.Addr3);
      }
      await fillInd(
        'input[name="StampingForm.FormAIndividualList[0].Postcode"]',
        "15350",
      );
      /* // Tambah Individu ke Pihak Pertama
      await page
        .getByRole("button", { name: "+ Tambah Pihak Pertama" })
        .click();
      await page.getByRole("textbox").first().click();
      await page.getByRole("textbox").first().fill("MUHAMAD ALIF ANUAR");
      await page.getByRole("combobox").first().selectOption("1");
      await page.locator("#ICNo_2").click();
      await page.locator("#ICNo_2").fill("800403075628");
      await page.getByRole("textbox").nth(3).click();
      await page.getByRole("textbox").nth(3).fill("01245874857");
      await page.locator("#fld-email-ind-2Step1").click();
      await page.locator("#fld-email-ind-2Step1").fill("alif@gmail.com");
      await page.getByRole("textbox").nth(5).click();
      await page.getByRole("textbox").nth(5).fill("ABC ALAMAT 1");
      await page
        .locator(
          ".collapse-body.collapse.mt-3.show > div > div:nth-child(4) > div > div:nth-child(12) > .row > div:nth-child(2) > .form-control",
        )
        .click();
      await page
        .locator(
          ".collapse-body.collapse.mt-3.show > div > div:nth-child(4) > div > div:nth-child(12) > .row > div:nth-child(2) > .form-control",
        )
        .fill("DEF ALAMAT 2");
      await page
        .locator(
          ".collapse-body.collapse.mt-3.show > div > div:nth-child(4) > div > div:nth-child(12) > .row > div:nth-child(3) > .form-control",
        )
        .click();
      await page
        .locator(
          ".collapse-body.collapse.mt-3.show > div > div:nth-child(4) > div > div:nth-child(12) > .row > div:nth-child(3) > .form-control",
        )
        .fill("GHI ALAMAT 3");
      await page
        .locator(
          ".collapse-body.collapse.mt-3.show > div > div:nth-child(4) > div > div:nth-child(13) > .form-control",
        )
        .first()
        .click();
      await page
        .locator(
          ".collapse-body.collapse.mt-3.show > div > div:nth-child(4) > div > div:nth-child(13) > .form-control",
        )
        .first()
        .fill("80000");
      // Tambah Syarikat ke Pihak Pertama
      await page
        .getByRole("button", { name: "+ Tambah Pihak Pertama" })
        .click();
      await page
        .getByRole("radio", { name: "Syarikat / Perniagaan Milikan" })
        .last()
        .check();
      await page
        .locator('input[name="StampingForm.FormACompanyList[0].CompanyName"]')
        .click();
      await page
        .locator('input[name="StampingForm.FormACompanyList[0].CompanyName"]')
        .fill("SYARIKAT ABCDEF");
      await page
        .locator('select[name="StampingForm.FormACompanyList[0].CatTaxId"]')
        .selectOption("4");
      await page
        .locator(
          'input[name="StampingForm.FormACompanyList[0].NewCompanyRegistrationNo"]',
        )
        .click();
      await page
        .locator(
          'input[name="StampingForm.FormACompanyList[0].NewCompanyRegistrationNo"]',
        )
        .fill("199301012242");
      await page.getByRole("radio").nth(5).check();
      await page
        .locator('input[name="StampingForm.FormACompanyList[0].TelNo"]')
        .click();
      await page
        .locator('input[name="StampingForm.FormACompanyList[0].TelNo"]')
        .fill("0333333333");
      await page.locator("#fld-email-com-3Step1").click();
      await page.locator("#fld-email-com-3Step1").fill("syarikat@gmail.com");
      await page
        .locator('input[name="StampingForm.FormACompanyList[0].ADDR1"]')
        .click();
      await page
        .locator('input[name="StampingForm.FormACompanyList[0].ADDR1"]')
        .fill("ALAMAT 1 ABC");
      await page
        .locator('input[name="StampingForm.FormACompanyList[0].ADDR2"]')
        .click();
      await page
        .locator('input[name="StampingForm.FormACompanyList[0].ADDR2"]')
        .fill("DEF ALAMAT 2");
      await page
        .locator('input[name="StampingForm.FormACompanyList[0].ADDR3"]')
        .click();
      await page
        .locator('input[name="StampingForm.FormACompanyList[0].ADDR3"]')
        .fill("HJI ALAMAT 3");
      await page
        .locator('input[name="StampingForm.FormACompanyList[0].Postcode"]')
        .click();
      await page
        .locator('input[name="StampingForm.FormACompanyList[0].Postcode"]')
        .fill("60000"); */
    } else if (formAIsSyarikat) {
      const fillCom = async (sel: string, val: string) => {
        const v = await page
          .locator(sel)
          .inputValue()
          .catch(() => "");
        if (!v.trim()) await page.locator(sel).fill(val);
      };
      await page.locator("#KategoriPembayarDuti").selectOption("4");
      await page
        .locator(
          'input[name="StampingForm.FormACompanyList[0].NewCompanyRegistrationNo"]',
        )
        .fill("200401032872");
      await page.waitForTimeout(3000);
      await fillCom(
        'input[name="StampingForm.FormACompanyList[0].TelNo"]',
        "0199184986",
      );
      const emailCom = await page
        .locator("#fld-email-com-0Step1")
        .inputValue()
        .catch(() => "");
      if (!emailCom.trim())
        await page.locator("#fld-email-com-0Step1").fill("syed@gmail.com");
      const addr1Com = await page
        .locator('input[name="StampingForm.FormACompanyList[0].ADDR1"]')
        .inputValue()
        .catch(() => "");
      if (!addr1Com.trim()) {
        await page
          .locator('input[name="StampingForm.FormACompanyList[0].ADDR1"]')
          .fill("Unit 14-05, Level 14");
        await page
          .locator('input[name="StampingForm.FormACompanyList[0].ADDR2"]')
          .fill("Menara TH Uptown");
        await page
          .locator('input[name="StampingForm.FormACompanyList[0].ADDR3"]')
          .fill("No. 3, Jalan SS 21/39");
      }
      await fillCom(
        'input[name="StampingForm.FormACompanyList[0].Postcode"]',
        "47400",
      );
      // IsCompRole — always select Tidak for Syarikat
      try {
        await page
          .locator("#step2_div_IsCompRole")
          .waitFor({ state: "visible", timeout: 3000 });
        await page.locator("#step2_div_IsCompRole input[value='0']").click();
        await page.waitForTimeout(500);
      } catch (_) {}
      /* // Tambah Individu ke Pihak Pertama
      await page
        .getByRole("button", { name: "+ Tambah Pihak Pertama" })
        .click();
      await page.getByRole("textbox").first().click();
      await page.getByRole("textbox").first().fill("MUHAMAD ALIF ANUAR");
      await page.getByRole("combobox").first().selectOption("1");
      await page.locator("#ICNo_2").click();
      await page.locator("#ICNo_2").fill("800403075628");
      await page.getByRole("textbox").nth(3).click();
      await page.getByRole("textbox").nth(3).fill("01245874857");
      await page.locator("#fld-email-ind-2Step1").click();
      await page.locator("#fld-email-ind-2Step1").fill("alif@gmail.com");
      await page.getByRole("textbox").nth(5).click();
      await page.getByRole("textbox").nth(5).fill("ABC ALAMAT 1");
      await page
        .locator(
          ".collapse-body.collapse.mt-3.show > div > div:nth-child(4) > div > div:nth-child(12) > .row > div:nth-child(2) > .form-control",
        )
        .click();
      await page
        .locator(
          ".collapse-body.collapse.mt-3.show > div > div:nth-child(4) > div > div:nth-child(12) > .row > div:nth-child(2) > .form-control",
        )
        .fill("DEF ALAMAT 2");
      await page
        .locator(
          ".collapse-body.collapse.mt-3.show > div > div:nth-child(4) > div > div:nth-child(12) > .row > div:nth-child(3) > .form-control",
        )
        .click();
      await page
        .locator(
          ".collapse-body.collapse.mt-3.show > div > div:nth-child(4) > div > div:nth-child(12) > .row > div:nth-child(3) > .form-control",
        )
        .fill("GHI ALAMAT 3");
      await page
        .locator(
          ".collapse-body.collapse.mt-3.show > div > div:nth-child(4) > div > div:nth-child(13) > .form-control",
        )
        .first()
        .click();
      await page
        .locator(
          ".collapse-body.collapse.mt-3.show > div > div:nth-child(4) > div > div:nth-child(13) > .form-control",
        )
        .first()
        .fill("80000");
      // Tambah Syarikat ke Pihak Pertama (2nd syarikat, listIdx 1)
      await page
        .getByRole("button", { name: "+ Tambah Pihak Pertama" })
        .click();
      await page
        .getByRole("radio", { name: "Syarikat / Perniagaan Milikan" })
        .last()
        .check();
      await page
        .locator('input[name="StampingForm.FormACompanyList[1].CompanyName"]')
        .click();
      await page
        .locator('input[name="StampingForm.FormACompanyList[1].CompanyName"]')
        .fill("SYARIKAT ABCDEF");
      await page
        .locator('select[name="StampingForm.FormACompanyList[1].CatTaxId"]')
        .selectOption("4");
      await page
        .locator(
          'input[name="StampingForm.FormACompanyList[1].NewCompanyRegistrationNo"]',
        )
        .click();
      await page
        .locator(
          'input[name="StampingForm.FormACompanyList[1].NewCompanyRegistrationNo"]',
        )
        .fill("199301012242");
      await page.getByRole("radio").nth(5).check();
      await page
        .locator('input[name="StampingForm.FormACompanyList[1].TelNo"]')
        .click();
      await page
        .locator('input[name="StampingForm.FormACompanyList[1].TelNo"]')
        .fill("0333333333");
      await page.locator("#fld-email-com-3Step1").click();
      await page.locator("#fld-email-com-3Step1").fill("syarikat@gmail.com");
      await page
        .locator('input[name="StampingForm.FormACompanyList[1].ADDR1"]')
        .click();
      await page
        .locator('input[name="StampingForm.FormACompanyList[1].ADDR1"]')
        .fill("ALAMAT 1 ABC");
      await page
        .locator('input[name="StampingForm.FormACompanyList[1].ADDR2"]')
        .click();
      await page
        .locator('input[name="StampingForm.FormACompanyList[1].ADDR2"]')
        .fill("DEF ALAMAT 2");
      await page
        .locator('input[name="StampingForm.FormACompanyList[1].ADDR3"]')
        .click();
      await page
        .locator('input[name="StampingForm.FormACompanyList[1].ADDR3"]')
        .fill("HJI ALAMAT 3");
      await page
        .locator('input[name="StampingForm.FormACompanyList[1].Postcode"]')
        .click();
      await page
        .locator('input[name="StampingForm.FormACompanyList[1].Postcode"]')
        .fill("60000"); */
    }

    // Tambah Pihak Pertama 1 via Pilih Kegemaran
    await page.getByRole("button", { name: "+ Tambah Pihak Pertama" }).click();
    await page.waitForTimeout(500);
    await page.locator("button.btnLoadFavoriteSingle").last().click();
    await page
      .locator(".fav-pilih-dropdown")
      .waitFor({ state: "visible", timeout: 10000 });
    await page.locator(".fav-pilih-dropdown span").first().click();
    await page
      .locator("button.ds-popup-btn-confirm")
      .waitFor({ state: "visible", timeout: 10000 });
    await page.locator("button.ds-popup-btn-confirm").click();
    await page.waitForTimeout(1000);
    // Tambah Pihak Pertama 2 via Pilih Kegemaran (nth(1) to avoid picking same person as first)
    /* await page.getByRole("button", { name: "+ Tambah Pihak Pertama" }).click();
    await page.waitForTimeout(500);
    await page.locator("button.btnLoadFavoriteSingle").last().click();
    await page
      .locator(".fav-pilih-dropdown")
      .waitFor({ state: "visible", timeout: 10000 });
    await page.locator(".fav-pilih-dropdown span").nth(1).click();
    await page
      .locator("button.ds-popup-btn-confirm")
      .waitFor({ state: "visible", timeout: 10000 });
    await page.locator("button.ds-popup-btn-confirm").click();
    await page.waitForTimeout(1000); */

    await page.getByRole("button", { name: "Seterusnya " }).click();

    await page
      .getByRole("radio", { name: "Kerajaan / Badan Berkanun /" })
      .check();
    await page.locator("#step2_div_GovName").getByRole("textbox").click();
    await page
      .locator("#step2_div_GovName")
      .getByRole("textbox")
      .fill("Lembaga Ahli Geologi Malaysia");
    await page.getByRole("listitem").click();
    await page.getByRole("radio", { name: "Pemilikan Asing" }).check();
    await page.getByRole("radio", { name: "Pemilikan Tempatan" }).check();
    await page.getByRole("textbox").nth(3).click();
    await page.getByRole("textbox").nth(3).fill("0199184444");
    await page.locator("#govEmail_1").click();
    await page.locator("#govEmail_1").fill("lem@gmail.com");
    await page.locator("#govAdd1_1").click();
    await page.locator("#govAdd1_1").fill("232");
    await page.locator("#govAdd2_1").click();
    await page.locator("#govAdd1_1").fill("232");
    await page.locator("#govAdd2_1").click();
    await page.locator("#govAdd2_1").fill("Lembaga");
    await page.locator("#govAdd3_1").click();
    await page.locator("#govAdd3_1").fill("Geo");
    await page.locator("#govPoscode_1").click();
    await page.locator("#govPoscode_1").fill("15500");
    await page.waitForTimeout(3000);

    /* // Tambah Individu ke Pihak Kedua
    await page.getByRole("button", { name: "+ Tambah Pihak Kedua" }).click();
    await page
      .locator('input[name="StampingForm.FormBIndividualList[0].Name"]')
      .click();
    await page
      .locator('input[name="StampingForm.FormBIndividualList[0].Name"]')
      .fill("MUHAMAD SALEH");
    await page.locator("#IsCitizen_4").selectOption("1");
    await page
      .locator('input[name="StampingForm.FormBIndividualList[0].IcNo"]')
      .click();
    await page
      .locator('input[name="StampingForm.FormBIndividualList[0].IcNo"]')
      .fill("590511025908");
    await page
      .locator('input[name="StampingForm.FormBIndividualList[0].TelNo"]')
      .click();
    await page
      .locator('input[name="StampingForm.FormBIndividualList[0].TelNo"]')
      .fill("01545455555");
    await page.locator("#fld-email-ind-4-Step2").click();
    await page.locator("#fld-email-ind-4-Step2").fill("saleh@gmail.com");
    await page
      .locator('input[name="StampingForm.FormBIndividualList[0].Addr1"]')
      .click();
    await page
      .locator('input[name="StampingForm.FormBIndividualList[0].Addr1"]')
      .fill("ALAMAT 1");
    await page
      .locator('input[name="StampingForm.FormBIndividualList[0].Addr2"]')
      .click();
    await page
      .locator('input[name="StampingForm.FormBIndividualList[0].Addr2"]')
      .fill("ALAMAT 2");
    await page
      .locator('input[name="StampingForm.FormBIndividualList[0].Addr3"]')
      .click();
    await page
      .locator('input[name="StampingForm.FormBIndividualList[0].Addr3"]')
      .fill("ALAMAT 3");
    await page
      .locator('input[name="StampingForm.FormBIndividualList[0].Postcode"]')
      .click();
    await page
      .locator('input[name="StampingForm.FormBIndividualList[0].Postcode"]')
      .fill("45000");
    // Tambah Syarikat ke Pihak Kedua
    await page.getByRole("button", { name: "+ Tambah Pihak Kedua" }).click();
    await page
      .getByRole("radio", { name: "Syarikat / Perniagaan Milikan" })
      .last()
      .check();
    await page.getByRole("textbox").first().click();
    await page.getByRole("textbox").first().fill("SYARIKAT ABAH AND SONS");
    await page.getByRole("combobox").first().selectOption("4");
    await page.getByRole("textbox").nth(1).click();
    await page.getByRole("textbox").nth(1).fill("199301012242");
    await page.getByRole("textbox").nth(2).click();
    await page.getByRole("textbox").nth(2).fill("199301012242");
    await page.locator("#compStatus1_5").check();
    await page.getByRole("textbox").nth(4).click();
    await page.getByRole("textbox").nth(4).fill("04444444444");
    await page.getByRole("textbox").nth(5).click();
    await page.getByRole("textbox").nth(5).fill("syarikatabahsons@gmail.com");
    await page
      .locator(
        ".collapse-body.collapse.mt-3.show > div > div:nth-child(5) > div > div:nth-child(12) > div:nth-child(3) > div > .form-control",
      )
      .first()
      .click();
    await page
      .locator(
        ".collapse-body.collapse.mt-3.show > div > div:nth-child(5) > div > div:nth-child(12) > div:nth-child(3) > div > .form-control",
      )
      .first()
      .fill("ALAMAT 3");
    await page
      .locator(
        ".collapse-body.collapse.mt-3.show > div > div:nth-child(5) > div > div:nth-child(12) > div:nth-child(3) > div:nth-child(2) > .form-control",
      )
      .click();
    await page
      .locator(
        ".collapse-body.collapse.mt-3.show > div > div:nth-child(5) > div > div:nth-child(12) > div:nth-child(3) > div:nth-child(2) > .form-control",
      )
      .fill("ALAMAT 4");
    await page
      .locator(
        ".collapse-body.collapse.mt-3.show > div > div:nth-child(5) > div > div:nth-child(12) > div:nth-child(3) > div:nth-child(3) > .form-control",
      )
      .click();
    await page
      .locator(
        ".collapse-body.collapse.mt-3.show > div > div:nth-child(5) > div > div:nth-child(12) > div:nth-child(3) > div:nth-child(3) > .form-control",
      )
      .fill("ALAMAT 5");
    await page
      .locator(
        ".collapse-body.collapse.mt-3.show > div > div:nth-child(5) > div > div:nth-child(13) > .form-control",
      )
      .click();
    await page
      .locator(
        ".collapse-body.collapse.mt-3.show > div > div:nth-child(5) > div > div:nth-child(13) > .form-control",
      )
      .fill("40000");

    // If "Pentadbir Tanah / Pegawai Mahkamah..." radio appears on Pihak Kedua, select Ya
    try {
      await page
        .locator("#step2_div_IsCompRole")
        .waitFor({ state: "visible", timeout: 3000 });
      await page.locator("#step2_div_IsCompRole input[value='1']").click();
      await page.waitForTimeout(500);
    } catch (_) {} */

    await page.getByRole("button", { name: "Seterusnya " }).click();

    await page
      .getByRole("radio", { name: "Ada", exact: true })
      .waitFor({ state: "visible", timeout: 10000 });

    await page.getByRole("radio", { name: "Ada", exact: true }).check();
    await page.getByRole("radio", { name: "Tiada" }).check();
    await page.getByRole("radio", { name: "Saham Biasa" }).check();
    await page.locator("#StampingForm_formC_2_ShrTot").click();
    await page.locator("#StampingForm_formC_2_ShrTot").fill("30000000");
    await page.locator("#StampingForm_formC_2_ShrTot").press("Tab");
    await page.locator("#StampingForm_formC_2_ShrTrf").fill("30000000");
    await page.getByRole("radio", { name: "Ringgit Malaysia" }).check();
    await page.getByRole("textbox", { name: "0.00" }).click();
    const amountToUse =
      Math.floor(Math.random() * (900000000 - 100000000 + 1)) + 100000000;
    await page
      .getByRole("textbox", { name: "0.00" })
      .fill(amountToUse.toLocaleString("en-US"));
    await page.locator("#statusSelect").selectOption("1");
    await page.waitForTimeout(1500);

    const openCal = page.locator(".flatpickr-calendar.open");

    for (let _calTry = 0; _calTry < 5; _calTry++) {
      await page.getByRole("textbox", { name: "dd/mm/yyyy" }).first().click();
      await page.waitForTimeout(1000);
      if (await openCal.isVisible()) break;
    }
    await openCal.waitFor({ state: "visible", timeout: 20000 });
    await openCal
      .locator(
        ".flatpickr-day:not(.flatpickr-disabled):not(.prevMonthDay):not(.nextMonthDay)",
      )
      .first()
      .click();

    await page.locator("#transactionReason").selectOption("1");

    await page.getByRole("button", { name: "Seterusnya " }).click();
    await page
      .getByText("Maklumat Syarikat *")
      .waitFor({ state: "visible", timeout: 20000 });
    await page.getByText("Maklumat Syarikat *").click();
    await page.locator("#StampingForm_formC_2_CompName").click();
    await page
      .locator("#StampingForm_formC_2_CompName")
      .fill("SYARIKAT ABAH SAYA");
    await page.locator("#StampingForm_formC_2_CompRegOld").click();
    await page
      .locator("#StampingForm_formC_2_CompName")
      .fill("SYARIKAT ABAH SAYA1");
    await page.locator("#StampingForm_formC_2_CompRegOld").fill("2331");
    await page.getByText("Nombor Pendaftaran Syarikat *").click();
    await page.locator("#StampingForm_formC_2_CompRegOld").click();
    await page.locator("#StampingForm_formC_2_CompRegOld").fill("23311");
    await page.locator("#StampingForm_formC_2_CompRegNew").click();
    await page.locator("#StampingForm_formC_2_CompRegNew").fill("11231231");
    await page.getByText("Aktiviti Utama Syarikat *").click();
    await page.locator("#compAct").selectOption("13");
    await page.locator("#StampingForm_formC_2_CompAddr1").click();
    await page.locator("#StampingForm_formC_2_CompAddr1").fill("SYAAA11");
    await page.locator("#StampingForm_formC_2_CompAddr2").click();
    await page.locator("#StampingForm_formC_2_CompAddr2").fill("sss");
    await page.locator("#StampingForm_formC_2_CompPostcode").click();
    await page.locator("#StampingForm_formC_2_CompPostcode").fill("60000");
    await page.waitForTimeout(5000);

    await page.getByRole("button", { name: "Seterusnya " }).click();

    await page
      .locator("h5.mb-3.fw-bold", { hasText: "Peremitan / Pengecualian" })
      .waitFor({ state: "visible", timeout: 10000 });

    await page.getByRole("button", { name: "Seterusnya " }).click();

    console.log("[" + i + "] → EDS: Upload dokumen sokongan...");
    // Upload supporting document
    await page
      .locator(
        'button.upload-btn[data-bs-model="StampingForm.SupportingDocFiles"]',
      )
      .click();
    await page.waitForTimeout(2000);

    await page
      .locator("#uploadModal")
      .waitFor({ state: "visible", timeout: 20000 });

    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.locator("button#btnAddFile").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles("./test-data/image (19).png");
    await page.waitForTimeout(2000);

    await page.locator("button#btnSaveUpload").click();
    await page.waitForTimeout(2000);

    await page.getByRole("button", { name: "Seterusnya " }).click();

    await page
      .locator("label")
      .filter({ hasText: "Saya seperti nama dan Nombor" })
      .click();

    console.log("[" + i + "] → EDS: Pengesahan & hantar...");
    // Check "Saya sebagai" radio — select Diri Sendiri only if none already selected
    const sayaSebagaiChecked = await page
      .locator('input[name="StampingForm.stampingData.FrmAck.Rep"]')
      .evaluateAll((inputs: any[]) => inputs.some((el: any) => el.checked));
    if (!sayaSebagaiChecked) {
      await page.locator("#wakilDiri").check();
    }

    await page
      .getByRole("radio", { name: "Pihak Pertama", exact: true })
      .check();
    await page.getByRole("button", { name: "Hantar " }).click();
    await page
      .locator("#bndsPreviewLabel")
      .waitFor({ state: "visible", timeout: 20000 });
    await page.locator("#bndsPreviewHantar").click();
    await page.getByRole("button", { name: "Ya, Hantar" }).click();

    // Wait for success modal "Berjaya - Permohonan berjaya dihantar." then click OK
    await page
      .locator("#ds-popup-message")
      .waitFor({ state: "visible", timeout: 20000 });
    await page.locator("button.ds-popup-btn-confirm").click();

    await page.waitForTimeout(2000);

    await page
      .getByRole("button", { name: "Kembali ke Paparan Utama" })
      .waitFor({ state: "visible", timeout: 20000 });

    await page.waitForTimeout(2000);
    const cetakBtn = page.locator("button.btn-std", {
      hasText: "Cetak Slip Pengesahan",
    });
    await cetakBtn.waitFor({ state: "visible", timeout: 20000 });
    await cetakBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    let download = null;
    for (let _attempt = 0; _attempt < 3; _attempt++) {
      try {
        const dlPromise = page.waitForEvent("download", { timeout: 10000 });
        await cetakBtn.click({ force: true });
        download = await dlPromise;
        break;
      } catch {
        await page.waitForTimeout(1000);
      }
    }
    if (!download)
      throw new Error("Cetak Slip Pengesahan failed after 3 attempts");

    // Extract SRN from filename: Slip_Pengesahan_9992619817932717.pdf
    const filename = download.suggestedFilename();
    const srnMatch = filename.match(/Slip_Pengesahan_(\d+)\.pdf/);
    const srnValue = srnMatch ? srnMatch[1] : "";
    console.log(`SRN extracted from PDF (${flowLabel}): ${srnValue}`);

    fs.appendFileSync(currentUrlLogFile, `SRN: ${srnValue} (${flowLabel})\n`);
    fs.appendFileSync(
      "./test-data/srn-permanent-log.txt",
      `[${new Date().toISOString()}] Loop ${i} | SRN: ${srnValue} | ${flowLabel}\n`,
    );

    await page.goto("https://eds-uat.hasil.gov.my/Home/Index");
    await page.getByRole("heading", { name: "Senarai Permohonan" }).click();
    await page.getByRole("cell", { name: "LHDNM Proses" }).first().click();

    console.log("[" + i + "] → HITS: Login PR officer...");
    //HITS SIDE
    await page.goto("https://hitspre2.hasil.gov.my/Dashboard/Login");
    await page.waitForTimeout(3000);
    await page.reload();

    await page.goto("https://hitspre2.hasil.gov.my/Dashboard/Login");

    await page.waitForTimeout(5000);
    await page
      .locator(".login-screen")
      .waitFor({ state: "visible", timeout: 20000 });
    await page.locator(".login-screen").click();

    await page.locator("#Input_UsernameVal").click();
    await page
      .locator("#Input_UsernameVal")
      .fill("userstds_pahang_pr@hasil.gov.my");
    await page.locator("#Input_UsernameVal").click();
    await page.locator("#Input_PasswordVal").click();
    await page.locator("#Input_PasswordVal").fill("900101019039");
    await page.getByRole("button", { name: "Login" }).click();
    await page.waitForTimeout(2000);
    await page.goto("https://hitspre2.hasil.gov.my/HITS_DT/Dashboard_Taksiran");

    await page.waitForTimeout(2000);
    await page.goto(
      "https://hitspre2.hasil.gov.my/HITS_DT/carian_dashboard?SRN2=0",
    );
    await page.waitForTimeout(2000);
    await page
      .getByRole("radio", { name: "No TIN" })
      .waitFor({ state: "visible", timeout: 20000 });
    await page.getByRole("radio", { name: "No TIN" }).check();
    await page.getByRole("radio", { name: "No. Rujukan Setem" }).check();
    await page.getByPlaceholder(" ").click();
    await page.getByPlaceholder(" ").click();
    await page.getByPlaceholder(" ").fill(srnValue);
    await page.getByRole("button", { name: " Cari" }).click();

    // Capture Nama Pemegang SRN
    await page.waitForTimeout(2000);
    const namaPemegangElement = await page.locator(
      'div.columns-item:has-text("Nama Pemegang SRN") + div.columns-item span[data-expression][style*="font-weight: bold"]',
    );
    await namaPemegangElement.waitFor({ state: "visible", timeout: 20000 });
    const namaPemegang = await namaPemegangElement.textContent();
    const namaPemegangValue = namaPemegang?.trim() || "";
    console.log(`Nama Pemegang SRN: ${namaPemegangValue}`);
    fs.appendFileSync(
      currentUrlLogFile,
      `Nama Pemegang SRN: ${namaPemegangValue}\n`,
    );
    fs.appendFileSync(
      "./test-data/srn-permanent-log.txt",
      `[${new Date().toISOString()}] Loop ${i} | Nama: ${namaPemegangValue}\n`,
    );

    const usersData = JSON.parse(
      fs.readFileSync("./test-data/users_pre2.json", "utf-8"),
    );

    const user: any = usersData.find(
      (row: any) => row.nama?.toUpperCase() === namaPemegangValue.toUpperCase(),
    );

    if (!user) {
      throw new Error(`User credentials not found for: ${namaPemegangValue}`);
    }

    console.log(`Found user credentials - Username: ${user.loginId}`);

    // Logout from HITS
    await page.locator(".submenu-icon").click();
    await page.getByRole("link", { name: " Log Keluar" }).click();
    await page.waitForTimeout(5000);

    console.log(
      "[" + i + "] → HITS: Login pemegang SRN (" + user.loginId + ")...",
    );
    // Login as SRN holder
    await page
      .locator("#Input_UsernameVal")
      .waitFor({ state: "visible", timeout: 20000 });
    await page.locator("#Input_UsernameVal").click();
    await page.locator("#Input_UsernameVal").fill(user.loginId);
    await page.locator("#Input_PasswordVal").click();
    await page.locator("#Input_PasswordVal").fill(user.password);
    await page.getByRole("button", { name: "Login" }).click();
    await page.waitForTimeout(3000);

    await page.goto("https://hitspre2.hasil.gov.my/HITS_DT/Dashboard_Taksiran");

    await page.waitForTimeout(5000);
    await page.goto(
      "https://hitspre2.hasil.gov.my/HITS_DT/carian_dashboard?SRN2=0",
    );
    await page.waitForTimeout(2000);
    await page.getByRole("radio", { name: "No TIN" }).check();
    await page.getByRole("radio", { name: "No. Rujukan Setem" }).check();
    await page.getByPlaceholder(" ").click();
    await page.getByPlaceholder(" ").click();
    await page.getByPlaceholder(" ").fill(srnValue);
    await page.getByRole("button", { name: " Cari" }).click();
    await page.waitForTimeout(2000);
    await page
      .getByText("Negeri")
      .waitFor({ state: "visible", timeout: 20000 });
    await page.getByText("Negeri").click();
    await page
      .getByText("No. Rujukan Setem (SRN)")
      .waitFor({ state: "visible", timeout: 20000 });
    await page.getByText("No. Rujukan Setem (SRN)").click();
    await page
      .getByLabel("Maklumat Permohonan Penyeteman")
      .getByText("Status")
      .click();
    await page
      .getByLabel("Maklumat Permohonan Penyeteman")
      .getByText("Jenis Penyeteman")
      .click();
    await page.getByText("Nama Surat Cara").click();
    await page.getByText("Nama Pemegang SRN").click();
    await page
      .getByRole("button", { name: "Senarai Taksiran" })
      .waitFor({ state: "visible", timeout: 20000 });
    await page.getByRole("button", { name: "Senarai Taksiran" }).click();
    await page.waitForTimeout(2000);
    await page.getByRole("button", { name: "Senarai Taksiran" }).click();
    await page.waitForTimeout(4000);
    await page.locator("tr.table-row").nth(1).click();
    await page.waitForTimeout(5000);
    await page
      .getByRole("button", { name: "Sedia Untuk Taksiran Duti" })
      .waitFor({ state: "visible", timeout: 20000 });
    await page
      .getByRole("button", { name: "Sedia Untuk Taksiran Duti" })
      .click();
    await page.waitForTimeout(2000);
    await page
      .getByText("Pengesahan Tindakan")
      .waitFor({ state: "visible", timeout: 20000 });
    await page.getByText("Pengesahan Tindakan").click();
    await page.waitForTimeout(3000);
    await page.getByText("Adakah Anda Ingin Teruskan").click();
    await page.waitForTimeout(3000);
    await page
      .getByRole("button", { name: "Ya" })
      .waitFor({ state: "visible", timeout: 20000 });
    await page.getByRole("button", { name: "Ya" }).click();
    await page.waitForTimeout(5000);
    if (await page.getByRole("button", { name: "Ya" }).isVisible()) {
      await page.getByRole("button", { name: "Ya" }).click();
      await page.waitForTimeout(2000);
    }

    await page
      .getByRole("button", { name: "Prebiu Notis" })
      .waitFor({ state: "visible", timeout: 20000 });
    await page.getByRole("button", { name: "Prebiu Notis" }).click();
    await page.waitForTimeout(5000);

    await page
      .locator("i.fa-times")
      .waitFor({ state: "visible", timeout: 20000 });
    await page.locator("i.fa-times").click();
    await page.waitForTimeout(2000);

    await page
      .getByRole("button", { name: "Hantar" })
      .waitFor({ state: "visible", timeout: 20000 });
    await page.getByRole("button", { name: "Hantar" }).click();
    await page.waitForTimeout(2000);
    await page
      .getByRole("button", { name: "Ya" })
      .waitFor({ state: "visible", timeout: 20000 });
    await page.getByRole("button", { name: "Ya" }).click();
    await page.waitForTimeout(5000);
    await page.goto(
      "https://hitspre2.hasil.gov.my/HITS_DT/carian_dashboard?SRN2=0",
    );
    await page.waitForTimeout(2000);
    await page
      .getByPlaceholder(" ")
      .waitFor({ state: "visible", timeout: 20000 });
    await page.getByPlaceholder(" ").click();
    await page.getByPlaceholder(" ").fill(srnValue);
    await page
      .getByRole("button", { name: " Cari" })
      .waitFor({ state: "visible", timeout: 20000 });
    await page.getByRole("button", { name: " Cari" }).click();
    await page.waitForTimeout(3000);

    // Capture Nama Pemegang SRN for endorsement
    await page.waitForTimeout(2000);
    const namaPemegangElementEndorse = await page.locator(
      'div.columns-item:has-text("Nama Pemegang SRN") + div.columns-item span[data-expression][style*="font-weight: bold"]',
    );
    const namaPemegangEndorse = await namaPemegangElementEndorse.textContent();
    const namaPemegangValueEndorse = namaPemegangEndorse?.trim() || "";
    console.log(`Nama Pemegang SRN (Endorsement): ${namaPemegangValueEndorse}`);
    fs.appendFileSync(
      currentUrlLogFile,
      `Nama Pemegang SRN (Endorsement): ${namaPemegangValueEndorse}\n`,
    );
    fs.appendFileSync(
      "./test-data/srn-permanent-log.txt",
      `[${new Date().toISOString()}] Loop ${i} | Endorsement Nama: ${namaPemegangValueEndorse}\n`,
    );

    const usersDataEndorse = JSON.parse(
      fs.readFileSync("./test-data/users_pre2.json", "utf-8"),
    );

    const userEndorse: any = usersDataEndorse.find(
      (row: any) =>
        row.nama?.toUpperCase() === namaPemegangValueEndorse.toUpperCase(),
    );

    if (!userEndorse) {
      throw new Error(
        `User credentials not found for endorsement: ${namaPemegangValueEndorse}`,
      );
    }

    console.log(
      `Found user credentials for endorsement - Username: ${userEndorse.loginId}`,
    );

    // Logout from HITS
    await page.locator(".submenu-icon").click();
    await page.getByRole("link", { name: " Log Keluar" }).click();
    await page.waitForTimeout(5000);

    console.log("[" + i + "] → HITS: Indorsmen...");
    // Login as endorsement user
    await page
      .locator("#Input_UsernameVal")
      .waitFor({ state: "visible", timeout: 20000 });
    await page.locator("#Input_UsernameVal").click();
    await page.locator("#Input_UsernameVal").fill(userEndorse.loginId);
    await page.locator("#Input_PasswordVal").click();
    await page.locator("#Input_PasswordVal").fill(userEndorse.password);
    await page.getByRole("button", { name: "Login" }).click();
    await page.waitForTimeout(4000);

    await page.goto(
      "https://hitspre2.hasil.gov.my/HITS_DT/carian_dashboard?SRN2=0",
    );
    await page.waitForTimeout(2000);
    await page.getByRole("radio", { name: "No TIN" }).check();
    await page.getByRole("radio", { name: "No. Rujukan Setem" }).check();
    await page.getByPlaceholder(" ").click();
    await page.getByPlaceholder(" ").fill(srnValue);
    await page.getByRole("button", { name: " Cari" }).click();
    await page.waitForTimeout(3000);

    await page.locator("tr.table-row").nth(1).click();
    await page.waitForTimeout(3000);
    //await page.getByText("Tindakan Indorsmen").click();
    await page.waitForTimeout(2000);
    await page.getByText("Tidak Indors").click();
    await page.getByText("Indors", { exact: true }).click();
    await page.getByRole("button", { name: "Hantar" }).click();
    await page
      .getByText("Pengesahan Tindakan")
      .waitFor({ state: "visible", timeout: 20000 });
    await page.getByText("Pengesahan Tindakan").click();
    await page.waitForTimeout(2000);

    await page.getByRole("button", { name: "Ya" }).click();

    await page.waitForTimeout(7000);
    await page.goto(
      "https://hitspre2.hasil.gov.my/HITS_DT/carian_dashboard?SRN2=0",
    );

    // Save progress after successful iteration
    fs.writeFileSync(progressFile, i.toString());
    console.log(`Progress saved: iteration ${i} completed`);
  }
});
