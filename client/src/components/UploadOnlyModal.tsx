import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { UploadDropzone } from "./UploadDropzone";

type UploadKind = "salary" | "transactions" | "wealth";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  kind: UploadKind;
  accept: string;
  headline: string;
  hint: string;
}

export function UploadOnlyModal({ open, onClose, title, kind, accept, headline, hint }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="rounded-[2px] border border-[var(--color-whisper)] bg-white w-full max-w-md p-6 pointer-events-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[18px] font-normal text-[var(--color-charcoal)]">{title}</h2>
                <button
                  onClick={onClose}
                  className="text-[var(--color-muted)] hover:text-[var(--color-charcoal)] transition-colors"
                >
                  <X className="w-5 h-5" strokeWidth={1.5} />
                </button>
              </div>

              <UploadDropzone
                kind={kind}
                accept={accept}
                headline={headline}
                hint={hint}
                onSuccess={onClose}
              />

              <div className="flex justify-end mt-5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-full border border-[var(--color-faint)] text-[14px] font-medium text-[var(--color-mid)] hover:border-[var(--color-charcoal)] hover:text-[var(--color-charcoal)] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
