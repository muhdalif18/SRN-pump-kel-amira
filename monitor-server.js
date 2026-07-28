// Local read-only dashboard for the SRN pump bots.
// Reads the same files this repo's specs already write to (test-data/progress-*.txt,
// test-data/srn-permanent-log.txt) and pm2's own process list — no new state, no writes.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const PORT = process.env.MONITOR_PORT || 4949;
const TEST_DATA_DIR = path.join(__dirname, "test-data");
const PERMANENT_LOG = path.join(TEST_DATA_DIR, "srn-permanent-log.txt");

const PUMPS = [
  "SRN-PUMP-AMIRA-NORMAL",
  "SRN-PUMP-AMIRA-PENALTY",
  "SRN-PUMP-AMIRA-DIKECUALIAKN",
  "SRN-PUMP-KEL-NORMAL",
  "SRN-PUMP-KEL-PENALTY",
  "SRN-PUMP-KEL-NORMAL-FG",
  "SRN-PUMP-KEL-PENALTY-FG",
  "SRN-PUMP-KEL-DIKECUALIAKN",
];
// Always check both -- harmless when only one is actually running (shows as
// "not started" for the other), and avoids needing to keep this in sync with
// whichever PUMP_BROWSERS selection is currently active in ecosystem.config.cjs.
const BROWSERS = ["chromium", "msedge"];

function readProgress(pump, browser) {
  const file = path.join(TEST_DATA_DIR, `progress-${pump}-${browser}.txt`);
  try {
    const raw = fs.readFileSync(file, "utf-8").trim();
    const n = parseInt(raw, 10);
    return Number.isNaN(n) ? null : n;
  } catch {
    return null;
  }
}

function tailLog(maxLines) {
  try {
    const raw = fs.readFileSync(PERMANENT_LOG, "utf-8");
    const lines = raw.split("\n").filter((l) => l.trim().length > 0);
    return lines.slice(-maxLines).reverse();
  } catch {
    return [];
  }
}

function getPm2Status() {
  return new Promise((resolve) => {
    exec("npx pm2 jlist", { cwd: __dirname }, (err, stdout) => {
      if (err) return resolve([]);
      try {
        const list = JSON.parse(stdout);
        resolve(
          list.map((p) => ({
            name: p.name,
            status: p.pm2_env?.status,
            restarts: p.pm2_env?.restart_time,
            uptimeMs: p.pm2_env?.pm_uptime
              ? Date.now() - p.pm2_env.pm_uptime
              : null,
          })),
        );
      } catch {
        resolve([]);
      }
    });
  });
}

async function buildStatus() {
  const pm2 = await getPm2Status();
  const pm2ByName = Object.fromEntries(pm2.map((p) => [p.name, p]));

  const pumps = [];
  for (const pump of PUMPS) {
    for (const browser of BROWSERS) {
      const tag = browser === "chromium" ? "chrome" : "edge";
      const pm2Name = `${pump.toLowerCase()}-${tag}-forever`;
      const matched = pm2ByName[pm2Name];
      pumps.push({
        pump,
        browser,
        lastIteration: readProgress(pump, browser),
        pm2Status: matched?.status ?? null,
      });
    }
  }
  const log = tailLog(100);
  return { pumps, pm2, log, generatedAt: new Date().toISOString() };
}

