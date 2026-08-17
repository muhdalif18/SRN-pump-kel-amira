# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Setup and execution commands

- Install dependencies:
  - `npm install`
  - `npx playwright install --with-deps`

- Run all Playwright tests:
  - `npm test`

- Run in headed mode / with Playwright UI / view report:
  - `npm run test:headed`
  - `npm run test:ui`
  - `npm run report`

- Run single specs (primary workflows) — pattern is `npm run <name>:one`:
  - `e2e`, `login`, `login2`, `stamping`, `stamping-peranan-ejen-duti-setem`, `stamping-peranan-ejen-firma-guaman`, `e2e-ejen-duti-setem`, `e2e-penalty`, `e2e-combine-penalti-without-penalty`, `e2e-combine-penalti-without-penalty-worker2` (runs Edge headless, outputs to `test-results-worker2`)
  - `srn-pump-latest`, `srn-pump-peranan`, `srn-dev`, `srn-pump-normal`, `srn-pump-normal-syarikat`, `srn-pump-normal-syarikat-worker2`
  - `srn-pump-latest-dikecualiakn`, `-worker2`, `-worker3`, `-optimized`, `-dev-new`
  - `srn-pump-latest-dikecualiakn-missing-phone`, `-worker2`, `-fg`, `-individu`, `-staff-feds`, `-staff-feds-worker2`
  - `srn-pump-penalty-only`
  - `srn-pump-kel-normal`, `srn-pump-kel-penalty` — simpler single-flow baselines (see Spec families below)
  - `srn-pump-amira-normal`, `srn-pump-amira-penalty`, `srn-pump-amira-penalty-10`, `srn-pump-amira-dikecualiakn`
  - `srn-hits-only`, `srn-hits-only-dikecualikan` — HITS-only processing (no EDS stamping); these pass `--output=test-results-hits-only` / `--output=test-results-hits-only-dikecualikan` to avoid Playwright's file lock when both run simultaneously
  - `srn-pump-kel-uat` — KEL-UAT peranan-cycling spec
  - `generate-pdf`

- Run an arbitrary spec directly:
  - `npx playwright test tests/<spec-name>.spec.ts`
  - Examples for specs without package scripts: `npx playwright test tests/e2e-dev.spec.ts`, `npx playwright test tests/e2e-ejen-duti-kompaun.spec.ts`, `npx playwright test "tests/LATEST BACKUP-YG-JADI-e2e-combine-penalti-without-penalty.spec.ts"`

- There is no separate build or lint script in `package.json`; validation is via Playwright runs.

- Multi-worker coordination (parallel instances of the same flow against separate output dirs / worker log files):
  - Penalty workers: `npm run e2e-combine-penalti-without-penalty:staggered` (60s delay) / `:stop-both`
  - Dikecualiakn workers: `npm run srn-pump-latest-dikecualiakn:staggered` / `:stop-both` / `:stop-all` (3 workers)
  - Missing phone workers: `npm run srn-pump-latest-dikecualiakn-missing-phone:staggered` / `:stop-both`
  - Normal syarikat workers: `npm run srn-pump-normal-syarikat:staggered` / `:stop-both`
  - Missing-phone staff-feds workers: `npm run srn-pump-latest-dikecualiakn-missing-phone-staff-feds:staggered` / `:stop-both`
  - Triple pump: `npm run srn-pump-triple:start-all` / `:start-staggered` (runs `start-triple-staggered.js`) / `:stop-all` / `:logs-all`
  - Quad workers (4 role/data variants of the DIKECUALIAKN flow, run concurrently): `npm run quad:start` / `:stop` / `:logs` / `:status` — PM2 apps `quad-worker1-dikecualiakn` (base), `quad-worker2-fg` (Firma Guaman), `quad-worker3-individu`, `quad-worker4-staff-feds`. These four already invoke Playwright's CLI directly (`node_modules/@playwright/test/cli.js`) instead of `cmd.exe /c npx ...` — see the PM2/Windows logging note below before changing that.
  - Quad via Docker instead of PM2: `docker-compose-quad.yml` defines the same 4 workers as containers (`npm run docker:build` / `:up` / `:down` / `:logs` / `:status`).

