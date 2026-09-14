import { test } from "@playwright/test";
import * as fs from "fs";

test.use({
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

  await page
    .getByText("Mulai 1 Januari 2023, format")
    .waitFor({ state: "visible", timeout: 20000 });
  await page.getByText("Mulai 1 Januari 2023, format").click();
  await page.getByRole("button", { name: "Ok" }).click();
  await page.waitForTimeout(5000);

  await page
    .getByText("Perkhidmatan ezHasil")
    .waitFor({ state: "visible", timeout: 20000 });
  await page.getByText("Perkhidmatan ezHasil").click();
  await page
    .getByText("Duti Setem 2.0 (UAT) e-Duti")
    .waitFor({ state: "visible", timeout: 20000 });

  await page.getByText("Duti Setem 2.0 (UAT) e-Duti").click();

  // Wait for new tab to open when clicking e-Duti Setem
  const [newPage] = await Promise.all([
    page.context().waitForEvent("page"),
    page.getByRole("link", { name: "e-Duti Setem" }).click(),
  ]);

  // Switch to the new tab
  await newPage.waitForLoadState();
  page = newPage;

  await page.waitForTimeout(7000);

  // Clear the URL log file before starting
  const currentUrlLogFile = `./test-data/current-url-${browserTag}.txt`;
  fs.writeFileSync(
    currentUrlLogFile,
    "Stamping Submission URLs (NORMAL)\n==================================\n\n",
  );

  // Write a run separator to the permanent log
  const runTimestamp = new Date().toISOString();
  fs.appendFileSync(
    "./test-data/srn-permanent-log.txt",
    `\n=== Run started: ${runTimestamp} (KEL NORMAL) ===\n`,
  );

  // Progress tracking: Read last completed iteration
  const progressFile = `./test-data/progress-SRN-PUMP-KEL-NORMAL-${browserTag}.txt`;
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
    console.log(`--- Loop iteration ${i} of XX --- [${flowLabel}]`);

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
    await page.locator("#DocTitleStep0").fill(`OBJECTION USE.  ${i}`);
    await page
      .getByRole("textbox", { name: "dd/MM/yyyy" })
      .first()
      .waitFor({ state: "visible", timeout: 20000 });
    await page.getByRole("textbox", { name: "dd/MM/yyyy" }).first().click();
    await page
      .getByRole("textbox", { name: "dd/MM/yyyy" })
      .first()
      .fill(getCurrentDate());
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