const PAGE = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>SRN_PUMP_MONITOR // root access</title>
<style>
  :root {
    --bg: #020602;
    --fg: #33ff66;
    --fg-dim: #1e9c42;
    --fg-bright: #aaffbb;
    --accent: #00e5ff;
    --danger: #ff3b3b;
    --glow: 0 0 4px currentColor, 0 0 10px currentColor;
  }
  * { box-sizing: border-box; }
  html, body {
    color: var(--fg);
    font-family: "Cascadia Code", "Fira Code", "Consolas", "Courier New", monospace;
    margin: 0;
    padding: 0;
  }
  /* Background lives ONLY on <html>, and <body> is left transparent.
     Setting a solid background on BOTH elements defeats the CSS canvas-
     propagation rule that would otherwise make body paint as transparent --
     with both set, body paints its own OPAQUE background as normal in-flow
     content, which sits on top of (hides) every position:fixed/negative
     z-index background layer for the full height of body's box.
     overflow-x also has to live here, not on body: 'overflow' on body
     disables the normal body->viewport propagation too, turning body into
     its own clipped scroll container sized to content height instead of
     the viewport. */
  html { background: var(--bg); overflow-x: hidden; }
  body { position: relative; padding: 4rem 2rem 5rem; }

  canvas#rain { position: fixed; inset: 0; width: 100%; height: 100%; z-index: -3; opacity: 0.85; }
  body::before {
    content: ""; position: fixed; inset: 0; z-index: -1; pointer-events: none;
    background: repeating-linear-gradient(
      to bottom, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 1px,
      transparent 2px, transparent 4px
    );
  }
  body::after {
    content: ""; position: fixed; inset: 0; z-index: -1; pointer-events: none;
    background: radial-gradient(ellipse at center, transparent 70%, rgba(0,0,0,0.55) 100%);
  }

  /* Biohazard backdrop */
  #hazmat-center {
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(0deg);
    font-size: 44vw; line-height: 1; color: var(--danger); opacity: 0.22;
    z-index: -2; pointer-events: none; text-shadow: 0 0 120px var(--danger), 0 0 40px var(--danger);
    animation: spin-slow 70s linear infinite;
  }
  @keyframes spin-slow {
    from { transform: translate(-50%, -50%) rotate(0deg); }
    to { transform: translate(-50%, -50%) rotate(360deg); }
  }

  #hazard-field { position: fixed; inset: 0; z-index: -2; pointer-events: none; overflow: hidden; }
  .hazard-float {
    position: absolute; bottom: -12vh; color: var(--fg); opacity: 0;
    text-shadow: 0 0 18px currentColor, 0 0 6px currentColor; animation-name: float-up;
    animation-timing-function: linear; animation-iteration-count: infinite;
  }
  .hazard-float.warn { color: var(--danger); }
  @keyframes float-up {
    0% { transform: translateY(0) rotate(0deg); opacity: 0; }
    8% { opacity: 0.75; }
    92% { opacity: 0.75; }
    100% { transform: translateY(-118vh) rotate(360deg); opacity: 0; }
  }

  /* Hazard tape framing */
  .hazard-tape {
    position: fixed; left: 0; right: 0; height: 40px; z-index: 6; overflow: hidden;
    background: repeating-linear-gradient(135deg, #ffcc00 0 20px, #101410 20px 40px);
    box-shadow: 0 0 20px rgba(255,204,0,0.4);
  }
  .hazard-tape.top { top: 0; }
  .hazard-tape.bottom { bottom: 0; }
  .hazard-tape .marquee {
    position: absolute; inset: 2px; display: flex; align-items: center;
    background: rgba(2,6,2,0.85); overflow: hidden; white-space: nowrap;
  }
  .hazard-tape .marquee span {
    display: inline-block; padding-left: 100%; color: #ffcc00; font-weight: 700;
    font-size: 1.05rem; letter-spacing: 0.2em; text-shadow: 0 0 8px #ffcc00;
    animation: marquee 18s linear infinite;
  }
  @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-100%); } }

  .prompt { color: var(--fg-dim); font-size: 0.85rem; }
  .prompt .path { color: var(--accent); }
  h1 {
    font-size: 1.4rem; margin: 0.15rem 0 0.15rem; letter-spacing: 0.06em;
    color: var(--fg-bright); text-shadow: var(--glow);
  }
  .cursor { display: inline-block; width: 0.55em; background: var(--fg-bright); margin-left: 2px;
    animation: blink 1s steps(1) infinite; box-shadow: var(--glow); }
  @keyframes blink { 50% { opacity: 0; } }

  .sub { color: var(--fg-dim); font-size: 0.78rem; margin-bottom: 1.4rem; }
  .live-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%;
    background: var(--fg); box-shadow: var(--glow); margin-right: 5px; animation: pulse 1.4s ease-in-out infinite; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.25; } }

  h2 {
    font-size: 0.9rem; color: var(--accent); text-shadow: var(--glow);
    margin: 2rem 0 0.6rem; letter-spacing: 0.05em; text-transform: uppercase;
  }
  h2::before { content: "// "; color: var(--fg-dim); }

  .panel {
    background: rgba(4,14,7,0.45);
    backdrop-filter: blur(2px) saturate(1.2);
    -webkit-backdrop-filter: blur(2px) saturate(1.2);
    border: 1px solid rgba(51,255,102,0.16);
    border-radius: 6px;
    padding: 0.9rem 1.1rem 0.4rem;
    margin-bottom: 1.75rem;
    box-shadow: 0 0 24px rgba(0,0,0,0.3);
  }
  .panel h2 { margin-top: 0; }

  table { border-collapse: collapse; width: 100%; margin-bottom: 0.5rem; background: transparent; }
  th, td { text-align: left; padding: 0.45rem 0.9rem; font-size: 0.85rem; background: transparent; }
  thead th {
    color: var(--bg); background: rgba(30,156,66,0.85); text-shadow: none;
    font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; font-size: 0.75rem;
  }
  tbody tr { border-bottom: 1px solid rgba(51,255,102,0.15); transition: background 0.15s; }
  tbody tr:hover { background: rgba(51,255,102,0.08); }

  .status-online { color: var(--fg-bright); text-shadow: var(--glow); font-weight: 700; }
  .status-other { color: var(--danger); text-shadow: 0 0 4px currentColor; font-weight: 700; }
  .spinner { display: inline-block; width: 1.2em; color: var(--accent); text-shadow: var(--glow); }
  .pill {
    display: inline-block; padding: 0.15rem 0.55rem; border-radius: 3px;
    border: 1px solid var(--fg-dim); color: var(--fg-dim); font-size: 0.75rem; letter-spacing: 0.03em;
  }
  .iter { color: var(--fg-bright); font-weight: 700; }

  pre.log {
    background: rgba(51,255,102,0.04); border: 1px solid rgba(51,255,102,0.25);
    padding: 1rem; border-radius: 4px; max-height: 55vh; overflow-y: auto;
    font-size: 0.78rem; line-height: 1.5; white-space: pre-wrap; word-break: break-all;
    box-shadow: inset 0 0 20px rgba(51,255,102,0.05);
  }
  pre.log::-webkit-scrollbar { width: 8px; }
  pre.log::-webkit-scrollbar-thumb { background: var(--fg-dim); border-radius: 4px; }

  footer { color: var(--fg-dim); font-size: 0.72rem; margin-top: 2rem; opacity: 0.7; }