- PM2 long-running ("forever") jobs — pattern is `npm run <name>:forever` / `:logs` / `:stop`, for the same `<name>`s as the `:one` scripts above, defined in `ecosystem.config.cjs`. Also:
  - `npm run bots:status` — `pm2 status` for everything
  - `npm run bots:all` / `bots:stop-all` — start/stop every app in `ecosystem.config.cjs` at once

- Docker (single spec): see `README.md` for the full Docker Hub workflow. Quick form:
  - `docker run -v ${PWD}/test-data:/app/test-data matalep00/ds7-automation:latest`
  - With report output: add `-v ${PWD}/playwright-report:/app/playwright-report`
  - Dockerfile's default CMD runs `login.spec.ts`; override with `docker-compose run playwright npx playwright test <spec>`

## High-level architecture

This repository is a Playwright-driven browser automation suite for e-Duti workflows spanning multiple web systems and roles. It is not a product codebase — there is no app under test that lives here; the "product" is the automation scripts themselves, and most of them are long-running data-pumping/regression bots rather than pass/fail unit tests.

### 1) Runtime and orchestration

- Core runtime is `playwright.config.ts`: `testDir: "./tests"`, `timeout: 770000` (~12.8 min), `workers: 1`, `fullyParallel: false`, non-headless (`headless: false`, `viewport: null`, `--start-maximized`) so the real maximized window avoids layout cutoff. Projects are defined for chromium, firefox, and msedge, but most specs pin their own browser via `test.use({ browserName: "chromium", channel: "chrome", headless: ... })` at the top of the file, which overrides the config default.
- **Individual specs override the top-level timeout internally** with `test.setTimeout(4 * 60 * 60 * 1000)` (4 hours) inside the `test(...)` body. This means `playwright.config.ts`'s 770000ms timeout does _not_ bound these runs — a single stuck `page.waitForEvent(...)` or unqualified `.click()` can sit silently for up to 4 hours without erroring, autorestarting, or showing up as a crash. When a long-running spec looks "stuck," check whether `test-data/progress-*.txt` is actually advancing before assuming it crashed — `pm2 status` will still show `online` with `0` restarts even when a spec is fully wedged on a stuck wait.
- `ecosystem.config.cjs` maps PM2 app names to spec files for persistent/restarting runs (`autorestart: true`, `restart_delay: 10000`). Most apps spawn `cmd.exe /c npx playwright test ...` rather than invoking Playwright directly — this is intentional on this Windows setup because it's what makes a visible `cmd` console window auto-appear per job (some workflows in this repo rely on that visual signal). The tradeoff: this doubly-nested `cmd.exe → npx → cmd.exe → node` process chain does not reliably flush stdout into `.pm2/logs/<app>-out.log` — `pm2 logs` on these apps often shows nothing even while the job is genuinely progressing. Treat `pm2 logs` as unreliable for these apps; treat `test-data/progress-*.txt`, `test-data/srn-permanent-log.txt`, and the PM2 restart counter (`↺` in `pm2 status`) as the source of truth instead. (The four `quad-worker*` apps are the exception — they invoke `node_modules/@playwright/test/cli.js` directly, which _does_ log reliably to PM2's files but does not pop a visible console window.)
- `docker-compose.yml` sets `CI=true`, so Playwright uses CI behavior (`retries: 2` instead of local `0`). `docker-compose-quad.yml` runs the 4 quad-worker specs as separate containers instead of PM2 apps.

### 2) Workflow style in specs

- Specs in `tests/*.spec.ts` are long scenario scripts that combine:
  1. Clear browser cache/cookies via CDP
  2. Load test data from `test-data/` (addresses, users, Excel-derived JSON)
  3. Log in to MyTax → navigate to e-Duti Setem (opens a new tab, `page` is reassigned to it)
  4. Loop (typically up to 400–2000 iterations, resumable — see below) through: upload a stamping document, fill Form A (first party) and Form B (second party) details, fill share/consideration details, upload supporting docs, submit
  5. Extract the SRN from the downloaded confirmation PDF's filename (`Slip_Pengesahan_<SRN>.pdf`) and append it to a per-worker trace file and the shared permanent log
  6. Continue into HITS (`hitspre2.hasil.gov.my`): search by SRN, prepare/assess the duty, optionally apply a penalty or exemption path, preview/submit the notice, then log back in as the SRN holder and the endorsing officer to complete endorsement
