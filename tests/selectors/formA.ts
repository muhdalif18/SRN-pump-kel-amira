export const FormA = {
  radio: {
    individu: "Individu",
    syarikat: "Syarikat / Perniagaan Milikan",
    kerajaan: "Kerajaan / Badan Berkanun /",
  },
  addParty: "+ Tambah Pihak Pertama",

  individu: (slot: number, idx: number) => ({
    name:     `input[name="StampingForm.FormAIndividualList[${idx}].Name"]`,
    isCitizen:`select[name="StampingForm.FormAIndividualList[${idx}].IsCitizen"]`,
    icNo:     `#ICNo_${slot}`,
    telNo:    `input[name="StampingForm.FormAIndividualList[${idx}].TelNo"]`,
    email:    `#fld-email-ind-${slot}Step1`,
    addr1:    `input[name="StampingForm.FormAIndividualList[${idx}].Addr1"]`,
    addr2:    `input[name="StampingForm.FormAIndividualList[${idx}].Addr2"]`,
    addr3:    `input[name="StampingForm.FormAIndividualList[${idx}].Addr3"]`,
    postcode: `input[name="StampingForm.FormAIndividualList[${idx}].Postcode"]`,
  }),

  syarikat: (slot: number, idx: number) => ({
    companyName: `input[name="StampingForm.FormACompanyList[${idx}].CompanyName"]`,
    catTaxId:    `select[name="StampingForm.FormACompanyList[${idx}].CatTaxId"]`,
    oldRegNo:    `input[name="StampingForm.FormACompanyList[${idx}].OldCompanyRegistrationNo"]`,
    newRegNo:    `input[name="StampingForm.FormACompanyList[${idx}].NewCompanyRegistrationNo"]`,
    telNo:       `input[name="StampingForm.FormACompanyList[${idx}].TelNo"]`,
    email:       `#fld-email-com-${slot}Step1`,
    addr1:       `input[name="StampingForm.FormACompanyList[${idx}].ADDR1"]`,
    addr2:       `input[name="StampingForm.FormACompanyList[${idx}].ADDR2"]`,
    addr3:       `input[name="StampingForm.FormACompanyList[${idx}].ADDR3"]`,
    postcode:    `input[name="StampingForm.FormACompanyList[${idx}].Postcode"]`,
  }),

  kerajaan: (govIndex: number, slot: number) => ({
    govName:   `input[name="StampingForm.FormAGovList[${govIndex}].GovName"]`,
    govRegNo:  `input[name="StampingForm.FormAGovList[${govIndex}].GovRegNo"]`,
    govTINNo:  `input[name="StampingForm.FormAGovList[${govIndex}].GovTINNo"]`,
    govTel:    `input[name="StampingForm.FormAGovList[${govIndex}].GovTel"]`,
    email:     `#fld-email-gov-${slot}Step1`,
    govAdd1:   `input[name="StampingForm.FormAGovList[${govIndex}].GovAdd1"]`,
    govAdd2:   `input[name="StampingForm.FormAGovList[${govIndex}].GovAdd2"]`,
    govAdd3:   `input[name="StampingForm.FormAGovList[${govIndex}].GovAdd3"]`,
    govPoscode:`input[name="StampingForm.FormAGovList[${govIndex}].GovPoscode"]`,
  }),
};