</style>
</head>
<body>
  <div class="hazard-tape top"><div class="marquee"><span>☣ BIOHAZARD CONTAINMENT — AUTOMATED PUMP MONITORING — UNAUTHORIZED ACCESS PROHIBITED ☣ BIOHAZARD CONTAINMENT — AUTOMATED PUMP MONITORING — UNAUTHORIZED ACCESS PROHIBITED ☣&nbsp;</span></div></div>
  <div class="hazard-tape bottom"><div class="marquee"><span>☣ SYSTEM STATUS: MONITORING ACTIVE — DO NOT DISCONNECT ☣ SYSTEM STATUS: MONITORING ACTIVE — DO NOT DISCONNECT ☣&nbsp;</span></div></div>

  <div id="hazmat-center">☣</div>
  <div id="hazard-field"></div>
  <canvas id="rain"></canvas>

  <div class="prompt">root@<span class="path">srn-pump</span>:~$ ./monitor --watch --interval=3s</div>
  <h1>SRN_PUMP_MONITOR<span class="cursor">&nbsp;</span></h1>
  <div class="sub"><span class="live-dot"></span>LIVE &middot; auto-refresh 3s &middot; last sync <span id="ts">--:--:--</span></div>

  <div class="panel">
    <h2>Pump Progress</h2>
    <table>
      <thead><tr><th>Pump</th><th>Browser</th><th>Status</th><th>Last completed iteration</th></tr></thead>
      <tbody id="pumps"></tbody>
    </table>
  </div>

  <div class="panel">
    <h2>PM2 Processes</h2>
    <table>
      <thead><tr><th>PM2 app</th><th>Status</th><th>Restarts</th><th>Uptime</th></tr></thead>
      <tbody id="pm2"></tbody>
    </table>
  </div>

  <div class="panel">
    <h2>Live Log Feed :: srn-permanent-log.txt</h2>
    <pre class="log" id="log"></pre>
  </div>

  <footer>[ read-only :: no writes to test-data ] &middot; PID watch via pm2 jlist</footer>

