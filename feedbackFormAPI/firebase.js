import admin from "firebase-admin";
import { readFileSync, existsSync } from "fs";
import path from "path";

let serviceAccount;

// 1️⃣ Если есть переменная окружения FIREBASE (Render)
if (process.env.FIREBASE) {
  serviceAccount = JSON.parse(process.env.FIREBASE);
}
// 2️⃣ Иначе пробуем читать локальный файл (для разработки)
else {
  const serviceAccountPath = path.resolve("firebase-key.json");
  if (!existsSync(serviceAccountPath)) {
    throw new Error("Firebase key not found: ни переменной FIREBASE, ни файла firebase-key.json");
  }
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;