import { test, chromium, firefox, webkit } from "@playwright/test";
import * as fs from "fs";

test.use({
  headless: false,
});

const PENALTY_DATE_JAN = "01/01/2026";
const PENALTY_DATE_MAY = "01/05/2026";
const MAX_PENALTY_AMOUNT = 843000000.0;

// Flow cycle: 0=NORMAL, 1=PENALTY_10(MAY), 2=PENALTY_20(JAN)
const FLOW_CYCLE = ["NORMAL", "PENALTY_10", "PENALTY_20"] as const;
type FlowType = (typeof FLOW_CYCLE)[number];

function getCurrentDate(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function getFlowParams(flow: FlowType): {
  dateToUse: string;
  docTitlePrefix: string;
  flowLabel: string;
  amountToUse: number;
} {
  if (flow === "NORMAL") {
    const randomAmount =
      Math.floor(Math.random() * (900000000 - 100000000 + 1)) + 100000000;
    return {
      dateToUse: getCurrentDate(),
      docTitlePrefix: "",
      flowLabel: "NO PENALTY",
      amountToUse: randomAmount,
    };
  } else if (flow === "PENALTY_10") {
    return {
      dateToUse: PENALTY_DATE_MAY,
      docTitlePrefix: "Penalti 10% ",
      flowLabel: "PENALTI 10% (MAY)",
      amountToUse: MAX_PENALTY_AMOUNT,
    };
  } else {
    return {
      dateToUse: PENALTY_DATE_JAN,
      docTitlePrefix: "Penalti 20% ",
      flowLabel: "PENALTI 20% (JAN)",
      amountToUse: MAX_PENALTY_AMOUNT,
    };
  }
}

test("test", async ({ page }, testInfo) => {
  test.setTimeout(4 * 60 * 60 * 1000); // 4 hours

  const browserTag = testInfo.project.name;

  const client = await page.context().newCDPSession(page);

  // Load addresses data
  const addressesData = JSON.parse(
    fs.readFileSync("./test-data/addresses_my.json", "utf-8"),
  );
  const addresses = addressesData.INDIVIDU;

  // Clear the URL log file before starting
  const currentUrlLogFile = `./test-data/current-url-kel-combined-${browserTag}.txt`;
  fs.writeFileSync(
    currentUrlLogFile,
    "Stamping Submission URLs (KEL COMBINED: NORMAL → PENALTY 10 → PENALTY 20)\n============================================================================\n\n",
  );

  // Write a run separator to the permanent log
  const runTimestamp = new Date().toISOString();
  fs.appendFileSync(
    "./test-data/srn-permanent-log.txt",
    `\n=== Run started: ${runTimestamp} (KEL COMBINED) ===\n`,
  );

  // Progress tracking — each step is one submission.
  // stepNumber drives both iteration label and flow type:
  //   flow = FLOW_CYCLE[(stepNumber - 1) % 3]
  //
  // Crash recovery: progress is only saved AFTER full success.
  // If crash happens mid-PENALTY_10 (step 5), file still has 4.
  // On restart, next step = 5 → flow = PENALTY_10 ✓
  const progressFile = `./test-data/progress-SRN-PUMP-KEL-COMBINED-${browserTag}.txt`;
  let startStep = 1;

  if (fs.existsSync(progressFile)) {
    try {
      const lastCompleted = parseInt(
        fs.readFileSync(progressFile, "utf-8").trim(),
        10,
      );
      if (!isNaN(lastCompleted) && lastCompleted > 0) {
        startStep = lastCompleted + 1;
        const resumeFlow = FLOW_CYCLE[(startStep - 1) % FLOW_CYCLE.length];
        console.log(
          `Resuming from step ${startStep} (last completed: ${lastCompleted}) — flow: ${resumeFlow}`,
        );
        fs.appendFileSync(
          "./test-data/srn-permanent-log.txt",
          `[${new Date().toISOString()}] Resuming from step ${startStep} — flow: ${resumeFlow}\n`,
        );
      }
    } catch (err) {
      console.log("Could not read progress file, starting from step 1");
    }
  }

  for (let step = startStep; step <= 6000; step++) {
    const flow = FLOW_CYCLE[(step - 1) % FLOW_CYCLE.length];
    const { dateToUse, docTitlePrefix, flowLabel, amountToUse } =
      getFlowParams(flow);

    console.log(`--- Step ${step} --- [${flowLabel}] date=${dateToUse}`);

    // === Fresh session per iteration: close leftover tabs, clear cache + cookies, re-login ===
    const allPages = page.context().pages();
    for (const p of allPages.slice(1)) await p.close();
    page = allPages[0];

    await client.send("Network.clearBrowserCache");
    await client.send("Network.clearBrowserCookies");

    await page.goto("https://mytax-dev.hasil.gov.my/web/");
    await page.waitForTimeout(3000);
    await page.reload();
    await page.waitForTimeout(6000);

    // If still logged in (redirected to dashboard), log out first
    const logoutBtn = page.locator("p.logout");
    const alreadyLoggedIn = await logoutBtn.isVisible().catch(() => false);
    if (alreadyLoggedIn) {
      await logoutBtn.click();
      await page
        .locator("b", { hasText: "Log Keluar Berjaya" })
        .waitFor({ state: "visible", timeout: 20000 });

      await page.waitForTimeout(2000);
      await page.goto("https://mytax-dev.hasil.gov.my/web/");
      await page.waitForTimeout(5000);
    }

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

    // Notification modal only appears on first login of a fresh session — skip if absent
    try {
      await page
        .getByText("Mulai 1 Januari 2023, format")
        .waitFor({ state: "visible", timeout: 8000 });
      await page.getByText("Mulai 1 Januari 2023, format").click();
      await page.getByRole("button", { name: "Ok" }).click();
    } catch {
      // modal did not appear, continue
    }

    // Wait for dashboard to fully load before interacting with the menu
    await page.waitForTimeout(5000);

    await page
      .getByText("Perkhidmatan ezHasil")
      .waitFor({ state: "visible", timeout: 20000 });
    await page.getByText("Perkhidmatan ezHasil").click();
    await page.waitForTimeout(2000);
    await page
      .getByText("Duti Setem 2.0 (UAT) e-Duti")
      .waitFor({ state: "visible", timeout: 20000 });
    await page.getByText("Duti Setem 2.0 (UAT) e-Duti").click();

    const [newPage] = await Promise.all([
      page.context().waitForEvent("page"),
      page.getByRole("link", { name: "e-Duti Setem" }).click(),
    ]);

    await newPage.waitForLoadState();
    page = newPage;
    await page.waitForTimeout(7000);
    // =========================================================================================

    await page.goto("https://eds-uat.hasil.gov.my/stamping/upload");
    await page.waitForTimeout(5000);
    await page
      .getByRole("button", { name: "Faham" })
      .waitFor({ state: "visible", timeout: 20000 });
    await page.getByRole("button", { name: "Faham" }).click();
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
    await page
      .locator("#DocTitleStep0")
      .fill(`${docTitlePrefix}FOR EVERYONE USE.  ${step}`);
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

    const randomAddrA0 =
      addresses[Math.floor(Math.random() * addresses.length)];

    await page
      .locator('input[name="StampingForm.FormAIndividualList[0].TelNo"]')
      .click();
    await page
      .locator('input[name="StampingForm.FormAIndividualList[0].TelNo"]')
      .fill("0199184986");
    await page.locator("#fld-email-ind-0Step1").click();
    await page.locator("#fld-email-ind-0Step1").fill("syed@gmail.com");
    await page
      .locator('input[name="StampingForm.FormAIndividualList[0].Addr1"]')
      .click();
    await page
      .locator('input[name="StampingForm.FormAIndividualList[0].Addr1"]')
      .fill(randomAddrA0.Addr1);
    await page
      .locator('input[name="StampingForm.FormAIndividualList[0].Addr2"]')
      .click();
    await page
      .locator('input[name="StampingForm.FormAIndividualList[0].Addr2"]')
      .fill(randomAddrA0.Addr2);
    await page
      .locator('input[name="StampingForm.FormAIndividualList[0].Addr3"]')
      .click();
    await page
      .locator('input[name="StampingForm.FormAIndividualList[0].Addr3"]')
      .fill(randomAddrA0.Addr3);
    await page
      .locator('input[name="StampingForm.FormAIndividualList[0].Postcode"]')
      .click();
    await page
      .locator('input[name="StampingForm.FormAIndividualList[0].Postcode"]')
      .fill("15350");

    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: "Seterusnya " }).click();

    //Form
    /* await page
      .getByRole("radio", { name: "Syarikat / Perniagaan Milikan" })
      .check();
    await page
      .locator('input[name="StampingForm.FormBCompanyList[0].CompanyName"]')
      .click();
    await page
      .locator('input[name="StampingForm.FormBCompanyList[0].CompanyName"]')
      .fill("TST SYAIRKAT");
    await page
      .locator('select[name="StampingForm.FormBCompanyList[0].CatTaxId"]')
      .selectOption("4");
    await page
      .locator(
        'input[name="StampingForm.FormBCompanyList[0].OldCompanyRegistrationNo"]',
      )
      .click();
    await page
      .locator(
        'input[name="StampingForm.FormBCompanyList[0].OldCompanyRegistrationNo"]',
      )
      .fill("200801028322");
    await page.getByRole("button", { name: "Semak" }).first().click();
    await page
      .locator(
        'input[name="StampingForm.FormBCompanyList[0].NewCompanyRegistrationNo"]',
      )
      .click();
    await page
      .locator(
        'input[name="StampingForm.FormBCompanyList[0].NewCompanyRegistrationNo"]',
      )
      .fill("200801028322");
    await page
      .locator("#step2_div_NewCompanyRegistrationNo")
      .getByRole("button", { name: "Semak" })
      .click();
    await page
      .locator('input[name="StampingForm.FormBCompanyList[0].TelNo"]')
      .click();
    await page
      .locator('input[name="StampingForm.FormBCompanyList[0].TelNo"]')
      .fill("0199184988");
    await page
      .locator('input[name="StampingForm.FormBCompanyList[0].Email"]')
      .click();
    await page
      .locator('input[name="StampingForm.FormBCompanyList[0].Email"]')
      .fill("syed@gmaad.com");
    await page
      .locator('input[name="StampingForm.FormBCompanyList[0].ADDR1"]')
      .click();
    await page
      .locator('input[name="StampingForm.FormBCompanyList[0].ADDR1"]')
      .fill("2123");
    await page
      .locator('input[name="StampingForm.FormBCompanyList[0].ADDR2"]')
      .click();
    await page
      .locator('input[name="StampingForm.FormBCompanyList[0].ADDR2"]')
      .fill("1231");
    await page
      .locator('input[name="StampingForm.FormBCompanyList[0].ADDR3"]')
      .click();
    await page
      .locator('input[name="StampingForm.FormBCompanyList[0].ADDR3"]')
      .fill("1231");
    await page
      .locator('input[name="StampingForm.FormBCompanyList[0].Postcode"]')
      .click();
    await page
      .locator('input[name="StampingForm.FormBCompanyList[0].Postcode"]')
      .fill("31500"); */
    /* await page
      .locator('input[name="StampingForm.FormBIndividualList[0].Name"]')
      .click();
    await page
      .locator('input[name="StampingForm.FormBIndividualList[0].Name"]')
      .fill("DIA SAPUTRI");
    await page.locator("#IsCitizen_1").selectOption("1");
    await page
      .locator('input[name="StampingForm.FormBIndividualList[0].IcNo"]')
      .click();
    await page
      .locator('input[name="StampingForm.FormBIndividualList[0].IcNo"]')
      .fill("590511025908");
    await page.getByRole("button", { name: "Semak" }).click();
    await page
      .locator('input[name="StampingForm.FormBIndividualList[0].TelNo"]')
      .click();
    await page
      .locator('input[name="StampingForm.FormBIndividualList[0].TelNo"]')
      .fill("0199184966");
    await page
      .locator('input[name="StampingForm.FormBIndividualList[0].TelNo"]')
      .press("Tab");
    await page.getByRole("button", { name: "E-mel *" }).press("Tab");
    await page.locator("#fld-email-ind-1-Step2").fill("syed@gmail.com");
    await page
      .locator('input[name="StampingForm.FormBIndividualList[0].Addr1"]')
      .click();
    await page
      .locator('input[name="StampingForm.FormBIndividualList[0].Addr1"]')
      .fill("Sungai Besi Expressway");
    await page
      .locator('input[name="StampingForm.FormBIndividualList[0].Addr2"]')
      .click();
    await page
      .locator('input[name="StampingForm.FormBIndividualList[0].Addr2"]')
      .fill("Cuba Rasa ");
    await page
      .locator('input[name="StampingForm.FormBIndividualList[0].Addr3"]')
      .click();
    await page
      .locator('input[name="StampingForm.FormBIndividualList[0].Addr3"]')
      .fill("W.P Kuala Loco");
    await page
      .locator('input[name="StampingForm.FormBIndividualList[0].Postcode"]')
      .click();
    await page
      .locator('input[name="StampingForm.FormBIndividualList[0].Postcode"]')
      .fill("31500"); */
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
      .fill("0199184444");
    await page.locator("#govEmail_1").click();
    await page.locator("#govEmail_1").fill("lem@gmail.com");
    await page.locator("#govAdd1_1").click();
    await page.locator("#govAdd1_1").fill("232");
    await page.locator("#govAdd1_1").press("Tab");
    await page.locator("#govAdd2_1").fill("Lembaga");
    await page.locator("#govAdd2_1").press("Tab");
    await page.locator("#govAdd3_1").fill("Geo");
    await page
      .getByLabel("B. PIHAK KEDUA")
      .getByText(
        "Nama Seperti Dalam Surat Cara* Nombor Pendaftaran Pertubuhan / Persatuan",
      )
      .click();
    await page.locator("#govPoscode_1").click();
    await page.locator("#govPoscode_1").fill("15500");
    await page.waitForTimeout(3000);

    await page.getByRole("button", { name: "Seterusnya " }).click();
    await page.waitForTimeout(2000);
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

    if (flow === "NORMAL") {
      await page
        .getByRole("textbox", { name: "0.00" })
        .fill(amountToUse.toLocaleString("en-US"));
    } else {
      await page.getByRole("textbox", { name: "0.00" }).fill(
        amountToUse.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      );
    }

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
    console.log(`SRN extracted from PDF (${flowLabel}): ${srnValue}`);

    fs.appendFileSync(
      currentUrlLogFile,
      `Step ${step} | SRN: ${srnValue} | ${flowLabel}\n`,
    );
    fs.appendFileSync(
      "./test-data/srn-permanent-log.txt",
      `[${new Date().toISOString()}] Step ${step} | SRN: ${srnValue} | ${flowLabel}\n`,
    );

    await page.goto("https://eds-uat.hasil.gov.my/Home/Index");
    await page.getByRole("heading", { name: "Senarai Permohonan" }).click();
    await page.getByRole("cell", { name: "LHDNM Proses" }).first().click();

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
      `[${new Date().toISOString()}] Step ${step} | Nama: ${namaPemegangValue}\n`,
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

    await page.locator(".submenu-icon").click();
    await page.getByRole("link", { name: " Log Keluar" }).click();
    await page.waitForTimeout(5000);

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
      `[${new Date().toISOString()}] Step ${step} | Endorsement Nama: ${namaPemegangValueEndorse}\n`,
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

    await page.locator(".submenu-icon").click();
    await page.getByRole("link", { name: " Log Keluar" }).click();
    await page.waitForTimeout(5000);

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

    // Save progress — only written after full successful completion of this step
    fs.writeFileSync(progressFile, step.toString());
    console.log(`Progress saved: step ${step} [${flowLabel}] completed`);
  }
});