- These are stateful system tests, not isolated unit tests; many assertions are implicit via `waitFor`/`waitForTimeout` and successful navigation rather than explicit `expect()`.
- **Crash-recovery via progress files**: most long-running specs read `./test-data/progress-<SCRIPT-NAME>.txt` at start to resume from `lastCompleted + 1` instead of iteration 1, and `fs.writeFileSync(progressFile, i.toString())` after each successful iteration. A shared `ProgressTracker` class exists at `tests/utils/progress-tracker.ts` implementing this same pattern, but **no current spec imports it** — each spec duplicates the read/resume/write logic inline instead. Match the existing inline pattern in a given spec rather than introducing the shared utility, unless asked to consolidate.
- Penalty flows use alternating dates to control assessment behavior: a fixed `PENALTY_DATE` (e.g. `"01/01/2026"` = 20% penalty, `"01/05/2026"` = 10% penalty) vs `getCurrentDate()` for normal processing. Some specs alternate Jan/May on every "PENALTY" occurrence via a counter (`isPenaltyJan = penaltyOccurrenceCount % 2 === 0`) so resumed runs still alternate correctly.
- Specs with a `DIKECUALIAKN` (exempted) flow cycle through a fixed 4-step pattern (`["DUTI_DIKECUALIKAN", "NO_PENALTY", "PENALTY", "NO_PENALTY"]`) keyed off `(i - 1) % FLOW_PATTERN.length`, so 1 in 4 submissions goes through the "Jenis Duti" exemption UI branch instead of the normal assessment path.

### 3) Spec families (role/account/data variants)

The suite has many near-parallel flows differing mainly by role, account, or which side (Form A / Form B) is missing data. Most maintenance is selector/timing/role-switch updates duplicated across these:

- **Base flows**: `e2e.spec.ts`, `e2e-ejen-duti-setem.spec.ts`, `stamping.spec.ts`, `stamping-peranan-ejen-duti-setem.spec.ts`, `stamping-peranan-ejen-firma-guaman.spec.ts` (role switch to Firma Guaman via a `//CHANGE PERANAN` block — clicks through Individu → Firma Pengurusan → Firma Guaman → a specific company popup), `login.spec.ts`, `login2.spec.ts` (HITS login only)
- **Penalty flows**: `e2e-penalty.spec.ts`, `e2e-combine-penalti-without-penalty.spec.ts` (+ `-worker2` variant, runs `msedge` headless for parallel execution alongside worker1)
- **SRN pump variants** (the bulk of active development): `SRN-PUMP-LATEST*.spec.ts`, `SRN-pump-peranan.spec.ts`, `SRN-PUMP-NORMAL*.spec.ts`, `SRN-PUMP-LATEST-DIKECUALIAKN*.spec.ts` (base + `-worker2`/`-worker3`/`-optimized`/`-dev-new`/`-PENALTY-ONLY` variants), `SRN-PUMP-LATEST-DIKECUALIAKN-MISSING-PHONE*.spec.ts` (base + `-FG` [Firma Guaman role], `-INDIVIDU`, `-STAFF-FEDS` [+ `-worker2`] — these fill Form A/B phone & email fields, the field most prone to flakiness on this system)
- **KEL-\* specs** (`SRN-PUMP-KEL-NORMAL.spec.ts`, `SRN-PUMP-KEL-PENALTY.spec.ts`): simpler single-flow baselines against a different MyTax account (`710424115474`) and a different company/individual scenario than the DIKECUALIAKN family — no role switch, and KEL-NORMAL is always `NO_PENALTY` while KEL-PENALTY alternates Jan/May every iteration. These two also use a more defensive fill pattern for Form B's `TelNo`/email fields: click 5× with 1s waits before typing, `pressSequentially(..., {delay: 150})` instead of `.fill()`, then a second clear-and-retype "re-verify" pass after the address fields are filled. Consider this pattern first when phone/email fields are flaky in other specs.
- **AMIRA-\* specs** (`SRN-PUMP-AMIRA-NORMAL.spec.ts`, `-PENALTY.spec.ts`, `-PENALTY-10.spec.ts`, `-DIKECUALIAKN.spec.ts`): another account/data variant family, parallel in structure to the SRN-PUMP-LATEST-DIKECUALIAKN family.
- **HITS-ONLY specs** (`SRN-HITS-ONLY.spec.ts`, `SRN-HITS-ONLY-DIKECUALIKAN.spec.ts`): skip EDS stamping entirely — take a hardcoded `SRN_LIST` array at the top of the file, loop through each SRN doing only the HITS assessment + endorsement steps (3-login cycle: PR officer → SRN holder → endorsement user). Progress is 0-based index (not iteration number). Auto-restart when all SRNs complete: if `lastCompleted + 1 >= SRN_LIST.length`, reset to index 0 instead of stalling. `DIKECUALIKAN` variant adds a "Duti Dikecualikan" block (select combobox option 3, then pick Jenis Peremitan/Pengecualian via the choices.js widget) between the second `Ya` button and `Prebiu Notis`. These two specs must use separate `--output=` dirs when run simultaneously — Playwright locks the default `test-results` folder.
- **KEL-UAT spec** (`SRN-PUMP-KEL-UAT.spec.ts`): credential `280929025063`, logins once before the loop, then each outer iteration changes peranan via the MyTax dashboard before running 5 sub-flows. See peranan-cycling notes below.
- Files with spaces or ad hoc names (`tests/e2e backup.js`, `tests/Objection.spec.ts`, `"tests/LATEST BACKUP-YG-JADI-e2e-combine-penalti-without-penalty.spec.ts"`) are legacy/scratch — quote paths with spaces when invoking directly.

