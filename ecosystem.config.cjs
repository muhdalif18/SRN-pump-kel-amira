// Which browsers to run per pump is controlled by the PUMP_BROWSERS env var:
// comma-separated list of "chrome" and/or "edge". Defaults to chrome only.
//   PUMP_BROWSERS=chrome,edge npm run bots:all   (bash)
//   $env:PUMP_BROWSERS='chrome,edge'; npm run bots:all   (PowerShell)
// Every app name always carries its browser tag (e.g. -chrome-forever) so
// naming stays consistent regardless of how many browsers are selected. Each
// app also gets its own test-results/report output dir -- concurrent pumps
// sharing the default one causes every process to fight over creating/
// clearing it on startup.
const PUMPS = [
  { key: "amira-normal", spec: "SRN-PUMP-AMIRA-NORMAL" },
  { key: "amira-penalty", spec: "SRN-PUMP-AMIRA-PENALTY" },
  { key: "amira-dikecualiakn", spec: "SRN-PUMP-AMIRA-DIKECUALIAKN" },
  { key: "amira-syt", spec: "SRN-PUMP-AMIRA-SYT" },
  { key: "amira-syt-penalty", spec: "SRN-PUMP-AMIRA-SYT-PENALTY" },
  { key: "amira-syt-dikecualiakn", spec: "SRN-PUMP-AMIRA-SYT-DIKECUALIAKN" },
  { key: "amira-combined-syt", spec: "SRN-PUMP-AMIRA-COMBINED-SYT" },
  { key: "kel-combined", spec: "SRN-PUMP-KEL-COMBINED" },
  { key: "kel-normal", spec: "SRN-PUMP-KEL-NORMAL" },
  { key: "kel-penalty", spec: "SRN-PUMP-KEL-PENALTY" },
  { key: "kel-normal-fg", spec: "SRN-PUMP-KEL-NORMAL-FG" },
  { key: "kel-penalty-fg", spec: "SRN-PUMP-KEL-PENALTY-FG" },
  { key: "kel-dikecualiakn", spec: "SRN-PUMP-KEL-DIKECUALIAKN" },
];

const BROWSER_PROJECTS = { chrome: "chromium", edge: "msedge" };
const selectedBrowsers = (process.env.PUMP_BROWSERS || "chrome")
  .split(",")
  .map((b) => b.trim())
  .filter(Boolean);

module.exports = {
  apps: PUMPS.flatMap(({ key, spec }) =>
    selectedBrowsers.map((tag) => {
      const project = BROWSER_PROJECTS[tag];
      const id = `${key}-${tag}`;
      return {
        name: `srn-pump-${id}-forever`,
        script: "cmd.exe",
        args: `/c npx playwright test tests/${spec}.spec.ts --project=${project} --output=test-results-${id}`,
        env: { PLAYWRIGHT_HTML_REPORT: `playwright-report-${id}` },
        autorestart: true,
        restart_delay: 10000,
        time: true,
      };
    }),
  ),
};
