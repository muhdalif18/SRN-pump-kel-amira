export const FormB = {
  radio: {
    individu: "Individu",
    syarikat: "Syarikat / Perniagaan Milikan",
    kerajaan: "Kerajaan / Badan Berkanun /",
  },
  // Verify this label matches the actual button text on the page
  addParty: "+ Tambah Pihak Kedua",

  individu: (idx: number) => ({
    name:     `input[name="StampingForm.FormBIndividualList[${idx}].Name"]`,
    isCitizen:`select[name="StampingForm.FormBIndividualList[${idx}].IsCitizen"]`,
    // ICNo field may use a slot-based ID — update if this selector fails
    icNo:     `input[name="StampingForm.FormBIndividualList[${idx}].ICNo"]`,
    telNo:    `input[name="StampingForm.FormBIndividualList[${idx}].TelNo"]`,
    email:    `input[name="StampingForm.FormBIndividualList[${idx}].Email"]`,
    addr1:    `input[name="StampingForm.FormBIndividualList[${idx}].Addr1"]`,
    addr2:    `input[name="StampingForm.FormBIndividualList[${idx}].Addr2"]`,
    addr3:    `input[name="StampingForm.FormBIndividualList[${idx}].Addr3"]`,
    postcode: `input[name="StampingForm.FormBIndividualList[${idx}].Postcode"]`,
  }),

  syarikat: (idx: number) => ({
    companyName: `input[name="StampingForm.FormBCompanyList[${idx}].CompanyName"]`,
    catTaxId:    `select[name="StampingForm.FormBCompanyList[${idx}].CatTaxId"]`,
    oldRegNo:    `input[name="StampingForm.FormBCompanyList[${idx}].OldCompanyRegistrationNo"]`,
    newRegNo:    `input[name="StampingForm.FormBCompanyList[${idx}].NewCompanyRegistrationNo"]`,
    // Container for the Semak button next to newRegNo — use with .getByRole("button", { name: "Semak" })
    newRegNoContainer: `#step2_div_NewCompanyRegistrationNo`,
    telNo:       `input[name="StampingForm.FormBCompanyList[${idx}].TelNo"]`,
    email:       `input[name="StampingForm.FormBCompanyList[${idx}].Email"]`,
    addr1:       `input[name="StampingForm.FormBCompanyList[${idx}].ADDR1"]`,
    addr2:       `input[name="StampingForm.FormBCompanyList[${idx}].ADDR2"]`,
    addr3:       `input[name="StampingForm.FormBCompanyList[${idx}].ADDR3"]`,
    postcode:    `input[name="StampingForm.FormBCompanyList[${idx}].Postcode"]`,
  }),

  kerajaan: (idx: number) => ({
    govName:    `input[name="StampingForm.FormBGovList[${idx}].GovName"]`,
    govRegNo:   `input[name="StampingForm.FormBGovList[${idx}].GovRegNo"]`,
    govTINNo:   `input[name="StampingForm.FormBGovList[${idx}].GovTINNo"]`,
    govTel:     `input[name="StampingForm.FormBGovList[${idx}].GovTel"]`,
    // Field name for kerajaan email in Form B — update if selector fails
    email:      `input[name="StampingForm.FormBGovList[${idx}].GovEmail"]`,
    govAdd1:    `input[name="StampingForm.FormBGovList[${idx}].GovAdd1"]`,
    govAdd2:    `input[name="StampingForm.FormBGovList[${idx}].GovAdd2"]`,
    govAdd3:    `input[name="StampingForm.FormBGovList[${idx}].GovAdd3"]`,
    govPoscode: `input[name="StampingForm.FormBGovList[${idx}].GovPoscode"]`,
  }),
};
