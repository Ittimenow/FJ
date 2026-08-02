import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 min-w-0 w-full rounded-xl border border-line bg-white px-3 text-base text-ink outline-none transition placeholder:text-muted focus:border-action focus:ring-4 focus:ring-action/20 aria-[invalid=true]:border-red-600 aria-[invalid=true]:ring-4 aria-[invalid=true]:ring-red-100 sm:text-sm",
        className
      )}
      {...props}
    />
  );
}
