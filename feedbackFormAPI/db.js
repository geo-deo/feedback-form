// server/db.js
import sqlite3 from "sqlite3";
sqlite3.verbose();

const db = new sqlite3.Database("./app.db");

// однократная инициализация схемы
db.serialize(() => {
  // таблица для обратной связи
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

  // таблица для истории чата
  db.run(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      sessionId TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
      content TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);

  // индекс для ускоренного поиска сообщений по сессии + времени
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_chat_session_time
    ON chat_messages(sessionId, datetime(createdAt))
  `);
});

export default db;