### 4) Data dependencies and outputs

- Input data is file-driven from `test-data/`:
  - `addresses_my.json` — address data for form filling (`addressesData.INDIVIDU` is the array most specs draw from)
  - `users_pre2.json` — HITS user credentials, looked up by `nama` (name) to log in as the SRN holder and later as the endorsing officer; specs `throw` if a name from the UI isn't found in this file
  - `userstds (2).xlsx` and similar Excel workbooks — source data, converted to `users_pre2.json`-shaped JSON via the Python scripts in `scripts/` (`convert_userstds_v2.py`, `convert_devuserstds.py`, `convert_newdevuserstds.py`, `convert_qausers.py` — one per data source variant; requires `openpyxl`)
  - `image (19).png` — file upload artifact used for both the initial stamping upload and supporting-document upload steps
- Scripts append execution artifacts into `test-data/`:
  - `current-url-worker1.txt`, `current-url-worker2.txt`, `current-url-worker-<variant>.txt` (e.g. `-fg`, `-individu`, `-staff-feds`) — per-worker SRN/URL traces, cleared (`writeFileSync`) at the start of each run
  - `progress-<SCRIPT-NAME>.txt` — one per resumable spec, holds just the last completed iteration number
  - `srn-permanent-log.txt` — shared, append-only, timestamped log written by every pump/penalty spec (`=== Run started ===` separators, `Loop N | SRN: ... | <flowLabel>` lines). This is the most reliable single place to check whether _any_ of the running specs made progress recently, since worker-specific files get clobbered if two specs share the same worker file name (e.g. KEL-NORMAL, KEL-PENALTY, and the AMIRA specs all default to `current-url-worker1.txt` — expect interleaving/clobbering if run concurrently; only `srn-permanent-log.txt` is safe to rely on in that case).
- Because tests depend on live systems (`mytax-dev.hasil.gov.my`, `eds-uat.hasil.gov.my`, `hitspre2.hasil.gov.my`) and credentials, failures often come from session expiry, backend timing variance, or environment/account state rather than code logic alone.

### 5) Monitoring long-running jobs

- `scripts/monitor-dashboard.js` — a standalone Node HTTP server (no extra deps beyond the already-installed `pm2` package) serving a live-updating local dashboard at `http://localhost:4545` (override with `MONITOR_PORT`). It polls `pm2`'s programmatic API plus the `progress-*.txt` files for a small hardcoded list of apps (edit the `APPS` array at the top of the file to track more), and flags in the UI when a PM2 restart count jumps (likely crash) or a progress number hasn't moved in >10 minutes (likely a silent hang — see the 4-hour-timeout note above). Run with `node scripts/monitor-dashboard.js`.

