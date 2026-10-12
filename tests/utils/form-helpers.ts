import { Page } from "@playwright/test";

export interface IndividuData {
  name: string;
  icNo: string;
  telNo: string;
  email: string;
  addr1: string;
  addr2: string;
  addr3: string;
  postcode: string;
}

export interface SyarikatData {
  companyName: string;
  catTaxId: string; // e.g. "4" = Syarikat Sdn Bhd
  regNo: string;
  telNo: string;
  email: string;
  addr1: string;
  addr2: string;
  addr3: string;
  postcode: string;
}

// ─── PIHAK PERTAMA (Form A) ────────────────────────────────────────────────

/**
 * Add an Individu party to Pihak Pertama (Form A).
 * @param slot  - DOM slot index used in #ICNo_<slot> and #fld-email-ind-<slot>Step1
 * @param listIdx - FormAIndividualList[listIdx] array index
 */
export async function addFormAIndividu(
  page: Page,
  slot: number,
  listIdx: number,
  data: IndividuData,
) {
  await page.getByRole("button", { name: "+ Tambah Pihak Pertama" }).click();
  await page.waitForTimeout(1000);
  await page
    .locator(`input[name="StampingForm.FormAIndividualList[${listIdx}].Name"]`)
    .fill(data.name);
  await page
    .locator(`select[name="StampingForm.FormAIndividualList[${listIdx}].IsCitizen"]`)
    .selectOption("1");
  await page.locator(`#ICNo_${slot}`).fill(data.icNo);
  await page
    .locator(`input[name="StampingForm.FormAIndividualList[${listIdx}].TelNo"]`)
    .fill(data.telNo);
  await page.locator(`#fld-email-ind-${slot}Step1`).fill(data.email);
  await page
    .locator(`input[name="StampingForm.FormAIndividualList[${listIdx}].Addr1"]`)
    .fill(data.addr1);
  await page
    .locator(`input[name="StampingForm.FormAIndividualList[${listIdx}].Addr2"]`)
    .fill(data.addr2);
  await page
    .locator(`input[name="StampingForm.FormAIndividualList[${listIdx}].Addr3"]`)
    .fill(data.addr3);
  await page
    .locator(`input[name="StampingForm.FormAIndividualList[${listIdx}].Postcode"]`)
    .fill(data.postcode);
}

/**
 * Add a Syarikat party to Pihak Pertama (Form A).
 * @param slot  - DOM slot index used in #fld-email-com-<slot>Step1
 * @param listIdx - FormACompanyList[listIdx] array index
 */
export async function addFormASyarikat(
  page: Page,
  slot: number,
  listIdx: number,
  data: SyarikatData,
) {
  await page.getByRole("button", { name: "+ Tambah Pihak Pertama" }).click();
  await page.waitForTimeout(1000);
  await page
    .getByRole("radio", { name: "Syarikat / Perniagaan Milikan" })
    .last()
    .check();
  await page
    .locator(`input[name="StampingForm.FormACompanyList[${listIdx}].CompanyName"]`)
    .fill(data.companyName);
  await page
    .locator(`select[name="StampingForm.FormACompanyList[${listIdx}].CatTaxId"]`)
    .selectOption(data.catTaxId);
  await page
    .locator(`input[name="StampingForm.FormACompanyList[${listIdx}].NewCompanyRegistrationNo"]`)
    .fill(data.regNo);
  await page.waitForTimeout(2000);
  await page.getByRole("radio", { name: "Pemilikan Tempatan" }).last().check();
  await page
    .locator(`input[name="StampingForm.FormACompanyList[${listIdx}].TelNo"]`)
    .fill(data.telNo);
  await page.locator(`#fld-email-com-${slot}Step1`).fill(data.email);
  await page
    .locator(`input[name="StampingForm.FormACompanyList[${listIdx}].ADDR1"]`)
    .fill(data.addr1);
  await page
    .locator(`input[name="StampingForm.FormACompanyList[${listIdx}].ADDR2"]`)
    .fill(data.addr2);
  await page
    .locator(`input[name="StampingForm.FormACompanyList[${listIdx}].ADDR3"]`)
    .fill(data.addr3);
  await page
    .locator(`input[name="StampingForm.FormACompanyList[${listIdx}].Postcode"]`)
    .fill(data.postcode);
}

