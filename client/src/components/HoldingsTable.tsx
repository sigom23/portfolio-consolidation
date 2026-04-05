import type { Holding } from "../types";

interface Props {
  holdings: Holding[];
  loading: boolean;
}

export function HoldingsTable({ holdings, loading }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Holdings</h2>
      </div>
      <table className="w-full">
        <thead>
          <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
            <th className="px-6 py-3 font-medium">Name</th>
            <th className="px-6 py-3 font-medium">Ticker</th>
            <th className="px-6 py-3 font-medium">Type</th>
            <th className="px-6 py-3 font-medium text-right">Quantity</th>
            <th className="px-6 py-3 font-medium text-right">Value (USD)</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                Loading holdings...
              </td>
            </tr>
          ) : holdings.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                No holdings yet. Upload a statement or connect a wallet to get started.
              </td>
            </tr>
          ) : (
            holdings.map((h) => (
              <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-6 py-3 text-sm text-gray-900">{h.name}</td>
                <td className="px-6 py-3 text-sm text-gray-600">{h.ticker ?? "—"}</td>
                <td className="px-6 py-3 text-sm text-gray-600">{h.asset_type ?? "—"}</td>
                <td className="px-6 py-3 text-sm text-gray-900 text-right">
                  {h.quantity?.toLocaleString() ?? "—"}
                </td>
                <td className="px-6 py-3 text-sm text-gray-900 text-right font-medium">
                  {h.value_usd != null
                    ? `$${h.value_usd.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                    : "—"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
