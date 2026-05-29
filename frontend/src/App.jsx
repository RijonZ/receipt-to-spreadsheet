import { useState } from "react";

const demoReceipt = {
  vendor: "Fresh Corner Market",
  date: "2026-05-18",
  currency: "EUR",
  items: [
    { name: "Sourdough loaf", qty: 1, price: 3.9, amount: 3.9 },
    { name: "Greek yogurt", qty: 2, price: 1.45, amount: 2.9 },
    { name: "Cherry tomatoes", qty: 1, price: 2.2, amount: 2.2 },
    { name: "Sparkling water", qty: 3, price: 0.75, amount: 2.25 },
  ],
  subtotal: 11.25,
  tax: 1.13,
  total: 12.38,
};

export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [status, setStatus] = useState("ready");
  const [error, setError] = useState("");

  function pickFile(selectedFile) {
    if (!selectedFile?.type.startsWith("image/")) {
      setError("Please upload a PNG, JPG, or WEBP receipt image.");
      setStatus("error");
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setReceipt(null);
    setError("");
    setStatus("selected");
  }

  async function analyzeReceipt() {
    if (!file) return;

    setStatus("loading");
    setError("");

    try {
      const body = new FormData();
      body.append("receipt", file);

      const response = await fetch("/api/extract-receipt", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Vision API could not read this image.");

      setReceipt(normalizeReceipt(data));
      setStatus("done");
    } catch (err) {
      setError(err.message || "This image could not be read. Try a clearer receipt photo.");
      setStatus("error");
    }
  }

  function loadDemo() {
    setReceipt(demoReceipt);
    setError("");
    setStatus("done");
  }

  function exportCsv() {
    if (!receipt) return;

    const rows = [
      ["Vendor", receipt.vendor],
      ["Date", receipt.date],
      ["Currency", receipt.currency],
      [],
      ["Item", "Quantity", "Unit Price", "Amount"],
      ...receipt.items.map((item) => [item.name, item.qty, item.price, item.amount]),
      [],
      ["Subtotal", "", "", receipt.subtotal],
      ["Tax", "", "", receipt.tax],
      ["Total", "", "", receipt.total],
    ];

    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "receipt.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="page">
      <header className="hero">
        <div>
          <p>Solution25 AI Internship Task 2</p>
          <h1>Receipt to Spreadsheet</h1>
        </div>
        <span>{statusLabel[status]}</span>
      </header>

      <section className="layout">
        <aside className="panel upload">
          <label
            className="dropzone"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              pickFile(event.dataTransfer.files[0]);
            }}
          >
            <input type="file" accept="image/*" onChange={(event) => pickFile(event.target.files[0])} />
            <strong>Upload receipt image</strong>
            <small>Drag and drop, or click to choose a file.</small>
          </label>

          <div className="preview">{preview ? <img src={preview} alt="Receipt preview" /> : <span>Receipt preview</span>}</div>

          <div className="buttons">
            <button onClick={analyzeReceipt} disabled={!file || status === "loading"}>
              Analyze
            </button>
            <button className="secondary" onClick={loadDemo}>
              Demo
            </button>
          </div>
        </aside>

        <section className="panel results">
          {!receipt && status !== "loading" && status !== "error" && (
            <EmptyState />
          )}

          {status === "loading" && (
            <div className="center">
              <div className="loader" />
              <h2>Reading receipt...</h2>
              <p>Extracting vendor, date, line items, currency and total.</p>
            </div>
          )}

          {status === "error" && (
            <div className="error">
              <strong>Could not read this receipt.</strong>
              <p>{error}</p>
            </div>
          )}

          {receipt && (
            <ReceiptTable receipt={receipt} onExport={exportCsv} />
          )}
        </section>
      </section>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="center">
      <div className="receipt-shape">
        <i />
        <i />
        <i />
        <b />
      </div>
      <h2>Upload a receipt to extract a clean table.</h2>
      <p>The frontend is ready for a vision model endpoint and includes a demo result.</p>
    </div>
  );
}

function ReceiptTable({ receipt, onExport }) {
  return (
    <>
      <div className="result-head">
        <div>
          <p>Extracted receipt</p>
          <h2>{receipt.vendor}</h2>
        </div>
        <button onClick={onExport}>Export CSV</button>
      </div>

      <div className="meta">
        <span>Date: <b>{receipt.date}</b></span>
        <span>Currency: <b>{receipt.currency}</b></span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {receipt.items.map((item) => (
              <tr key={item.name}>
                <td>{item.name}</td>
                <td>{item.qty}</td>
                <td>{money(item.price, receipt.currency)}</td>
                <td>{money(item.amount, receipt.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="totals">
        <span>Subtotal <b>{money(receipt.subtotal, receipt.currency)}</b></span>
        <span>Tax <b>{money(receipt.tax, receipt.currency)}</b></span>
        <strong>Total {money(receipt.total, receipt.currency)}</strong>
      </div>
    </>
  );
}

function normalizeReceipt(data) {
  return {
    vendor: data.vendor || "Unknown vendor",
    date: data.date || "Unknown date",
    currency: data.currency || "USD",
    items: (data.items || []).map((item) => ({
      name: item.name,
      qty: item.qty ?? item.quantity ?? 1,
      price: item.price ?? item.unitPrice ?? item.unit_price ?? 0,
      amount: item.amount ?? 0,
    })),
    subtotal: data.subtotal ?? 0,
    tax: data.tax ?? 0,
    total: data.total ?? 0,
  };
}

function money(value, currency) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).format(value || 0);
}

const statusLabel = {
  ready: "Frontend ready",
  selected: "Image selected",
  loading: "Analyzing",
  done: "Receipt extracted",
  error: "Needs attention",
};
