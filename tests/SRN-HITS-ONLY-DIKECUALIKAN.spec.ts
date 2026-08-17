import { test } from "@playwright/test";
import * as fs from "fs";

test.use({
  browserName: "chromium",
  channel: "chrome",
  headless: false,
});

// ─── PASTE YOUR 50 SRNs HERE ────────────────────────────────────────────────
const SRN_LIST: string[] = ["9992620175180415", "9992679414387927"];
// ────────────────────────────────────────────────────────────────────────────

test("test", async ({ page }, testInfo) => {
  test.setTimeout(4 * 60 * 60 * 1000); // 4 hours

  const browserTag = testInfo.project.name;

  const client = await page.context().newCDPSession(page);
  await client.send("Network.clearBrowserCache");
  await client.send("Network.clearBrowserCookies");

  const currentUrlLogFile = `./test-data/current-url-hits-only-dikecualikan-${browserTag}.txt`;
  fs.writeFileSync(
    currentUrlLogFile,
    "HITS-ONLY DIKECUALIKAN SRN Processing\n======================================\n\n",
  );

  fs.appendFileSync(
    "./test-data/srn-permanent-log.txt",
    `\n=== HITS-ONLY DIKECUALIKAN Run started: ${new Date().toISOString()} ===\n`,
  );

  // Progress: tracks the 0-based index of the last completed SRN
  const progressFile = `./test-data/progress-SRN-HITS-ONLY-DIKECUALIKAN-${browserTag}.txt`;
  let startIndex = 0;

  if (fs.existsSync(progressFile)) {
    try {
      const lastCompleted = parseInt(
        fs.readFileSync(progressFile, "utf-8").trim(),
        10,
      );
      if (!isNaN(lastCompleted) && lastCompleted >= 0) {
        startIndex = lastCompleted + 1;
        if (startIndex >= SRN_LIST.length) {
          // All SRNs completed — restart from beginning automatically
          startIndex = 0;
          console.log("All SRNs previously completed. Restarting from index 0.");
          fs.appendFileSync(
            "./test-data/srn-permanent-log.txt",
            `[${new Date().toISOString()}] All SRNs completed. Auto-restart from index 0.\n`,
          );
        } else {
          console.log(
            `Resuming from SRN index ${startIndex} (last completed index: ${lastCompleted})`,
          );
          fs.appendFileSync(
            "./test-data/srn-permanent-log.txt",
            `[${new Date().toISOString()}] Resuming from index ${startIndex}\n`,
          );
        }
      }
    } catch (err) {
      console.log("Could not read progress file, starting from index 0");
    }
  }

  // Load HITS user credentials once
  const usersData = JSON.parse(
    fs.readFileSync("./test-data/users_pre2.json", "utf-8"),
  );

  // ── Initial login as PR officer (once before the loop) ──────────────────
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
  // ────────────────────────────────────────────────────────────────────────

  for (let idx = startIndex; idx < SRN_LIST.length; idx++) {
    const srnValue = SRN_LIST[idx];
    console.log(
      `--- Processing SRN ${idx + 1}/${SRN_LIST.length}: ${srnValue} ---`,
    );

    try {
      // ── STEP 1: Search for SRN and get Nama Pemegang (already logged in) ──
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
      await page.getByPlaceholder(" ").fill(srnValue);
      await page.getByRole("button", { name: " Cari" }).click();

      await page.waitForTimeout(2000);
      const namaPemegangElement = page.locator(
        'div.columns-item:has-text("Nama Pemegang SRN") + div.columns-item span[data-expression][style*="font-weight: bold"]',
      );
      await namaPemegangElement.waitFor({ state: "visible", timeout: 20000 });
      const namaPemegangValue = (
        (await namaPemegangElement.textContent()) ?? ""
      ).trim();
      console.log(`Nama Pemegang SRN: ${namaPemegangValue}`);
      fs.appendFileSync(
        currentUrlLogFile,
        `[${idx + 1}/${SRN_LIST.length}] SRN: ${srnValue} | Nama: ${namaPemegangValue}\n`,
      );
      fs.appendFileSync(
        "./test-data/srn-permanent-log.txt",
        `[${new Date().toISOString()}] SRN ${idx + 1} | ${srnValue} | Nama: ${namaPemegangValue}\n`,
      );

      const user: any = usersData.find(
        (row: any) =>
          row.nama?.toUpperCase() === namaPemegangValue.toUpperCase(),
      );
      if (!user) {
        throw new Error(`User credentials not found for: ${namaPemegangValue}`);
      }
      console.log(`Found credentials - Username: ${user.loginId}`);

      // Logout current user (PR officer on first iteration, endorsement user on subsequent)
      await page.locator(".submenu-icon").click();
      await page.getByRole("link", { name: " Log Keluar" }).click();
      await page.waitForTimeout(5000);

      // ── STEP 2: Login as SRN holder and do assessment ─────────────────────
      await page
        .locator("#Input_UsernameVal")
        .waitFor({ state: "visible", timeout: 20000 });
      await page.locator("#Input_UsernameVal").click();
      await page.locator("#Input_UsernameVal").fill(user.loginId);
      await page.locator("#Input_PasswordVal").click();
      await page.locator("#Input_PasswordVal").fill(user.password);
      await page.getByRole("button", { name: "Login" }).click();
      await page.waitForTimeout(3000);
      await page.goto(
        "https://hitspre2.hasil.gov.my/HITS_DT/Dashboard_Taksiran",
      );
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

      // Duti Dikecualikan
      await page.getByRole("combobox").first().selectOption("3");
      await page
        .getByText("Pengesahan Tindakan")
        .waitFor({ state: "visible", timeout: 20000 });
      await page.getByText("Pengesahan Tindakan").click();
      await page
        .getByText("Perubahan ini akan")
        .waitFor({ state: "visible", timeout: 20000 });
      await page.getByText("Perubahan ini akan").click();
      await page.getByRole("button", { name: "Ya" }).click();
      await page
        .getByText("Jenis Peremitan / Pengecualian")
        .waitFor({ state: "visible", timeout: 20000 });
      await page.locator(".choices__inner").click();
      await page
        .locator(".choices__list--dropdown[aria-expanded='true']")
        .waitFor({ state: "visible", timeout: 10000 });
      await page
        .getByRole("option", { name: "DS 02 - Pengecualian #2" })
        .click();
      await page
        .getByText("Ulasan :")
        .waitFor({ state: "visible", timeout: 20000 });
      await page.getByText("Ulasan :").click();

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

      // Navigate back to get endorsement Nama Pemegang
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
      const namaPemegangElementEndorse = page.locator(
        'div.columns-item:has-text("Nama Pemegang SRN") + div.columns-item span[data-expression][style*="font-weight: bold"]',
      );
      const namaPemegangValueEndorse = (
        (await namaPemegangElementEndorse.textContent()) ?? ""
      ).trim();
      console.log(
        `Nama Pemegang SRN (Endorsement): ${namaPemegangValueEndorse}`,
      );
      fs.appendFileSync(
        currentUrlLogFile,
        `  Endorsement Nama: ${namaPemegangValueEndorse}\n`,
      );
      fs.appendFileSync(
        "./test-data/srn-permanent-log.txt",
        `[${new Date().toISOString()}] SRN ${idx + 1} | Endorsement Nama: ${namaPemegangValueEndorse}\n`,
      );

      const userEndorse: any = usersData.find(
        (row: any) =>
          row.nama?.toUpperCase() === namaPemegangValueEndorse.toUpperCase(),
      );
      if (!userEndorse) {
        throw new Error(
          `User credentials not found for endorsement: ${namaPemegangValueEndorse}`,
        );
      }
      console.log(
        `Found endorsement credentials - Username: ${userEndorse.loginId}`,
      );

      // Logout SRN holder
      await page.locator(".submenu-icon").click();
      await page.getByRole("link", { name: " Log Keluar" }).click();
      await page.waitForTimeout(5000);

      // ── STEP 3: Login as endorsement user and endorse ─────────────────────
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
      // Stay logged in — next iteration will search directly from here
      await page.goto(
        "https://hitspre2.hasil.gov.my/HITS_DT/carian_dashboard?SRN2=0",
      );

      // ── PASS ──────────────────────────────────────────────────────────────
      fs.writeFileSync(progressFile, idx.toString());
      const passMsg = `[PASS] SRN ${idx + 1}/${SRN_LIST.length}: ${srnValue}`;
      console.log(passMsg);
      fs.appendFileSync(currentUrlLogFile, `  ${passMsg}\n`);
      fs.appendFileSync(
        "./test-data/srn-permanent-log.txt",
        `[${new Date().toISOString()}] ${passMsg}\n`,
      );
    } catch (err: any) {
      // ── FAIL — log and continue to next SRN ───────────────────────────────
      const failMsg = `[FAIL] SRN ${idx + 1}/${SRN_LIST.length}: ${srnValue} | Error: ${err?.message ?? err}`;
      console.error(failMsg);
      fs.appendFileSync(currentUrlLogFile, `  ${failMsg}\n`);
      fs.appendFileSync(
        "./test-data/srn-permanent-log.txt",
        `[${new Date().toISOString()}] ${failMsg}\n`,
      );
      // Save progress so a restart skips this failed SRN and continues from next
      fs.writeFileSync(progressFile, idx.toString());

      // Re-login as PR officer so the next SRN search works cleanly
      try {
        await page.goto("https://hitspre2.hasil.gov.my/Dashboard/Login");
        await page.waitForTimeout(3000);
        await page.reload();
        await page.goto("https://hitspre2.hasil.gov.my/Dashboard/Login");
        await page.waitForTimeout(5000);
        await page
          .locator(".login-screen")
          .waitFor({ state: "visible", timeout: 20000 });
        await page.locator(".login-screen").click();
        await page
          .locator("#Input_UsernameVal")
          .fill("userstds_pahang_pr@hasil.gov.my");
        await page.locator("#Input_PasswordVal").fill("900101019039");
        await page.getByRole("button", { name: "Login" }).click();
        await page.waitForTimeout(3000);
        await page.goto(
          "https://hitspre2.hasil.gov.my/HITS_DT/carian_dashboard?SRN2=0",
        );
        await page.waitForTimeout(2000);
      } catch (loginErr: any) {
        console.error(
          `Re-login after fail also failed: ${loginErr?.message ?? loginErr}`,
        );
      }
    }
  }

  console.log("All SRNs processed.");
});
