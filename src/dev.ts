import http from "node:http";
import db from "./db";

const PORT = 3210;

function getStats() {
  const total = db.prepare(`SELECT COUNT(*) as c FROM jobs`).get() as any;
  const scheduled = db
    .prepare(`SELECT COUNT(*) as c FROM jobs WHERE runAt > ?`)
    .get(Date.now()) as any;

  return {
    total: total.c,
    scheduled: scheduled.c,
  };
}

function getJobs() {
  return db
    .prepare(
      `
      SELECT id, name, attempts, runAt, status
      FROM jobs
      ORDER BY id DESC
      LIMIT 50
    `,
    )
    .all();
}

const server = http.createServer((req, res) => {
  if (req.url === "/api/jobs") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(getJobs()));
    return;
  }

  if (req.url === "/api/stats") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(getStats()));
    return;
  }

  // simple HTML UI
  res.setHeader("Content-Type", "text/html");
  res.end(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>OneQueue Dev</title>
  <style>
    :root {
      --bg: #0b0f17;
      --card: #121826;
      --border: #1f2937;
      --text: #e5e7eb;
      --muted: #9ca3af;
      --accent: #6366f1;
      --accent2: #22c55e;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system;
      background: radial-gradient(circle at top, #111827, #020617);
      color: var(--text);
      padding: 40px;
    }

    .container {
      max-width: 1100px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 28px;
    }

    .title {
      font-size: 32px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .live {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: var(--muted);
    }

    .dot {
      width: 10px;
      height: 10px;
      background: var(--accent2);
      border-radius: 50%;
      box-shadow: 0 0 12px var(--accent2);
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.4; }
      100% { opacity: 1; }
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 28px;
    }

    .card {
      background: linear-gradient(180deg, #121826, #0f172a);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.35);
    }

    .stat-label {
      color: var(--muted);
      font-size: 13px;
      margin-bottom: 6px;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
    }

    .table-card h3 {
      margin-top: 0;
      margin-bottom: 14px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }

    th {
      text-align: left;
      color: var(--muted);
      font-weight: 500;
      padding: 10px 8px;
      border-bottom: 1px solid var(--border);
    }

    td {
      padding: 12px 8px;
      border-bottom: 1px solid #111827;
    }

    tr:hover td {
      background: rgba(99,102,241,0.06);
    }

    .footer {
      margin-top: 18px;
      font-size: 12px;
      color: var(--muted);
      text-align: right;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">⚡ OneQueue Dev</div>
      <div class="live">
        <div class="dot"></div>
        live
      </div>
    </div>

    <div class="stats">
      <div class="card">
        <div class="stat-label">Total Jobs</div>
        <div id="total" class="stat-value">—</div>
      </div>
      <div class="card">
        <div class="stat-label">Scheduled</div>
        <div id="scheduled" class="stat-value">—</div>
      </div>
    </div>

    <div class="card table-card">
      <h3>Recent Jobs</h3>
      <table id="jobs"></table>
    </div>

    <div class="footer">
      OneQueue Dev Dashboard
    </div>
  </div>

  <script>
    async function load() {
      const stats = await fetch('/api/stats').then(r => r.json());
      const jobs = await fetch('/api/jobs').then(r => r.json());

      document.getElementById('total').textContent = stats.total;
      document.getElementById('scheduled').textContent = stats.scheduled;

      const table = document.getElementById('jobs');
      table.innerHTML =
        '<tr><th>ID</th><th>Name</th><th>Status</th><th>Attempts</th><th>Run At</th></tr>' +
        jobs.map(j =>
            '<tr>' +
            '<td>' + j.id + '</td>' +
            '<td>' + j.name + '</td>' +
            '<td>' + j.status + '</td>' +
            '<td>' + j.attempts + '</td>' +
            '<td>' + new Date(j.runAt).toLocaleTimeString() + '</td>' +
            '</tr>'
        ).join('');
    }

    load();
    setInterval(load, 1000);
  </script>
</body>
</html>
`);
});

export function startDevServer() {
  server.listen(PORT, () => {
    console.log(`⚡ OneQueue Dev running at http://localhost:${PORT}`);
  });
}
