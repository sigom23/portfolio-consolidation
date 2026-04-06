import type { Upload, Wallet } from "../types";

export type SourceSelection =
  | { type: "all" }
  | { type: "upload"; id: string }
  | { type: "wallet"; id: string };

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

interface Props {
  selected: SourceSelection;
  onSelect: (selection: SourceSelection) => void;
  uploads: Upload[];
  wallets: Wallet[];
}

export function SourceFilter({ selected, onSelect, uploads, wallets }: Props) {
  const value =
    selected.type === "all"
      ? "all"
      : `${selected.type}:${selected.id}`;

  const handleChange = (val: string) => {
    if (val === "all") {
      onSelect({ type: "all" });
    } else {
      const [type, id] = val.split(":") as ["upload" | "wallet", string];
      onSelect({ type, id });
    }
  };

  return (
    <select
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
    >
      <option value="all">All Sources</option>
      {uploads.length > 0 && (
        <optgroup label="Uploads">
          {uploads.map((u) => (
            <option key={`upload:${u.id}`} value={`upload:${u.id}`}>
              {u.filename ?? `Upload #${u.id}`}
            </option>
          ))}
        </optgroup>
      )}
      {wallets.length > 0 && (
        <optgroup label="Wallets">
          {wallets.map((w) => (
            <option key={`wallet:${w.id}`} value={`wallet:${w.id}`}>
              {w.label ?? truncateAddress(w.address)}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
