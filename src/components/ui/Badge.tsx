type BadgeTone = "success" | "warning" | "error" | "neutral" | "pending";

interface BadgeProps {
  tone: BadgeTone;
  children: React.ReactNode;
}

const toneClasses: Record<BadgeTone, string> = {
  success: "bg-ledger/10 text-ledger-dark",
  warning: "bg-brass/15 text-brass",
  error: "bg-rust/10 text-rust",
  neutral: "bg-ink/10 text-ink-muted",
  pending: "bg-paper-2 text-ink-muted",
};

export function Badge({ tone, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium tracking-wide uppercase ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
