import Database from "better-sqlite3";

export type OneQueueDB = Database.Database;

const db: OneQueueDB = new Database("onequeue.db");

// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    payload TEXT NOT NULL,
    attempts INTEGER NOT NULL,
    runAt INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    startedAt INTEGER,
    finishedAt INTEGER,
    error TEXT
  );
`);

export default db;
