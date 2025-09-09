import "dotenv/config"; // Load .env for DATABASE_URL, OPENAI_API_KEY, etc.
import app from "./app.js";

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
