export function hoje() {
  return new Date().toISOString().slice(0, 10);
}

export const inputClass =
  "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-ink outline-none transition focus:border-brand";
export const labelClass = "mb-1 block text-xs font-medium text-muted";
export const primaryButtonClass =
  "rounded-lg border border-brand bg-brand px-3 py-1.5 text-[13px] font-semibold text-brand-ink transition hover:bg-brand-strong disabled:opacity-60";
export const secondaryButtonClass =
  "rounded-lg border border-border px-3 py-1.5 text-[13px] text-muted transition hover:text-ink";
export const dangerLinkClass = "text-[13px] text-muted transition hover:text-danger";

export function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-[13px] font-medium transition ${
        active
          ? "border-brand bg-surface text-ink"
          : "border-border bg-surface text-muted hover:border-brand hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

export function ModalShell({
  onClose,
  children,
  wide,
}: {
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[88vh] w-full overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-2xl shadow-black/40 ${
          wide ? "max-w-2xl" : "max-w-lg"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
