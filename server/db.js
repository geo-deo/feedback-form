// server/db.js
import sqlite3 from "sqlite3";
sqlite3.verbose();

const db = new sqlite3.Database("./app.db");

// однократная инициализация схемы
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      message TEXT NOT NULL,
      ip TEXT,
      userAgent TEXT,
      createdAt TEXT NOT NULL
    )
  `);
});

export default db;