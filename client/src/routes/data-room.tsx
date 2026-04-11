import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";
import { useAuth } from "../hooks/useAuth";
import { useUploads, useDeleteUpload, useWallets } from "../hooks/usePortfolio";
import { useEffect } from "react";
import { UploadForm } from "../components/UploadForm";
import { WalletList } from "../components/WalletList";

function DataRoomPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: uploads, isLoading: uploadsLoading } = useUploads();
  const { data: wallets, isLoading: walletsLoading } = useWallets();
  const deleteMutation = useDeleteUpload();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/" });
    }
  }, [authLoading, user, navigate]);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-6 lg:px-8 py-8 max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Data Room</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Documents and wallet sources that feed your wealth view
        </p>
      </div>

      {/* Documents section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Documents</h2>

        <UploadForm />

        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden transition-colors">
          <div className="px-6 py-4 border-b border-[var(--border-color)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Upload History</h3>
          </div>
          {uploadsLoading ? (
            <div className="px-6 py-8 text-center text-[var(--text-muted)]">Loading uploads...</div>
          ) : !uploads || uploads.length === 0 ? (
            <div className="px-6 py-8 text-center text-[var(--text-muted)]">
              No uploads yet. Upload a statement above to get started.
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
                {uploads.map((u) => (
                  <tr key={u.id} className="border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                    <td className="px-6 py-3 text-sm text-[var(--text-primary)]">{u.filename ?? "—"}</td>
                    <td className="px-6 py-3 text-sm text-[var(--text-secondary)] uppercase">{u.file_type ?? "—"}</td>
                    <td className="px-6 py-3 text-sm">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          u.status === "processed"
                            ? "bg-green-500/10 text-green-500"
                            : u.status === "failed"
                              ? "bg-red-500/10 text-red-500"
                              : "bg-yellow-500/10 text-yellow-500"
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-[var(--text-secondary)]">
                      {new Date(u.uploaded_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-sm flex items-center gap-3">
                      <a
                        href={`/api/uploads/${u.id}/download`}
                        className="text-blue-500 hover:text-blue-400 text-xs"
                      >
                        Download
                      </a>
                      <button
                        onClick={() => deleteMutation.mutate(u.id)}
                        disabled={deleteMutation.isPending}
                        className="text-red-500 hover:text-red-400 text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Wallets section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Wallets</h2>
        <WalletList wallets={wallets ?? []} loading={walletsLoading} />
      </section>
    </div>
  );
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/data-room",
  component: DataRoomPage,
});
