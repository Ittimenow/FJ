import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  markClassName,
  textClassName
}: {
  className?: string;
  markClassName?: string;
  textClassName?: string;
}) {
  return (
    <span className={cn("brand-logo", className)}>
      <img
        src="/logo.svg"
        alt=""
        width="48"
        height="48"
        className={cn("brand-logo-mark", markClassName)}
        aria-hidden="true"
      />
      <span className={cn("brand-logo-name", textClassName)}>
        <span>Финансовое</span>
        <span>путешествие</span>
      </span>
    </span>
  );
}
