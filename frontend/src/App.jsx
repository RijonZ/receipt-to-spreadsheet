import { useState } from "react";

export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
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
      setStatus("done");
    } catch (err) {
      setError(err.message || "This image could not be read. Try a clearer receipt photo.");
      setStatus("error");
    }
  }

  function loadDemo() {
    setError("");
    setStatus("done");
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

          <div className="preview">
            {preview ? <img src={preview} alt="Receipt preview" /> : <span>Receipt preview</span>}
          </div>

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

          {status === "done" && (
            <div className="center">
              <h2>Receipt extracted.</h2>
              <p>Table and export coming next.</p>
            </div>
          )}

          {(status === "ready" || status === "selected") && (
            <div className="center">
              <h2>Upload a receipt to extract a clean table.</h2>
              <p>The frontend is ready for a vision model endpoint.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

const statusLabel = {
  ready: "Frontend ready",
  selected: "Image selected",
  loading: "Analyzing",
  done: "Receipt extracted",
  error: "Needs attention",
};
