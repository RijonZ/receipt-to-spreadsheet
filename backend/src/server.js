const cors = require("cors");
const dotenv = require("dotenv");
const express = require("express");
const multer = require("multer");
const OpenAI = require("openai");

dotenv.config();

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 },
});

const port = process.env.PORT || 5000;
const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const receiptSchema = {
  type: "object",
  additionalProperties: false,
  required: ["readable", "error", "vendor", "date", "currency", "items", "subtotal", "tax", "total"],
  properties: {
    readable: { type: "boolean" },
    error: { type: "string" },
    vendor: { type: "string" },
    date: { type: "string" },
    currency: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "qty", "price", "amount"],
        properties: {
          name: { type: "string" },
          qty: { type: "number" },
          price: { type: "number" },
          amount: { type: "number" },
        },
      },
    },
    subtotal: { type: "number" },
    tax: { type: "number" },
    total: { type: "number" },
  },
};

app.use(cors({ origin: ["http://127.0.0.1:5173", "http://localhost:5173"] }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/extract-receipt", upload.single("receipt"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No receipt image uploaded." });
    }

    if (!req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({ error: "Please upload an image file." });
    }

    if (!openai) {
      return res.status(500).json({ error: "OPENAI_API_KEY is missing in backend/.env." });
    }

    const extracted = await extractReceipt(req.file);

    if (!extracted.readable) {
      return res.status(422).json({ error: extracted.error || "Receipt image is unreadable." });
    }

    res.json(toFrontendReceipt(extracted));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not extract receipt data." });
  }
});

async function extractReceipt(file) {
  const imageUrl = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

  const response = await openai.responses.create({
    model,
    text: {
      format: {
        type: "json_schema",
        name: "receipt_extraction",
        strict: true,
        schema: receiptSchema,
      },
    },
    input: [
      {
        role: "system",
        content:
          "You are a precise receipt OCR and extraction engine. Extract only visible information. Never invent missing values.",
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              "Extract vendor, date, currency, line items, subtotal, tax, and total from this receipt. Use ISO currency codes when clear. If the image is not a readable receipt, set readable=false, explain the issue in error, and return empty strings, empty items, and zero totals.",
          },
          {
            type: "input_image",
            image_url: imageUrl,
            detail: "high",
          },
        ],
      },
    ],
  });

  const content = response.output_text;
  if (!content) {
    return { readable: false, error: "The model returned an empty response." };
  }

  return JSON.parse(content);
}

function toFrontendReceipt(receipt) {
  return {
    vendor: receipt.vendor || "Unknown vendor",
    date: receipt.date || "Unknown date",
    currency: receipt.currency || "USD",
    items: Array.isArray(receipt.items)
      ? receipt.items.map((item) => ({
          name: item.name || "Unnamed item",
          qty: Number(item.qty ?? item.quantity ?? 1),
          price: Number(item.price ?? item.unitPrice ?? item.unit_price ?? 0),
          amount: Number(item.amount ?? 0),
        }))
      : [],
    subtotal: Number(receipt.subtotal ?? 0),
    tax: Number(receipt.tax ?? 0),
    total: Number(receipt.total ?? 0),
  };
}

app.listen(port, () => {
  console.log(`Backend running on http://127.0.0.1:${port}`);
});
