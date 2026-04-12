import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";
import { useAuth } from "../hooks/useAuth";
import { useUploads, useDeleteUpload, useWallets, useUploadStatement } from "../hooks/usePortfolio";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { WalletList } from "../components/WalletList";
import { detectDocumentType, uploadStatement } from "../services/api";

// ============================================================
// Queue types
// ============================================================
type QueueStatus = "queued" | "detecting" | "processing" | "done" | "error";
type DetectedKind = "salary" | "transactions" | "wealth" | "pe_statement";

const KIND_LABELS: Record<string, string> = {
  salary: "Salary",
  transactions: "Expenses",
  wealth: "Wealth",
  pe_statement: "PE Fund",
};

const KIND_COLORS: Record<string, string> = {
  salary: "#6B7B8D",
  transactions: "#C47D6D",
  wealth: "#6E9E96",
  pe_statement: "#A89B8C",
};

interface QueueItem {
  id: string;
  file: File;
  status: QueueStatus;
  detectedKind: DetectedKind | null;
  result: string | null;
  error: string | null;
}

// ============================================================
// Main page
// ============================================================
function DataRoomPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: uploads, isLoading: uploadsLoading, refetch: refetchUploads } = useUploads();
  const { data: wallets, isLoading: walletsLoading } = useWallets();
  const deleteMutation = useDeleteUpload();

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/" });
  }, [authLoading, user, navigate]);

  // Add files to queue
  const addFiles = useCallback((files: FileList | File[]) => {
    const items: QueueItem[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      status: "queued" as const,
      detectedKind: null,
      result: null,
      error: null,
    }));
    setQueue((prev) => [...prev, ...items]);
  }, []);

  // Process queue sequentially
  useEffect(() => {
    if (processingRef.current) return;
    const next = queue.find((q) => q.status === "queued");
    if (!next) return;

    processingRef.current = true;

    async function process(item: QueueItem) {
      // Step 1: Detect
      setQueue((q) => q.map((i) => i.id === item.id ? { ...i, status: "detecting" } : i));
      let kind: DetectedKind;
      try {
        const { detected_kind } = await detectDocumentType(item.file);
        kind = detected_kind as DetectedKind;
        setQueue((q) => q.map((i) => i.id === item.id ? { ...i, detectedKind: kind, status: "processing" } : i));
      } catch {
        setQueue((q) => q.map((i) => i.id === item.id ? { ...i, status: "error", error: "Could not detect document type" } : i));
        processingRef.current = false;
        return;
      }

      // Step 2: Process
      try {
        const result = await uploadStatement(item.file, kind === "pe_statement" ? "wealth" : kind);
        const summary = kind === "transactions"
          ? `${result.inserted ?? 0} transaction(s) inserted`
          : kind === "salary"
            ? (result as any).updated ? "Salary stream updated" : "Salary stream created"
            : `${result.holdings?.length ?? 0} holding(s) parsed`;
        setQueue((q) => q.map((i) => i.id === item.id ? { ...i, status: "done", result: summary } : i));
        refetchUploads();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Processing failed";
        setQueue((q) => q.map((i) => i.id === item.id ? { ...i, status: "error", error: msg } : i));
      }
      processingRef.current = false;
    }

    process(next);
  }, [queue, refetchUploads]);

  // Remove from queue
  function removeFromQueue(id: string) {
    setQueue((q) => q.filter((i) => i.id !== id));
  }

  // Retry errored item
  function retryItem(id: string) {
    setQueue((q) => q.map((i) => i.id === id ? { ...i, status: "queued", error: null, detectedKind: null } : i));
  }

  // Clear completed items
  function clearDone() {
    setQueue((q) => q.filter((i) => i.status !== "done"));
  }

  // Drag & drop handlers
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }
  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-[var(--color-light)] border-t-[var(--color-charcoal)] rounded-full animate-spin" />
      </div>
    );
  }

  const activeQueue = queue.filter((q) => q.status !== "done" || Date.now() - Number(q.id.split("-")[0]) < 30000);

  return (
    <div className="px-6 lg:px-8 py-8 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[27px] font-serif font-normal tracking-[-0.03em] text-[var(--text-primary)]">Data Room</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Manage your data sources — drop any document and it will be classified automatically
        </p>
      </div>

      {/* Drop Zone */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative mb-6 rounded-[2px] border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-200 ${
          dragOver
            ? "border-[var(--color-charcoal)] bg-[var(--color-charcoal)]/5 scale-[1.01]"
            : "border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--color-charcoal)]/50 hover:bg-[var(--bg-tertiary)]"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.csv,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="flex flex-col items-center gap-3">
          <div className={`w-14 h-14 rounded-[2px] flex items-center justify-center transition-colors ${
            dragOver ? "bg-[var(--color-cloud)]" : "bg-[var(--bg-tertiary)]"
          }`}>
            <svg className={`w-7 h-7 transition-colors ${dragOver ? "text-[var(--color-charcoal)]" : "text-[var(--text-muted)]"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Drop files here
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              PDF, CSV, or images — salary slips, bank statements, portfolio reports, PE fund documents
            </p>
          </div>
          <span className="text-[11px] text-[var(--text-muted)] border border-[var(--border-color)] rounded-[2px] px-3 py-1">
            or click to browse
          </span>
        </div>
      </motion.div>

      {/* Processing Queue */}
      <AnimatePresence>
        {activeQueue.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Processing Queue
              </h2>
              {queue.some((q) => q.status === "done") && (
                <button
                  onClick={clearDone}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  Clear completed
                </button>
              )}
            </div>
            <div className="rounded-[2px] border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden divide-y divide-[var(--border-color)]/50">
              {activeQueue.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="px-5 py-3 flex items-center gap-4"
                >
                  {/* Status indicator */}
                  <div className="flex-shrink-0">
                    {item.status === "queued" && (
                      <div className="w-5 h-5 rounded-full border-2 border-[var(--border-color)]" />
                    )}
                    {item.status === "detecting" && (
                      <div className="w-5 h-5 border-2 border-[var(--color-light)] border-t-[var(--color-charcoal)] rounded-full animate-spin" />
                    )}
                    {item.status === "processing" && (
                      <div className="w-5 h-5 border-2 border-[var(--color-light)] border-t-[var(--color-charcoal)] rounded-full animate-spin" />
                    )}
                    {item.status === "done" && (
                      <svg className="w-5 h-5 text-[var(--color-positive)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {item.status === "error" && (
                      <svg className="w-5 h-5 text-[var(--color-negative)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>

                  {/* File name */}
                  <span className="text-sm text-[var(--text-primary)] truncate flex-1 min-w-0">
                    {item.file.name}
                  </span>

                  {/* Detected kind badge */}
                  {item.detectedKind && (
                    <span
                      className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
                      style={{
                        backgroundColor: `${KIND_COLORS[item.detectedKind] ?? "#94a3b8"}1a`,
                        color: KIND_COLORS[item.detectedKind] ?? "#94a3b8",
                      }}
                    >
                      {KIND_LABELS[item.detectedKind] ?? item.detectedKind}
                    </span>
                  )}

                  {/* Status text */}
                  <span className="text-xs text-[var(--text-muted)] flex-shrink-0 w-32 text-right">
                    {item.status === "queued" && "Waiting..."}
                    {item.status === "detecting" && "Classifying..."}
                    {item.status === "processing" && "Processing..."}
                    {item.status === "done" && (
                      <span className="text-[var(--color-positive)]">{item.result}</span>
                    )}
                    {item.status === "error" && (
                      <span className="text-[var(--color-negative)]">{item.error}</span>
                    )}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {item.status === "error" && (
                      <button
                        onClick={() => retryItem(item.id)}
                        className="text-xs text-[var(--color-charcoal)] hover:text-[var(--color-mid)] transition-colors"
                      >
                        Retry
                      </button>
                    )}
                    {(item.status === "queued" || item.status === "done" || item.status === "error") && (
                      <button
                        onClick={() => removeFromQueue(item.id)}
                        className="text-[var(--text-muted)] hover:text-[var(--color-negative)] transition-colors"
                        title="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload History */}
      <div className="mb-6">
        <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
          Documents
        </h2>
        <div className="rounded-[2px] border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden">
          {uploadsLoading ? (
            <div className="px-6 py-8 text-center text-[var(--text-muted)]">Loading...</div>
          ) : !uploads || uploads.length === 0 ? (
            <div className="px-6 py-8 text-center text-[var(--text-muted)] text-sm">
              No documents yet. Drop a file above to get started.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-[var(--text-muted)] border-b border-[var(--border-color)]">
                  <th className="px-6 py-3 font-medium">File</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Uploaded</th>
                  <th className="px-6 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((u) => {
                  const kindKey = u.upload_kind ?? "wealth";
                  return (
                    <tr key={u.id} className="border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                      <td className="px-6 py-3 text-sm text-[var(--text-primary)] max-w-xs truncate">{u.filename ?? "—"}</td>
                      <td className="px-6 py-3 text-sm">
                        <span
                          className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
                          style={{
                            backgroundColor: `${KIND_COLORS[kindKey] ?? "#94a3b8"}1a`,
                            color: KIND_COLORS[kindKey] ?? "#94a3b8",
                          }}
                        >
                          {KIND_LABELS[kindKey] ?? kindKey}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          u.status === "processed" ? "bg-[var(--color-positive)]/10 text-[var(--color-positive)]"
                            : u.status === "failed" ? "bg-[var(--color-negative)]/10 text-[var(--color-negative)]"
                              : "bg-[var(--color-pending)]/10 text-[var(--color-pending)]"
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-[var(--text-secondary)] whitespace-nowrap">
                        {new Date(u.uploaded_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <div className="flex items-center gap-3">
                          <a
                            href={`/api/uploads/${u.id}/download`}
                            className="text-[var(--color-charcoal)] hover:text-[var(--color-mid)] text-xs"
                          >
                            Download
                          </a>
                          <button
                            onClick={() => deleteMutation.mutate(u.id)}
                            disabled={deleteMutation.isPending}
                            className="text-[var(--color-negative)] hover:text-[var(--color-negative)] text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Connected Wallets */}
      <div>
        <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
          Connected Wallets
        </h2>
        <WalletList wallets={wallets ?? []} loading={walletsLoading} showAddForm={false} />
      </div>
    </div>
  );
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/data-room",
  component: DataRoomPage,
});
