import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";
import { useAuth } from "../hooks/useAuth";
import { useUploads, useDeleteUpload } from "../hooks/usePortfolio";
import { useEffect } from "react";
import { UploadForm } from "../components/UploadForm";

function UploadPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: uploads, isLoading } = useUploads();
  const deleteMutation = useDeleteUpload();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/" });
    }
  }, [authLoading, user, navigate]);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Upload Statement</h1>

      <UploadForm />

      {/* Upload History */}
      <div className="mt-8 bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Upload History</h2>
        </div>
        {isLoading ? (
          <div className="px-6 py-8 text-center text-gray-400">Loading uploads...</div>
        ) : !uploads || uploads.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400">
            No uploads yet. Upload a statement above to get started.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                <th className="px-6 py-3 font-medium">File</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Uploaded</th>
                <th className="px-6 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {uploads.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm text-gray-900">{u.filename ?? "—"}</td>
                  <td className="px-6 py-3 text-sm text-gray-600 uppercase">{u.file_type ?? "—"}</td>
                  <td className="px-6 py-3 text-sm">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        u.status === "processed"
                          ? "bg-green-100 text-green-700"
                          : u.status === "failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {new Date(u.uploaded_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    <button
                      onClick={() => deleteMutation.mutate(u.id)}
                      disabled={deleteMutation.isPending}
                      className="text-red-600 hover:text-red-800 text-xs"
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
    </div>
  );
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/upload",
  component: UploadPage,
});
