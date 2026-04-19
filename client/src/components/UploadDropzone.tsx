import { useRef, useState, type DragEvent } from "react";
import { Upload } from "lucide-react";
import { useUploadStatement } from "../hooks/usePortfolio";

type UploadKind = "salary" | "transactions" | "wealth";

interface BaseProps {
  accept: string;
  headline: string;
  hint: string;
  /** Compact = smaller dropzone for embedding in modals. Default: false (full height). */
  compact?: boolean;
}

interface KindProps extends BaseProps {
  kind: UploadKind;
  customUpload?: never;
  /** Fires after a standard upload completes. Use to close the modal. */
  onSuccess?: () => void;
}

interface CustomProps<T = unknown> extends BaseProps {
  kind?: never;
  /** Custom upload handler (e.g. parse-only endpoints). */
  customUpload: {
    mutate: (file: File, opts: { onSuccess?: (data: T) => void }) => void;
    isPending: boolean;
    isError: boolean;
    error: Error | null;
  };
  /** Fires with the parse result — caller decides what to do (prefill form, close modal, etc.). */
  onSuccess?: (data: T) => void;
}

type Props<T = unknown> = KindProps | CustomProps<T>;

export function UploadDropzone<T = unknown>(props: Props<T>) {
  const { accept, headline, hint, onSuccess, compact = false } = props;
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const standardMutation = useUploadStatement();

  const isCustom = "customUpload" in props && props.customUpload != null;
  const isPending = isCustom ? props.customUpload!.isPending : standardMutation.isPending;
  const isError = isCustom ? props.customUpload!.isError : standardMutation.isError;
  const errorMessage = isCustom
    ? props.customUpload!.error?.message
    : standardMutation.error?.message;

  function submit(file: File) {
    if (isCustom) {
      props.customUpload!.mutate(file, {
        onSuccess: (data) => {
          if (fileRef.current) fileRef.current.value = "";
          (onSuccess as ((data: T) => void) | undefined)?.(data);
        },
      });
    } else {
      standardMutation.mutate(
        { file, kind: props.kind! },
        {
          onSuccess: () => {
            if (fileRef.current) fileRef.current.value = "";
            (onSuccess as (() => void) | undefined)?.();
          },
        }
      );
    }
  }

  const mutation = { isPending, isError };

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(true);
  }
  function handleDragLeave() {
    setDragOver(false);
  }
  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) submit(file);
  }

  const padding = compact ? "p-6" : "p-10";
  const iconSize = compact ? "w-6 h-6" : "w-8 h-8";

  return (
    <div>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !mutation.isPending && fileRef.current?.click()}
        className={`relative rounded-[2px] border-2 border-dashed ${padding} text-center cursor-pointer transition-all duration-200 ${
          mutation.isPending
            ? "border-[var(--color-whisper)] bg-[var(--color-snow)] cursor-wait"
            : dragOver
              ? "border-[var(--color-charcoal)] bg-[var(--color-charcoal)]/5"
              : "border-[var(--color-whisper)] bg-white hover:border-[var(--color-charcoal)]/50 hover:bg-[var(--color-snow)]"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          className="hidden"
          disabled={mutation.isPending}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) submit(f);
            e.target.value = "";
          }}
        />
        <div className="flex flex-col items-center gap-3">
          {mutation.isPending ? (
            <div className={`${iconSize} border-2 border-[var(--color-light)] border-t-[var(--color-charcoal)] rounded-full animate-spin`} />
          ) : (
            <Upload
              className={`${iconSize} transition-colors ${dragOver ? "text-[var(--color-charcoal)]" : "text-[var(--color-light)]"}`}
              strokeWidth={1.25}
            />
          )}
          <div>
            <p className="text-[14px] font-medium text-[var(--color-charcoal)]">
              {mutation.isPending ? "Processing..." : headline}
            </p>
            <p className="text-[11px] text-[var(--color-muted)] mt-1">
              {hint}
            </p>
          </div>
        </div>
      </div>
      {mutation.isError && errorMessage && (
        <p className="text-xs text-[var(--color-negative)] mt-2">{errorMessage}</p>
      )}
    </div>
  );
}
