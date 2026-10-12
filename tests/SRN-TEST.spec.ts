import { test, chromium, firefox, webkit } from "@playwright/test";
import * as fs from "fs";
import { FormA } from "./selectors/formA";
import { FormB } from "./selectors/formB";

// Override to use Chrome browser
// browserName/channel come from the selected --project (chromium -> Chrome,
// msedge -> Edge); only force headless here.
test.use({
  browserName: "chromium",
  channel: "chrome",
  headless: false,
});

const namaList = ["Form of Transfer of Securites"];

// Format today's date as dd/MM/yyyy for "tarikh biasa"
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
const PERANANS: Array<{
  label: string;
  clickSequence: Array<{ text: string; exact?: boolean }>;
}> = [
  {
    label: "JANGAN PERGIIIIIIIII)",
    clickSequence: [
      { text: "Wakil Pengarah", exact: true },
      { text: "AL NAZ CURRY HOUSE", exact: true },
    ],
  },
];
// ─────────────────────────────────────────────────────────────────────────────

test("test", async ({ page }, testInfo) => {
  test.setTimeout(4 * 60 * 60 * 1000); // 4 hours

  // Distinguish files per browser project so Chrome and Edge running in
  // parallel don't stomp on each other's progress/log files.
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
  try { await page.reload(); } catch (_) {}
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
  const currentUrlLogFile = `./test-data/current-url-${browserTag}.txt`;
  fs.writeFileSync(
    currentUrlLogFile,
    "Stamping Submission URLs\n========================\n\n",
  );

  // Write a run separator to the permanent log
  const runTimestamp = new Date().toISOString();
  fs.appendFileSync(
    "./test-data/srn-permanent-log.txt",
    `\n=== Run started: ${runTimestamp} ===\n`,
  );

  // Loop 40 times starting from the stamping upload

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
    const dateToUse = getCurrentDate();
    const docTitlePrefix = "";
    const flowLabel = "NO PENALTY";
    console.log(
      `--- Loop iteration ${i} of XX --- [${flowLabel}] date=${dateToUse}`,
    );

    await page.goto("https://eds-uat.hasil.gov.my/stamping/upload");
    //await page.locator('a[href="/stamping/upload"]').click();
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

    //MAKLUMAT AM
    await page
      .getByText("Tempat Surat Cara Ditandatangan*")
      .waitFor({ state: "visible", timeout: 20000 });
    await page.getByText("Tempat Surat Cara Ditandatangan*").click();
    await page.locator("#DocTitleStep0").click();
    await page
      .locator("#DocTitleStep0")
      .fill(`${docTitlePrefix}FOR EVERYONE USE.  ${i}`);
    await page
      .getByRole("textbox", { name: "dd/MM/yyyy" })
      .first()
      .waitFor({ state: "visible", timeout: 20000 });
    await page.getByRole("textbox", { name: "dd/MM/yyyy" }).first().click();
    const [_dd, _mm] = dateToUse.split("/");
    const _mNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const _mName = _mNames[parseInt(_mm, 10) - 1];
    await page.getByLabel("Month").first().selectOption(String(parseInt(_mm, 10) - 1));
    await page.locator(".flatpickr-calendar.open").getByLabel(`${_mName} ${parseInt(_dd, 10)},`).click();
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
      .getByLabel("A. PIHAK PERTAMA")
      .getByText("Saya / Syarikat sebagai")
      .click();
    //END OF MAKLUMAT AM

    //BAHAGIAN A
    // =========================================================
    // Nak tambah/kurang/tukar pihak? Edit array ni je.
    // slot dan govIndex dikira auto — x perlu letak manual.
    // =========================================================
    const formAParties = [
      {
        type: "kerajaan",
        data: {
          govName: "Lembaga Arkitek Malaysia",
          govRegNo: "199301012242",
          govTINNo: "25112637040",
          govTel: "019918486",
          email: "test@gmail.com",
          govAdd1: "132 Kg",
          govAdd2: "Boy",
          govAdd3: "Iman",
          govPoscode: "70000",
        },
      },
      {
        type: "individu",
        data: {
          name: "syed",
          isCitizen: "1",
          icNo: "951004146116",
          telNo: "0199184986",
          email: "syed@gmail.com",
          addr1: "123",
          addr2: "kg",
          addr3: "boy",
          postcode: "50000",
        },
      },
      {
        type: "syarikat",
        data: {
          companyName: "NAMA SYARIKAT",
          catTaxId: "4",
          newRegNo: "199301012242",
          telNo: "0199184986",
          email: "test@gmail.com",
          addr1: "123 Jalan",
          addr2: "Kampung",
          addr3: "Bandar",
          postcode: "50000",
        },
      },
      {
        type: "syarikat",
        data: {
          companyName: "NAMA SYARIKAT",
          catTaxId: "4",
          newRegNo: "199301012242",
          telNo: "0199184986",
          email: "test@gmail.com",
          addr1: "123 Jalan",
          addr2: "Kampung",
          addr3: "Bandar",
          postcode: "50000",
        },
      },
    ] as const;

    await page
      .getByLabel("A. PIHAK PERTAMA")
      .getByText("Saya / Syarikat sebagai")
      .click();

    let govCount = 0;
    let individuCount = 0;
    let syarikatCount = 0;
    for (let p = 0; p < formAParties.length; p++) {
      const party = formAParties[p];
      // slot: pihak pertama = 0, pihak tambahan = p+1 (slot 1 reserved untuk Form B)
      const slot = p === 0 ? 0 : p + 1;

      if (p > 0) {
        await page.getByRole("button", { name: FormA.addParty }).click();
      }

      if (party.type === "individu") {
        const sel = FormA.individu(slot, individuCount);
        await page
          .getByRole("radio", { name: FormA.radio.individu })
          .last()
          .check();
        await page.waitForTimeout(500);
        await page.locator(sel.name).fill(party.data.name);
        await page.locator(sel.isCitizen).selectOption(party.data.isCitizen);
        await page.locator(sel.icNo).fill(party.data.icNo);
        await page.getByRole("button", { name: "Semak" }).last().click();
        await page.waitForTimeout(3000);
        await page.locator(sel.telNo).fill(party.data.telNo);
        await page.locator(sel.email).fill(party.data.email);
        await page.locator(sel.addr1).fill(party.data.addr1);
        await page.locator(sel.addr2).fill(party.data.addr2);
        await page.locator(sel.addr3).fill(party.data.addr3);
        await page.locator(sel.postcode).fill(party.data.postcode);
        individuCount++;
      } else if (party.type === "syarikat") {
        const sel = FormA.syarikat(slot, syarikatCount);
        await page
          .getByRole("radio", { name: FormA.radio.syarikat })
          .last()
          .check();
        await page.waitForTimeout(500);
        await page.locator(sel.companyName).fill(party.data.companyName);
        await page.locator(sel.catTaxId).selectOption(party.data.catTaxId);
        const oldRegNo =
          "oldRegNo" in party.data
            ? ((party.data as any).oldRegNo as string)
            : undefined;
        if (oldRegNo) {
          await page.locator(sel.oldRegNo).fill(oldRegNo);
          await page.getByRole("button", { name: "Semak" }).first().click();
        }
        await page.locator(sel.newRegNo).fill(party.data.newRegNo);
        await page.getByRole("button", { name: "Semak" }).last().click();
        await page.waitForTimeout(3000);
        await page.locator(sel.telNo).fill(party.data.telNo);
        await page.locator(sel.email).fill(party.data.email);
        await page.locator(sel.addr1).fill(party.data.addr1);
        await page.locator(sel.addr2).fill(party.data.addr2);
        await page.locator(sel.addr3).fill(party.data.addr3);
        await page.locator(sel.postcode).fill(party.data.postcode);
        syarikatCount++;
      } else if (party.type === "kerajaan") {
        const sel = FormA.kerajaan(govCount, slot);
        await page.getByRole("radio", { name: FormA.radio.kerajaan }).check();
        await page.locator(sel.govName).fill(party.data.govName);
        await page
          .locator("li.suggestion-item", { hasText: party.data.govName })
          .first()
          .click();
        const govRegNo =
          "govRegNo" in party.data
            ? ((party.data as any).govRegNo as string)
            : undefined;
        const govTINNo =
          "govTINNo" in party.data
            ? ((party.data as any).govTINNo as string)
            : undefined;
        if (govRegNo) await page.locator(sel.govRegNo).fill(govRegNo);
        if (govTINNo) await page.locator(sel.govTINNo).fill(govTINNo);
        await page.locator(sel.govTel).fill(party.data.govTel);
        await page.locator(sel.email).fill(party.data.email);
        await page.locator(sel.govAdd1).fill(party.data.govAdd1);
        await page.locator(sel.govAdd2).fill(party.data.govAdd2);
        await page.locator(sel.govAdd3).fill(party.data.govAdd3);
        await page.locator(sel.govPoscode).fill(party.data.govPoscode);
        govCount++;
      }
    }

    //END OF BAHAGIAN A

    await page.getByRole("button", { name: "Seterusnya " }).click();

    /*  //BAHAGIAN ABCD
    await page
      .getByRole("checkbox", { name: "Saya / Syarikat sebagai" })
      .waitFor({ state: "visible", timeout: 20000 });
    await page
      .getByRole("checkbox", { name: "Saya / Syarikat sebagai" })
      .check();
    await page
      .locator('input[name="StampingForm.FormAIndividualList[0].TelNo"]')
      .click();
    await page
      .locator('input[name="StampingForm.FormAIndividualList[0].TelNo"]')
      .press("ControlOrMeta+a");
    await page
      .locator('input[name="StampingForm.FormAIndividualList[0].TelNo"]')
      .fill("0199999999");
    await page.locator("#fld-email-ind-0Step1").click();
    await page.locator("#fld-email-ind-0Step1").press("ControlOrMeta+a");
    await page.locator("#fld-email-ind-0Step1").fill("test@gmail.com");

    await page.waitForTimeout(3000);

    await page.getByRole("button", { name: "Seterusnya " }).click(); */
    //END OF BAHAGIAN ABCD

    //BAHAGIAN B
    // =========================================================
    // Nak tambah/kurang/tukar pihak? Edit array ni je.
    // idx dikira auto — x perlu letak manual.
    // =========================================================
    await page.getByLabel("B. PIHAK KEDUA").waitFor({ state: "visible", timeout: 20000 });
    const formBParties = [
      {
        type: "individu",
        data: {
          name: "Ahmad Bin Ali",
          isCitizen: "1",
          icNo: "900101012345",
          telNo: "0123456789",
          email: "ahmad@gmail.com",
          addr1: "No 1 Jalan Test",
          addr2: "Taman Maju",
          addr3: "Bandar",
          postcode: "50000",
        },
      },
      {
        type: "kerajaan",
        data: {
          govName: "Lembaga Arkitek Malaysia",
          govRegNo: "199301012242",
          govTINNo: "25112637040",
          govTel: "0199184986",
          email: "kerajaan@gmail.com",
          govAdd1: "132 Kg",
          govAdd2: "Boy",
          govAdd3: "Iman",
          govPoscode: "70000",
        },
      },
      {
        type: "syarikat",
        data: {
          companyName: "TST SYAIRKAT",
          catTaxId: "4",
          oldRegNo: "200801028322",
          newRegNo: "200801028322",
          telNo: "0199184988",
          email: "syed@gmaad.com",
          addr1: "2123",
          addr2: "1231",
          addr3: "1231",
          postcode: "31500",
        },
      },
      {
        type: "individu",
        data: {
          name: "Siti Binti Hassan",
          isCitizen: "1",
          icNo: "951004146116",
          telNo: "0199918498",
          email: "siti@gmail.com",
          addr1: "456 Jalan Lain",
          addr2: "Kampung Baru",
          addr3: "Bandar",
          postcode: "50450",
        },
      },
    ];

    let govCountB = 0;
    let individuCountB = 0;
    let syarikatCountB = 0;
    for (let p = 0; p < formBParties.length; p++) {
      const party = formBParties[p];

      if (p > 0) {
        await page.getByRole("button", { name: FormB.addParty }).click();
        await page.waitForTimeout(500);
      }

      if (party.type === "individu") {
        const d = party.data as any;
        const sel = FormB.individu(individuCountB);
        await page
          .getByRole("radio", { name: FormB.radio.individu })
          .last()
          .check();
        await page.waitForTimeout(500);
        await page.locator(sel.name).fill(d.name);
        await page.locator(sel.isCitizen).selectOption(d.isCitizen);
        await page.locator(sel.icNo).fill(d.icNo);
        await page.getByRole("button", { name: "Semak" }).last().click();
        await page.locator(sel.telNo).fill(d.telNo);
        await page.locator(sel.email).fill(d.email);
        await page.locator(sel.addr1).fill(d.addr1);
        await page.locator(sel.addr2).fill(d.addr2);
        await page.locator(sel.addr3).fill(d.addr3);
        await page.locator(sel.postcode).fill(d.postcode);
        individuCountB++;
      } else if (party.type === "syarikat") {
        const d = party.data as any;
        const sel = FormB.syarikat(syarikatCountB);
        await page
          .getByRole("radio", { name: FormB.radio.syarikat })
          .last()
          .check();
        await page.waitForTimeout(500);
        await page.locator(sel.companyName).fill(d.companyName);
        await page.locator(sel.catTaxId).selectOption(d.catTaxId);
        if (d.oldRegNo) {
          await page.locator(sel.oldRegNo).fill(d.oldRegNo);
          await page.getByRole("button", { name: "Semak" }).first().click();
        }
        await page.locator(sel.newRegNo).fill(d.newRegNo);
        await page
          .locator(sel.newRegNoContainer)
          .getByRole("button", { name: "Semak" })
          .click();
        await page.locator(sel.telNo).fill(d.telNo);
        await page.locator(sel.email).fill(d.email);
        await page.locator(sel.addr1).fill(d.addr1);
        await page.locator(sel.addr2).fill(d.addr2);
        await page.locator(sel.addr3).fill(d.addr3);
        await page.locator(sel.postcode).fill(d.postcode);
        syarikatCountB++;
      } else if (party.type === "kerajaan") {
        const d = party.data as any;
        const sel = FormB.kerajaan(govCountB);
        await page
          .getByRole("radio", { name: FormB.radio.kerajaan })
          .last()
          .check();
        await page.waitForTimeout(500);
        await page.locator(sel.govName).fill(d.govName);
        await page
          .locator("li.suggestion-item", { hasText: d.govName })
          .first()
          .click();
        if (d.govRegNo) await page.locator(sel.govRegNo).fill(d.govRegNo);
        if (d.govTINNo) await page.locator(sel.govTINNo).fill(d.govTINNo);
        await page.locator(sel.govTel).fill(d.govTel);
        await page.locator(sel.email).fill(d.email);
        await page.locator(sel.govAdd1).fill(d.govAdd1);
        await page.locator(sel.govAdd2).fill(d.govAdd2);
        await page.locator(sel.govAdd3).fill(d.govAdd3);
        await page.locator(sel.govPoscode).fill(d.govPoscode);
        govCountB++;
      }
    }

    await page.getByRole("button", { name: "Seterusnya " }).click();
    //END OF BAHAGIAN B

    /* await page
      .getByRole("radio", { name: "Ada", exact: true })
      .waitFor({ state: "visible", timeout: 10000 });

    // Generate random numbers between 5-7 digits
    const randomDigits = Math.floor(Math.random() * 3) + 4; // Random between 5-7
    const minValue = Math.pow(4, randomDigits - 1);
    const maxValue = Math.pow(4, randomDigits) - 1;
    const randomNumber =
      Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue;
    const formattedNumber = randomNumber.toLocaleString("en-US");

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
    // Wait for status change auto-prefill to settle
    await page.waitForTimeout(1500);

    const openCal = page.locator(".flatpickr-calendar.open");

    // Open calendar and pick the first enabled day in the currently shown month
    await page.getByRole("textbox", { name: "dd/mm/yyyy" }).first().click();
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

    // Upload document - intercept file chooser to handle native dialog
    await page
      .locator(
        'button.upload-btn[data-bs-model="StampingForm.SupportingDocFiles"]',
      )
      .click();
    await page.waitForTimeout(2000);

    // Wait for modal to be visible
    await page
      .locator("#uploadModal")
      .waitFor({ state: "visible", timeout: 20000 });

    // Set up file chooser handler BEFORE clicking Tambah Fail
    const fileChooserPromise = page.waitForEvent("filechooser");

    // Click Tambah Fail - this will trigger the file chooser
    await page.locator("button#btnAddFile").click();

    // Handle the file chooser
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles("./test-data/image (19).png");
    await page.waitForTimeout(2000);

    // Click Simpan Fail button
    await page.locator("button#btnSaveUpload").click();
    await page.waitForTimeout(2000);

    await page.getByRole("button", { name: "Seterusnya " }).click();

    await page
      .locator("label")
      .filter({ hasText: "Saya seperti nama dan Nombor" })
      .click();

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
    await page.getByRole("button", { name: "Hantar " }).click();
    await page.getByRole("button", { name: "Batal" }).click();
    await page.getByRole("button", { name: "Hantar " }).click();
    await page.getByRole("button", { name: "Ya, Hantar" }).click();

    // Wait for success modal "Berjaya - Permohonan berjaya dihantar." then click OK
    await page.locator(".swal2-popup.swal2-icon-success").waitFor({ state: "visible", timeout: 20000 });
    await page.locator("button.swal2-confirm").click();
    // await page.getByRole("button", { name: "OK" }).click();

    await page
      .getByRole("button", { name: "Kembali ke Paparan Utama" })
      .waitFor({ state: "visible", timeout: 20000 });

    // Wait for the PDF download button and extract SRN from downloaded filename
    await page.waitForTimeout(2000);
    const cetakBtn = page.locator("button.btn-std", { hasText: "Cetak Slip Pengesahan" });
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
    if (!download) throw new Error("Cetak Slip Pengesahan failed after 3 attempts");

    // Extract SRN from filename: Slip_Pengesahan_9992619817932717.pdf
    const filename = download.suggestedFilename();
    const srnMatch = filename.match(/Slip_Pengesahan_(\d+)\.pdf/);
    const srnValue = srnMatch ? srnMatch[1] : "";
    console.log(`SRN extracted from PDF: ${srnValue}`);

    // Log the SRN
    fs.appendFileSync(currentUrlLogFile, `SRN: ${srnValue}\n`);
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
    await page.getByRole("button", { name: " Cari" }).click();

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

    // Read JSON file to find user credentials
    const usersData = JSON.parse(
      fs.readFileSync("./test-data/users_pre2.json", "utf-8"),
    );

    // Find the user by name
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

    // Login again with the user's credentials
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
    await page.getByRole("button", { name: " Cari" }).click();
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
   
    //
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
      .getByRole("button", { name: " Cari" })
      .waitFor({ state: "visible", timeout: 20000 });
    await page.getByRole("button", { name: " Cari" }).click();
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

    // Read JSON file to find user credentials for endorsement
    const usersDataEndorse = JSON.parse(
      fs.readFileSync("./test-data/users_pre2.json", "utf-8"),
    );

    // Find the user by name
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

    // Login again with the endorsement user's credentials
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
    await page.getByRole("button", { name: " Cari" }).click();
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
    // Wait for Senarai Tindakan to appear

  
    await page.goto(
      "https://hitspre2.hasil.gov.my/HITS_DT/carian_dashboard?SRN2=0",
    );

    // Save progress after successful iteration
    fs.writeFileSync(progressFile, i.toString());
    console.log(`Progress saved: iteration ${i} completed`); */
  }
});
