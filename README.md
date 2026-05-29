# Receipt → Spreadsheet

**Solution25 AI Internship — Task 2**

Upload a photo of a receipt; get back a clean table of items, totals, and currency — with one-click CSV export.

## What it does

- Drag-and-drop or click to upload a receipt image (PNG, JPG, WEBP).
- Backend sends the image to OpenAI Vision and extracts vendor, date, currency, every line item with quantity and unit price, subtotal, tax, and total.
- Results appear as a readable table in the browser.
- Graceful error state if the image is unreadable or not a receipt.
- Export the full result as a CSV file with a single click.
- Built-in **Demo** button — loads a hardcoded dataset so the UI works without a live backend.

## Project structure

```
frontend/   React + Vite (port 5173)
backend/    Express + OpenAI Vision (port 5000)
```

## Run locally

**Backend**

```bash
cd backend
npm install
cp .env.example .env   # then add your OPENAI_API_KEY
npm run dev
```

**Frontend** (separate terminal)

```bash
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. The Vite dev server proxies `/api` to the backend automatically — no extra config needed.

> The frontend Demo button works without a backend. Only real image extraction needs the API key.

## API contract

`POST /api/extract-receipt` — `multipart/form-data`, field name `receipt`

**Success (200)**
```json
{
  "vendor": "Fresh Corner Market",
  "date": "2026-05-18",
  "currency": "EUR",
  "items": [
    { "name": "Sourdough loaf", "qty": 1, "price": 3.90, "amount": 3.90 }
  ],
  "subtotal": 11.25,
  "tax": 1.13,
  "total": 12.38
}
```

**Unreadable image (422)**
```json
{ "error": "Receipt image is unreadable" }
```

## Vision prompt

The final prompt used in production:

```
You are a precise receipt OCR and extraction engine. Extract only visible information.
Never invent missing values. If the image is not a readable receipt, set readable=false,
explain the issue in error, and return empty strings, empty items, and zero totals.
```

I enforced this with a **strict JSON schema** on the Responses API — the model cannot return extra fields or skip required ones. This was more reliable than prompt-only enforcement.

## How I built this with Claude Code

These are the key prompts I used, roughly in order. I kept them close to what I actually typed.

---

**Prompt 1 — Architecture decision**

> Build a full-stack receipt OCR app. Backend: Express + OpenAI Vision API. Frontend: React + Vite. The backend accepts a multipart image upload, calls OpenAI to extract receipt data, and returns clean JSON. The frontend shows a drag-and-drop upload zone, image preview, a results table, and a CSV export button. Keep each side in its own folder — `frontend/` and `backend/` — with separate `package.json` files.

This gave me the skeleton. I reviewed the file structure before continuing.

---

**Prompt 2 — Structured output instead of prompt-only**

> The model sometimes adds fields I don't need or returns inconsistent types. Switch to the OpenAI Responses API with a strict JSON schema so the output shape is guaranteed. The schema must include: `readable` (boolean), `error` (string), `vendor`, `date`, `currency`, `items` array where each item has `name`, `qty`, `price`, `amount` — all required, no additional properties. If `readable` is false the backend should return HTTP 422 with the error message.

This was the most important architectural choice. Without the schema, the model would occasionally invent a `"discount"` field or return `quantity` instead of `qty`, breaking the frontend.

---

**Prompt 3 — Frontend states**

> The frontend needs four distinct states: `ready` (nothing uploaded yet), `selected` (image chosen, not yet sent), `loading` (API call in progress), `done` (table visible), and `error` (unreadable image or network failure). Add an empty state with a decorative receipt illustration made from CSS shapes. Add a spinner for the loading state. Add a red banner for errors that shows the exact message from the API. Also add a Demo button that loads a hardcoded receipt so a reviewer can evaluate the UI without connecting the backend.

---

**Prompt 4 — CSV export without a library**

> Add a one-click CSV export. Structure: metadata rows at the top (Vendor, Date, Currency), then a blank row, then the items table with headers Item / Quantity / Unit Price / Amount, then another blank row, then Subtotal / Tax / Total. Escape all cell values properly. Use a Blob URL and a temporary anchor — no external library.

---

**Prompt 5 — Dev proxy so fetch calls stay relative**

> The frontend does `fetch("/api/extract-receipt")` but Vite runs on 5173 and Express on 5000. Configure the Vite dev server proxy so `/api` forwards to `http://127.0.0.1:5000`. I don't want to hardcode the backend URL anywhere in the React code.

---

**Prompt 6 — Iteration on error handling**

> When the backend returns 422 the frontend currently shows a generic message. Make it show the exact `error` string from the JSON body. Also handle the case where the OpenAI API key is missing — the backend should return a clear 500 message instead of crashing.

---

## What I would add next

- Per-cell confidence score from the model (OpenAI can return logprobs).
- Inline table editing — let the user fix a misread line item before exporting.
- XLSX export alongside CSV.
- Replit one-click deploy with environment variable setup guide.
