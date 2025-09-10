// Simple SQL runner via Prisma for PowerShell-safe usage
import prisma from "../db.js";

async function main() {
  const sql = process.argv.slice(2).join(" ").trim();
  if (!sql) {
    console.error("Usage: node scripts/sql.js \"<SQL_QUERY>\"");
    console.error("Example: node scripts/sql.js \"SELECT now();\"");
    process.exit(1);
  }
  try {
    const res = await prisma.$queryRawUnsafe(sql);
    // Pretty print
    if (Array.isArray(res)) {
      console.log(JSON.stringify(res, null, 2));
    } else {
      console.log(res);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

