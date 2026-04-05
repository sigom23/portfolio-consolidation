import { createRoute } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";

function UploadPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Upload Statement</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-500 text-lg">Coming soon — Phase 2</p>
        <p className="text-gray-400 mt-2 text-sm">
          Upload PDF or CSV financial statements for automatic parsing via Claude AI.
        </p>
      </div>
    </div>
  );
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/upload",
  component: UploadPage,
});
