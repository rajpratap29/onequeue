# ⚡ OneQueue

**Background jobs in one line. Production-ready by default.**

OneQueue is a modern background job framework for Node.js that removes the pain of queues, workers, retries, and scheduling. Define jobs in one line and let OneQueue handle the rest.

---

## ✨ Why OneQueue?

Traditional job queues require:

- Redis setup
- worker wiring
- retry plumbing
- cron configuration
- dashboard setup

**OneQueue gives you all of this with zero config.**

---

## 🚀 Quick Start (30 seconds)

### Install

```bash
npm install onequeue
```

### Define a job

```javascript
import { job } from "onequeue";

job("sendWelcomeEmail", async (user) => {
  await email.send(user.email);
});
```

### Enqueue work

```javascript
import { enqueue } from "onequeue";

await enqueue("sendWelcomeEmail", {
  email: "raj@example.com",
});
```

### Done. Background processing is live.

## 🧠 Features

- ⚡ One-line job definition
- 🔁 Automatic retries with backoff
- ⏱️ Human-friendly delays ("10s", "5m")
- 💾 SQLite persistence (jobs survive restarts)
- 🧵 Concurrency control
- 📊 Live dev dashboard
- 🛑 Graceful shutdown
- 🔒 Zero-config by default
- 🧩 TypeScript-first

## ⏳ Delayed Jobs

```javascript
await enqueue("sendEmail", payload, {
  delay: "10s",
});
```

Supports:

- `"500ms"`
- `"10s"`
- `"5m"`
- `"1h"`

## 🔁 Retries

```javascript
job("unstableTask", handler, {
  retries: 3,
  backoffMs: 1000,
});
```

OneQueue automatically retries failed jobs with exponential backoff.

## 🧵 Concurrency

```javascript
import { configure } from "onequeue";

configure({ concurrency: 5 });
```

## 📊 Dev Dashboard

Run locally:

```bash
npx onequeue dev
```

Open:

```
http://localhost:3210
```

Monitor:

- queued jobs
- running jobs
- completed jobs
- failed jobs

Live updates included.

## 🛑 Graceful Shutdown

OneQueue automatically handles:

- SIGINT
- SIGTERM
- draining active jobs
- clean worker exit

Safe for deploy restarts and containers.

## 🏗️ Philosophy

OneQueue is built around a simple idea:

Background jobs should be boring to set up and reliable by default.

The goal is to provide Express-level simplicity for background processing while remaining production-capable.

## 🚧 Roadmap

- [ ] Redis adapter
- [ ] Distributed workers
- [ ] Job priorities
- [ ] Rate limiting
- [ ] Production dashboard

## 🤝 Contributing

PRs and feedback are welcome. If you build something cool with OneQueue, open an issue or share it.

## 📄 License

MIT
