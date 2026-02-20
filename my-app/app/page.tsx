"use client";

import { FormEvent, useMemo, useState } from "react";

type FileItem = {
  name: string;
  size: number;
  createdAt: string;
};

type SummaryItem = {
  id: number;
  document_path: string;
  summary: string;
  model: string;
  created_at: string;
};

export default function Home() {
  const [status, setStatus] = useState("Frontend running");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [summaries, setSummaries] = useState<SummaryItem[]>([]);
  const [busy, setBusy] = useState(false);

  const hasFiles = useMemo(() => files.length > 0, [files]);

  async function checkBackend() {
    setStatus("Checking backend...");
    const res = await fetch("/api/health");
    const data = await res.json();
    setStatus(`Backend says: ${data.message}`);
  }

  async function loadFiles() {
    setBusy(true);
    const res = await fetch("/api/files");
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setStatus(data.error || "Failed to load files");
      setBusy(false);
      return;
    }
    setFiles(data.files ?? []);
    setStatus("Files loaded");
    setBusy(false);
  }

  async function loadSummaries() {
    const res = await fetch("/api/summaries");
    const data = await res.json();
    if (res.ok && data.ok) {
      setSummaries(data.summaries ?? []);
    }
  }

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) {
      setStatus("Please choose a file first");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    setBusy(true);
    setStatus("Uploading file...");

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      setStatus(data.error || "Upload failed");
      setBusy(false);
      return;
    }

    setStatus(`Upload success: ${data.data.filename}`);
    setSelectedFile(null);
    await loadFiles();
    setBusy(false);
  }

  async function removeFile(filePath: string) {
    setBusy(true);
    const res = await fetch("/api/files", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filePath }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setStatus(data.error || "Delete failed");
      setBusy(false);
      return;
    }

    setStatus(`Deleted: ${filePath}`);
    await loadFiles();
    setBusy(false);
  }

  async function summarizeFile(filePath: string) {
    setBusy(true);
    setStatus(`Summarizing ${filePath}...`);
    const res = await fetch("/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filePath }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setStatus(data.error || "Summary failed");
      setBusy(false);
      return;
    }

    setStatus(`Summary ready (${data.data.model})`);
    await loadSummaries();
    setBusy(false);
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-8">
        <header className="rounded-xl border border-black/10 p-4 sm:p-6">
          <h1 className="text-2xl font-bold sm:text-3xl">AI Summary App</h1>
          <p className="mt-2 text-sm sm:text-base">{status}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={checkBackend}
              disabled={busy}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-60"
            >
              Check backend
            </button>
            <button
              onClick={() => {
                void loadFiles();
                void loadSummaries();
              }}
              disabled={busy}
              className="rounded-md border border-black/20 px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              Refresh data
            </button>
          </div>
        </header>

        <section className="rounded-xl border border-black/10 p-4 sm:p-6">
          <h2 className="text-lg font-semibold">Upload document</h2>
          <form onSubmit={onUpload} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="file"
              onChange={(event) => {
                setSelectedFile(event.target.files?.[0] ?? null);
              }}
              className="w-full text-sm"
            />
            <button
              type="submit"
              disabled={busy || !selectedFile}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-60"
            >
              Upload
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-black/10 p-4 sm:p-6">
          <h2 className="text-lg font-semibold">Stored files</h2>
          {!hasFiles ? (
            <p className="mt-3 text-sm">No files yet. Upload one to begin.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {files.map((file) => (
                <li
                  key={file.name}
                  className="flex flex-col gap-3 rounded-lg border border-black/10 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold">{file.name}</p>
                    <p className="text-xs opacity-80">{Math.max(1, Math.round(file.size / 1024))} KB</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        void summarizeFile(file.name);
                      }}
                      disabled={busy}
                      className="rounded-md bg-foreground px-3 py-2 text-xs font-semibold text-background disabled:opacity-60"
                    >
                      Summarize
                    </button>
                    <button
                      onClick={() => {
                        void removeFile(file.name);
                      }}
                      disabled={busy}
                      className="rounded-md border border-black/20 px-3 py-2 text-xs font-semibold disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-black/10 p-4 sm:p-6">
          <h2 className="text-lg font-semibold">Recent summaries</h2>
          {summaries.length === 0 ? (
            <p className="mt-3 text-sm">No summaries yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {summaries.map((item) => (
                <li key={item.id} className="rounded-lg border border-black/10 p-3">
                  <p className="text-xs opacity-80">{item.document_path}</p>
                  <p className="mt-2 text-sm leading-6">{item.summary}</p>
                  <p className="mt-2 text-xs opacity-80">Model: {item.model}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
