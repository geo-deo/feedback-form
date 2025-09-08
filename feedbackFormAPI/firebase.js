import admin from "firebase-admin";
import { readFileSync } from "fs";
import path from "path";

// путь до ключа (его ты скачал из Firebase Console → Service accounts)
const serviceAccountPath = path.resolve("firebase-key.json");

admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(readFileSync(serviceAccountPath, "utf-8"))
  ),
});

export default admin;