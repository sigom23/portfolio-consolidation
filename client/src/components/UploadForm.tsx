import { useState, useRef } from "react";
import { useUploadStatement } from "../hooks/usePortfolio";

type UploadKind = "wealth" | "transactions";

export function UploadForm() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [kind, setKind] = useState<UploadKind>("wealth");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mutation = useUploadStatement();

  const handleSubmit = () => {
    if (!selectedFile) return;
    mutation.mutate(
      { file: selectedFile, kind },
      {
        onSuccess: () => {
          setSelectedFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        },
      }
    );
  };

  const successMessage =
    mutation.data?.kind === "transactions"
      ? `Parsed ${mutation.data.parsed ?? 0} transaction(s), inserted ${mutation.data.inserted ?? 0}${
          mutation.data.duplicates ? `, skipped ${mutation.data.duplicates} duplicate(s)` : ""
        }`
      : mutation.data
        ? `Parsed ${mutation.data.holdings?.length ?? 0} holding(s) from ${mutation.data.upload.filename}`
        : "";

  return (
    <div className="card-elevated rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 transition-colors">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Upload Statement</h2>
      <div className="space-y-4">
        {/* Kind selector */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-2">
            Statement type
          </label>
          <div className="inline-flex rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-1">
            <button
              type="button"
              onClick={() => setKind("wealth")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                kind === "wealth"
                  ? "bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              Wealth (holdings)
            </button>
            <button
              type="button"
              onClick={() => setKind("transactions")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                kind === "transactions"
                  ? "bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              Transactions
            </button>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-2">
            {kind === "wealth"
              ? "Broker/bank portfolio statement with stocks, bonds, crypto, or cash positions."
              : "Credit card or bank statement with individual expense/income transactions."}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Select a PDF or CSV file
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.csv"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-[var(--text-secondary)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-500/10 file:text-blue-500 hover:file:bg-blue-500/20"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!selectedFile || mutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
        >
          {mutation.isPending ? "Parsing..." : "Upload & Parse"}
        </button>

        {mutation.isError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">
            {mutation.error.message}
          </div>
        )}

        {mutation.isSuccess && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-500">
            {successMessage}
          </div>
        )}
      </div>
    </div>
  );
}
