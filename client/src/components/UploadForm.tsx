import { useState, useRef } from "react";
import { useUploadStatement } from "../hooks/usePortfolio";

export function UploadForm() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mutation = useUploadStatement();

  const handleSubmit = () => {
    if (!selectedFile) return;
    mutation.mutate(selectedFile, {
      onSuccess: () => {
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
    });
  };

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 transition-colors">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Upload Statement</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Select a PDF or CSV financial statement
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
            Parsed {mutation.data.holdings.length} holding(s) from{" "}
            <span className="font-medium">{mutation.data.upload.filename}</span>
          </div>
        )}
      </div>
    </div>
  );
}
