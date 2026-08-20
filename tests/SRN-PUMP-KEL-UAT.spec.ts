import { test } from "@playwright/test";
import * as fs from "fs";

test.use({
  browserName: "chromium",
  channel: "chrome",
  headless: false,
});

function getCurrentDate(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
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
    label: "BURACK VANASAPATI SDN BHD)",
    clickSequence: [
      { text: "Individu", exact: true }, // expand Firma Pengurusan
      // { text: "AL NAZ CURRY HOUSE ", exact: true }, // expand Firma Ejen Duti Setem (nested)
      //{ text: "LO CHI SHING", exact: true }, // select the company
    ],
  },
];
// ─────────────────────────────────────────────────────────────────────────────

test("test", async ({ page }, testInfo) => {
  test.setTimeout(4 * 60 * 60 * 1000);

  const browserTag = testInfo.project.name;

  const client = await page.context().newCDPSession(page);

  const currentUrlLogFile = `./test-data/current-url-kel-uat-${browserTag}.txt`;
  fs.writeFileSync(
    currentUrlLogFile,
    "Stamping Submission URLs (KEL UAT)\n===================================\n\n",
  );

  fs.appendFileSync(
    "./test-data/srn-permanent-log.txt",
    `\n=== KEL-UAT Run started: ${new Date().toISOString()} ===\n`,
  );

  const progressFile = `./test-data/progress-SRN-PUMP-KEL-UAT-${browserTag}.txt`;
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
    } catch {
      console.log("Could not read progress file, starting from iteration 1");
    }
  }

  // ── Login once before the loop ──────────────────────────────────────────────
  await client.send("Network.clearBrowserCache");
  await client.send("Network.clearBrowserCookies");

  await page.goto("https://mytax-dev.hasil.gov.my/web/");
  await page.waitForTimeout(3000);
  await page.reload();
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
    .fill("740726055400");
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
    .fill("Password123");
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
  // ────────────────────────────────────────────────────────────────────────────

  for (let i = startIteration; i <= 2000; i++) {
    const peranan = PERANANS[(i - 1) % PERANANS.length];

    // Alternate penalty percentage per outer iteration: odd = 20%, even = 10%
    const isPenalty20 = i % 2 === 1;
    const penaltyDate = isPenalty20 ? "01/01/2026" : "01/05/2026";
    const penaltyPct = isPenalty20 ? "20%" : "10%";

    const subFlows = [
      {
        docTitle: "UAT OBJECTION RLMB",
        dateToUse: getCurrentDate(),
        flowLabel: "NORMAL",
      },
      {
        docTitle: `UAT OBJECTION RP (${penaltyPct})`,
        dateToUse: penaltyDate,
        flowLabel: `PENALTY ${penaltyPct}`,
      },
      {
        docTitle: "UAT OBJECTION RT Unpaid",
        dateToUse: getCurrentDate(),
        flowLabel: "NORMAL",
      },
      {
        docTitle: "UAT OBJECTION RT paid",
        dateToUse: getCurrentDate(),
        flowLabel: "NORMAL",
      },
      {
        docTitle: "UAT OBJECTION RT Pengecualian",
        dateToUse: getCurrentDate(),
        flowLabel: "NORMAL",
      },
    ];

    console.log(
      `--- Iteration ${i} | peranan: ${peranan.label} | penalty: ${penaltyPct} ---`,
    );

    // ── Close any extra tabs from previous EDS session ───────────────────────
    const allPages = page.context().pages();
    for (const p of allPages.slice(1)) await p.close();
    page = allPages[0];

    // ── Navigate to MyTax dashboard and change peranan ───────────────────────
    await page.goto("https://mytax-dev.hasil.gov.my/web/dashboard-content");
    await page.waitForTimeout(3000);

    // Click the blue Pilihan Peranan div to open the modal
    const pilihBtn = page.locator(".ic-container").first();
    await pilihBtn.waitFor({ state: "visible", timeout: 20000 });
    await pilihBtn.click();
    await page.waitForTimeout(1000);

    // Click through the peranan options inside the modal.
    // Some texts (e.g. "Individu") also appear in the nav bar — use .last() to
    // target the modal item, which always renders after the nav in DOM order.
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
    // If EDS loaded in the same tab, page is already there.
    // If neither, the sub-flow's page.goto(...) will navigate directly.
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

    // ── 5 sub-flows ──────────────────────────────────────────────────────────
    for (let subIdx = 0; subIdx < subFlows.length; subIdx++) {
      const { docTitle, dateToUse, flowLabel } = subFlows[subIdx];
      console.log(
        `--- Loop ${i}.${subIdx + 1}/5 --- [${flowLabel}] date=${dateToUse} name="${docTitle}"`,
      );

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
      await page.locator("#DocTitleStep0").fill(docTitle);
      await page
        .getByRole("textbox", { name: "dd/MM/yyyy" })
        .first()
        .waitFor({ state: "visible", timeout: 20000 });
      await page.getByRole("textbox", { name: "dd/MM/yyyy" }).first().click();
      await page
        .getByRole("textbox", { name: "dd/MM/yyyy" })
        .first()
        .fill(dateToUse);
      await page
        .getByRole("textbox", { name: "dd/MM/yyyy" })
        .first()
        .press("Enter");
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

      // Detect which party type was auto-selected, then fill empty fields only
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
          if (!v.trim()) {
            await page.locator(sel).fill(val);
          }
        };
        await fillInd(
          'input[name="StampingForm.FormAIndividualList[0].TelNo"]',
          "0199184982",
        );
        const emailInd = await page
          .locator("#fld-email-ind-0Step1")
          .inputValue()
          .catch(() => "");
        if (!emailInd.trim())
          await page.locator("#fld-email-ind-0Step1").fill("uat@gmail.com");
        const addr1Ind = await page
          .locator('input[name="StampingForm.FormAIndividualList[0].Addr1"]')
          .inputValue()
          .catch(() => "");
        if (!addr1Ind.trim()) {
          await page
            .locator('input[name="StampingForm.FormAIndividualList[0].Addr1"]')
            .fill("Unit 14-05, Level 14");
          await page
            .locator('input[name="StampingForm.FormAIndividualList[0].Addr2"]')
            .fill("Menara TH Uptown");
          await page
            .locator('input[name="StampingForm.FormAIndividualList[0].Addr3"]')
            .fill("No. 3, Jalan SS 21/39");
        }
        await fillInd(
          'input[name="StampingForm.FormAIndividualList[0].Postcode"]',
          "47400",
        );
      } else if (formAIsSyarikat) {
        const fillCom = async (sel: string, val: string) => {
          const v = await page
            .locator(sel)
            .inputValue()
            .catch(() => "");
          if (!v.trim()) {
            await page.locator(sel).fill(val);
          }
        };
        await page.locator("#KategoriPembayarDuti").selectOption("4");
        await page
          .locator(
            'input[name="StampingForm.FormACompanyList[0].NewCompanyRegistrationNo"]',
          )
          .fill("200401032872");
        await page
          .locator("#step1_div_NewCompanyRegistrationNo")
          .getByRole("button", { name: "Semak" })
          .click();
        await page.waitForTimeout(3000);
        await fillCom(
          'input[name="StampingForm.FormACompanyList[0].TelNo"]',
          "0199184982",
        );
        const emailCom = await page
          .locator("#fld-email-com-0Step1")
          .inputValue()
          .catch(() => "");
        if (!emailCom.trim())
          await page.locator("#fld-email-com-0Step1").fill("uat@gmail.com");
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
      }

      await page.waitForTimeout(1000);
      await page.getByRole("button", { name: "Seterusnya " }).click();

      await page
        .getByRole("radio", { name: "Kerajaan / Badan Berkanun /" })
        .check();
      await page
        .locator('input[name="StampingForm.FormBGovList[0].GovName"]')
        .click();
      await page
        .locator('input[name="StampingForm.FormBGovList[0].GovName"]')
        .fill("Lembaga Ahli Geologi Malaysia");
      await page.getByRole("listitem").click();
      await page
        .locator('input[name="StampingForm.FormBGovList[0].GovTel"]')
        .click();
      await page
        .locator('input[name="StampingForm.FormBGovList[0].GovTel"]')
        .fill("0199999999");
      await page.locator("#govEmail_1").click();
      await page.locator("#govEmail_1").fill("uat2@gmail.com");
      await page.locator("#govAdd1_1").click();
      await page.locator("#govAdd1_1").fill("Aras 8, Menara PjH");
      await page.locator("#govAdd1_1").press("Tab");
      await page.locator("#govAdd2_1").fill("No. 2, Jalan Tun Abdul Razak");
      await page.locator("#govAdd2_1").press("Tab");
      await page.locator("#govAdd3_1").fill("Presint 2");
      await page
        .getByLabel("B. PIHAK KEDUA")
        .getByText(
          "Nama Seperti Dalam Surat Cara* Nombor Pendaftaran Pertubuhan / Persatuan",
        )
        .click();
      await page.locator("#govPoscode_1").click();
      await page.locator("#govPoscode_1").fill("62100");
      await page.waitForTimeout(3000);

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
      await page.locator("#section1 input[placeholder='dd/MM/yyyy']").click();
      await page.waitForTimeout(3000);
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
        .fill("SYARIKAT XYZ SDN BHD");
      await page.locator("#StampingForm_formC_2_CompRegOld").fill("2331");
      await page.getByText("Nombor Pendaftaran Syarikat *").click();
      await page.locator("#StampingForm_formC_2_CompRegOld").click();
      await page.locator("#StampingForm_formC_2_CompRegOld").fill("23311");
      await page.locator("#StampingForm_formC_2_CompRegNew").click();
      await page.locator("#StampingForm_formC_2_CompRegNew").fill("11231231");
      await page.getByText("Aktiviti Utama Syarikat *").click();
      await page.locator("#compAct").selectOption("13");
      await page.locator("#StampingForm_formC_2_CompAddr1").click();
      await page
        .locator("#StampingForm_formC_2_CompAddr1")
        .fill("NO 886 JALAN BUKIT PUTERI 11/18");
      await page.locator("#StampingForm_formC_2_CompAddr2").click();
      await page
        .locator("#StampingForm_formC_2_CompAddr2")
        .fill("BANDAR PUTERI JAYA");
      await page.locator("#StampingForm_formC_2_CompPostcode").click();
      await page.locator("#StampingForm_formC_2_CompPostcode").fill("08000");
      await page.waitForTimeout(5000);

      await page.getByRole("button", { name: "Seterusnya " }).click();

      await page
        .locator("h5.mb-3.fw-bold", { hasText: "Peremitan / Pengecualian" })
        .waitFor({ state: "visible", timeout: 10000 });
      await page.getByRole("button", { name: "Seterusnya " }).click();

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

      // Check "Saya sebagai" radio — fill "Diri Sendiri" only if none selected
      const sayaSebagaiChecked = await page
        .locator('input[name="StampingForm.stampingData.FrmAck.Rep"]')
        .evaluateAll((inputs: any[]) => inputs.some((el) => el.checked));
      if (!sayaSebagaiChecked) {
        await page.locator("#wakilDiri").check();
      }

      await page
        .getByRole("radio", { name: "Pihak Pertama", exact: true })
        .check();
      await page.getByRole("button", { name: "Hantar " }).click();
      await page.getByRole("button", { name: "Batal" }).click();
      await page.getByRole("button", { name: "Hantar " }).click();
      await page.getByRole("button", { name: "Ya, Hantar" }).click();

      await page
        .getByRole("button", { name: "Kembali ke Paparan Utama" })
        .waitFor({ state: "visible", timeout: 20000 });
      await page.waitForTimeout(2000);
      await page
        .getByText("Cetak Slip Pengesahan")
        .waitFor({ state: "visible", timeout: 20000 });

      const downloadPromise = page.waitForEvent("download");
      await page.getByText("Cetak Slip Pengesahan").click();
      const download = await downloadPromise;

      const filename = download.suggestedFilename();
      const srnMatch = filename.match(/Slip_Pengesahan_(\d+)\.pdf/);
      const srnValue = srnMatch ? srnMatch[1] : "";
      console.log(`SRN extracted from PDF: ${srnValue}`);

      fs.appendFileSync(
        currentUrlLogFile,
        `Loop ${i}.${subIdx + 1} | peranan: ${peranan.label} | SRN: ${srnValue} | ${docTitle} | ${flowLabel}\n`,
      );
      fs.appendFileSync(
        "./test-data/srn-permanent-log.txt",
        `[${new Date().toISOString()}] Loop ${i}.${subIdx + 1} | peranan: ${peranan.label} | SRN: ${srnValue} | ${flowLabel} | ${docTitle}\n`,
      );
    } // end subFlows loop

    // Save progress after all 5 sub-flows complete
    fs.writeFileSync(progressFile, i.toString());
    console.log(`Progress saved: iteration ${i} completed (5 SRNs submitted)`);
  }
});