<script>
const SPIN_FRAMES = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];
let spinFrame = 0;
setInterval(() => {
  spinFrame = (spinFrame + 1) % SPIN_FRAMES.length;
  document.querySelectorAll(".spinner").forEach(el => el.textContent = SPIN_FRAMES[spinFrame]);
}, 90);

function fmtUptime(ms) {
  if (!ms || ms < 0) return "-";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? h + "h " + m + "m" : m + "m " + (s % 60) + "s";
}

function statusBadge(status) {
  if (status === "online") return "<span class=\\"spinner\\">" + SPIN_FRAMES[0] + "</span> <span class=\\"status-online\\">RUNNING</span>";
  if (!status) return "<span class=\\"pill\\">idle</span>";
  return "<span class=\\"status-other\\">" + status.toUpperCase() + "</span>";
}

async function refresh() {
  const res = await fetch("/api/status");
  const data = await res.json();

  document.getElementById("ts").textContent = new Date(data.generatedAt).toLocaleTimeString();

  document.getElementById("pumps").innerHTML = data.pumps.map(p =>
    "<tr><td>" + p.pump + "</td><td>" + p.browser + "</td><td>" + statusBadge(p.pm2Status) + "</td><td>" +
    (p.lastIteration != null ? "<span class=\\"iter\\">#" + p.lastIteration + "</span>" : "<span class=\\"pill\\">not started</span>") + "</td></tr>"
  ).join("");

  document.getElementById("pm2").innerHTML = data.pm2.length
    ? data.pm2.map(p =>
        "<tr><td>" + p.name + "</td><td>" +
        (p.status === "online"
          ? "<span class=\\"spinner\\">" + SPIN_FRAMES[0] + "</span> <span class=\\"status-online\\">" + p.status.toUpperCase() + "</span>"
          : "<span class=\\"status-other\\">" + p.status + "</span>") + "</td><td>" +
        p.restarts + "</td><td>" + fmtUptime(p.uptimeMs) + "</td></tr>"
      ).join("")
    : "<tr><td colspan=4><span class=\\"pill\\">no pm2 apps running</span></td></tr>";

  document.getElementById("log").textContent = data.log.join("\\n");
}

// Matrix-rain background canvas
(function () {
  const canvas = document.getElementById("rain");
  const ctx = canvas.getContext("2d");
  const cellSize = 15;
  let cols, drops;
  const chars = "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF$#%&";

  function size() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    cols = Math.floor(canvas.width / cellSize);
    // Randomize starting rows so the rain fills the whole screen immediately
    // instead of every column starting synced at the top.
    drops = new Array(cols)
      .fill(0)
      .map(() => Math.floor((Math.random() * canvas.height) / cellSize));
  }
  window.addEventListener("resize", size);
  size();

  function draw() {
    ctx.fillStyle = "rgba(2,6,2,0.1)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "bold " + cellSize + "px monospace";
    for (let i = 0; i < drops.length; i++) {
      const y = drops[i] * cellSize;
      // Bright glowing head character, dimmer green trail above it
      ctx.fillStyle = "#eaffea";
      ctx.shadowColor = "#66ffaa";
      ctx.shadowBlur = 8;
      ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * cellSize, y);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#33ff66";
      ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * cellSize, y - cellSize);
      if (y > canvas.height && Math.random() > 0.96) drops[i] = 0;
      drops[i]++;
    }
  }
  setInterval(draw, 45);
})();

// Drifting biohazard / radiation symbols
(function () {
  const field = document.getElementById("hazard-field");
  const symbols = ["☣", "☢"];
  const count = 26;
  for (let i = 0; i < count; i++) {
    const el = document.createElement("span");
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    el.className = "hazard-float" + (symbol === "☢" ? " warn" : "");
    el.textContent = symbol;
    const duration = 12 + Math.random() * 16;
    el.style.left = (Math.random() * 100) + "vw";
    el.style.fontSize = (1.2 + Math.random() * 3.2) + "rem";
    el.style.animationDuration = duration + "s";
    el.style.animationDelay = "-" + (Math.random() * duration) + "s";
    field.appendChild(el);
  }
})();

refresh();
setInterval(refresh, 3000);
</script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  if (req.url === "/api/status") {
    const status = await buildStatus();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(status));
    return;
  }
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(PAGE);
});

server.listen(PORT, () => {
  console.log(`SRN pump monitor running at http://localhost:${PORT}`);
});
