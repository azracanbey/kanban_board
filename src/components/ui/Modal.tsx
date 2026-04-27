import { ReactNode } from "react";

type ModalProps = {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export function Modal({ children, isOpen, onClose, title }: ModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1117]/50 p-4 dark:bg-[#0a0a0a]/60">
      <div className="w-full max-w-md rounded-lg border border-[var(--app-border)] bg-[var(--app-card)] p-4 text-[var(--app-text)] shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-[var(--app-text)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-column)] hover:text-[var(--app-text)]"
            aria-label="Close"
          >
            X
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
