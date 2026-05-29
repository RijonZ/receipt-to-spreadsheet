const cors = require("cors");
const dotenv = require("dotenv");
const express = require("express");
const multer = require("multer");

dotenv.config();

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 },
});

const port = process.env.PORT || 5000;

app.use(cors({ origin: ["http://127.0.0.1:5173", "http://localhost:5173"] }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/extract-receipt", upload.single("receipt"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No receipt image uploaded." });
  }
  if (!req.file.mimetype.startsWith("image/")) {
    return res.status(400).json({ error: "Please upload an image file." });
  }
  // OpenAI Vision extraction — next commit
  res.status(501).json({ error: "Vision extraction not yet implemented." });
});

app.listen(port, () => {
  console.log(`Backend running on http://127.0.0.1:${port}`);
});
