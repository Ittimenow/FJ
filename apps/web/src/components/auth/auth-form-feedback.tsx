import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

export function FieldHint({ id, children }: { id: string; children: ReactNode }) {
  return <p id={id} className="mt-2 text-xs font-medium leading-5 text-muted">{children}</p>;
}

export function FieldError({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null;
  return <p id={id} className="mt-2 text-xs font-semibold leading-5 text-red-700">{children}</p>;
}

export function FormNotice({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  const Icon = tone === "error" ? AlertCircle : CheckCircle2;
  return (
    <div
      className={tone === "error"
        ? "flex gap-2.5 rounded-xl bg-red-50 p-3 text-sm font-medium leading-5 text-red-700"
        : "flex gap-2.5 rounded-xl bg-[#eaf3e0] p-3 text-sm font-medium leading-5 text-success"}
      role={tone === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <Icon className="mt-0.5 shrink-0" size={17} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