### 6) Selector file pattern (`tests/selectors/`)

- `tests/selectors/formA.ts` exports a `FormA` object with selector factories for Bahagian A (Pihak Pertama) form fields. Use this instead of hardcoding selector strings in specs.
- **Individu**: `FormA.individu(slot, idx)` — `slot` is the email/IC DOM slot number, `idx` is the `FormAIndividualList[idx]` index (0-based, increments per individu added). Both are auto-calculated in `SRN-TEST.spec.ts` — do not hardcode them.
- **Syarikat**: `FormA.syarikat(slot, idx)` — same pattern; `idx` tracks `FormACompanyList[idx]`.
- **Kerajaan**: `FormA.kerajaan(govIndex, slot)` — `govIndex` tracks `FormAGovList[govIndex]` (increments only for kerajaan parties); `slot` is the email DOM slot.
- In `SRN-TEST.spec.ts`, Bahagian A is driven by a `formAParties` array — add/remove/change a party by editing that array only. The loop auto-calculates `slot`, `idx`, and `govIndex` via `individuCount`, `syarikatCount`, and `govCount` counters. Use `.last()` on radio buttons and Semak buttons to target the newly-added section. For govName dropdown, use `page.locator("li.suggestion-item", { hasText: govName }).first().click()` — `getByText()` hits both the heading and the dropdown item causing strict-mode violations.

## Project-specific notes for edits

- If adding a new long-running automation spec, wire it in both places:
  1. `ecosystem.config.cjs` (new PM2 app entry with `autorestart: true`, `restart_delay: 10000`, `time: true`)
  2. `package.json` scripts (`:one`, `:forever`, `:logs`, `:stop`)
- Keep selectors and waits resilient for long loops; this codebase is sensitive to UI timing and session continuity across iterations. See the KEL-\* click-retry/re-verify pattern above for the current best-known fix for flaky `TelNo`/email fields.
- Worker2/worker3 specs use `test.use({ channel: "msedge", headless: true })` or a distinct `--output=`/`--reporter=list` CLI flag for parallel execution isolation from worker1 — check both the spec's own `test.use()` and the corresponding `package.json`/`ecosystem.config.cjs` entry before assuming which applies.
- Credentials are hardcoded in specs (not environment variables) — this is by design for this automation suite.
- The suite uses `waitForTimeout()` heavily instead of deterministic waits — this is intentional for dealing with backend unpredictability, not an oversight to "fix."
- **CDP / newCDPSession** is only available when `browserName: "chromium"` — any spec that calls `page.context().newCDPSession(page)` must have `test.use({ browserName: "chromium", channel: "chrome" })` explicitly, even if `playwright.config.ts` defaults to chromium, because the project-level default can be overridden by CI or environment.
- **Playwright output-dir lock**: two simultaneous `npx playwright test` runs sharing the same `--output` directory will block each other. Always add `--output=test-results-<unique-name>` when running a spec alongside another. The `ecosystem.config.cjs` template already does this via `--output=test-results-${id}`.
- **choices.js dropdowns** (used for Jenis Duti, Jenis Peremitan, etc.): `selectOption()` does not work on choices.js widgets. Click `.choices__inner` to open, wait for `.choices__list--dropdown[aria-expanded='true']`, then click the option by role/text.
- **MyTax Pilihan Peranan modal** (on `dashboard-content` page): the trigger is `div.ic-container` (the blue peranan display box), not a `<button>`. Use `page.locator(".ic-container").first().click()`. Category names inside the modal (`Firma Pengurusan`, `Firma Guaman`, etc.) appear as substrings in other elements on the page — always pass `exact: true` to avoid strict-mode violations: `page.getByText("Firma Pengurusan", { exact: true })`.
- **Peranan-cycling specs** (KEL-UAT pattern): login once before the loop, then each iteration navigates to `https://mytax-dev.hasil.gov.my/web/dashboard-content`, clicks `.ic-container`, and executes a `clickSequence` array. After the click sequence, check `page.context().pages()` for an auto-opened EDS tab and switch `page` to it if found; otherwise the sub-flow's `page.goto("https://eds-uat.hasil.gov.my/stamping/upload")` handles navigation directly.
