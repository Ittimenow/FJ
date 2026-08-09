import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "action" | "secondary" | "ghost" | "danger";
};

const variants = {
  primary: "bg-journey text-white shadow-[0_10px_28px_rgba(41,103,223,.25)] hover:-translate-y-0.5 hover:bg-[#1f56c8]",
  action: "bg-action text-ink shadow-action hover:-translate-y-0.5 hover:bg-[#e77b1e]",
  secondary: "border border-line bg-card text-ink hover:-translate-y-0.5 hover:bg-white",
  ghost: "text-ink hover:bg-card",
  danger: "bg-red-700 text-white hover:bg-red-800"
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-11 touch-manipulation select-none items-center justify-center rounded-xl px-4 text-sm font-bold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
