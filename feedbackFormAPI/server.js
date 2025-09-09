import "dotenv/config"; // Load .env for DATABASE_URL, OPENAI_API_KEY, etc.
import app from "./app.js";
import prisma from "./db.js";

async function ensureSchema() {
  try {
    // Create Feedback table if not exists
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Feedback" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "ip" TEXT,
        "userAgent" TEXT
      );
    `);
    // Create ChatLog table + index if not exists
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ChatLog" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "userEmail" TEXT,
        "role" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ChatLog_userId_createdAt_idx" ON "ChatLog"("userId", "createdAt");
    `);
    console.log("DB schema ensured");
  } catch (e) {
    console.error("DB ensure error:", e?.message || e);
  }
}

const PORT = process.env.PORT || 3001;

ensureSchema().finally(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
});