// ─── PIHAK KEDUA (Form B) ──────────────────────────────────────────────────

/**
 * Add an Individu party to Pihak Kedua (Form B).
 * @param slot  - DOM slot index used in #IsCitizen_<slot> and #fld-email-ind-<slot>-Step2
 * @param listIdx - FormBIndividualList[listIdx] array index
 */
export async function addFormBIndividu(
  page: Page,
  slot: number,
  listIdx: number,
  data: IndividuData,
) {
  await page.getByRole("button", { name: "+ Tambah Pihak Kedua" }).click();
  await page.waitForTimeout(1000);
  await page
    .locator(`input[name="StampingForm.FormBIndividualList[${listIdx}].Name"]`)
    .fill(data.name);
  await page.locator(`#IsCitizen_${slot}`).selectOption("1");
  await page
    .locator(`input[name="StampingForm.FormBIndividualList[${listIdx}].IcNo"]`)
    .fill(data.icNo);
  await page
    .locator(`input[name="StampingForm.FormBIndividualList[${listIdx}].TelNo"]`)
    .fill(data.telNo);
  await page.locator(`#fld-email-ind-${slot}-Step2`).fill(data.email);
  await page
    .locator(`input[name="StampingForm.FormBIndividualList[${listIdx}].Addr1"]`)
    .fill(data.addr1);
  await page
    .locator(`input[name="StampingForm.FormBIndividualList[${listIdx}].Addr2"]`)
    .fill(data.addr2);
  await page
    .locator(`input[name="StampingForm.FormBIndividualList[${listIdx}].Addr3"]`)
    .fill(data.addr3);
  await page
    .locator(`input[name="StampingForm.FormBIndividualList[${listIdx}].Postcode"]`)
    .fill(data.postcode);
}

/**
 * Add a Syarikat party to Pihak Kedua (Form B).
 * @param slot  - DOM slot index used in #compStatus1_<slot> and #fld-email-com-<slot>-Step2
 * @param listIdx - FormBCompanyList[listIdx] array index
 */
export async function addFormBSyarikat(
  page: Page,
  slot: number,
  listIdx: number,
  data: SyarikatData,
) {
  await page.getByRole("button", { name: "+ Tambah Pihak Kedua" }).click();
  await page.waitForTimeout(1000);
  await page
    .getByRole("radio", { name: "Syarikat / Perniagaan Milikan" })
    .last()
    .check();
  await page
    .locator(`input[name="StampingForm.FormBCompanyList[${listIdx}].CompanyName"]`)
    .fill(data.companyName);
  await page
    .locator(`select[name="StampingForm.FormBCompanyList[${listIdx}].CatTaxId"]`)
    .selectOption(data.catTaxId);
  await page
    .locator(`input[name="StampingForm.FormBCompanyList[${listIdx}].NewCompanyRegistrationNo"]`)
    .fill(data.regNo);
  await page.waitForTimeout(2000);
  await page.locator(`#compStatus1_${slot}`).check();
  await page
    .locator(`input[name="StampingForm.FormBCompanyList[${listIdx}].TelNo"]`)
    .fill(data.telNo);
  await page.locator(`#fld-email-com-${slot}-Step2`).fill(data.email);
  await page
    .locator(`input[name="StampingForm.FormBCompanyList[${listIdx}].ADDR1"]`)
    .fill(data.addr1);
  await page
    .locator(`input[name="StampingForm.FormBCompanyList[${listIdx}].ADDR2"]`)
    .fill(data.addr2);
  await page
    .locator(`input[name="StampingForm.FormBCompanyList[${listIdx}].ADDR3"]`)
    .fill(data.addr3);
  await page
    .locator(`input[name="StampingForm.FormBCompanyList[${listIdx}].Postcode"]`)
    .fill(data.postcode);
}
