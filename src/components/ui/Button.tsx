import { type ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(function Button({ className, variant = "primary", ...props }, ref) {
  return (
    <button
      ref={ref}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
        variant === "primary" &&
          "bg-ink text-neon hover:bg-ink-soft",
        variant === "secondary" &&
          "bg-neon text-ink hover:brightness-95",
        variant === "ghost" &&
          "bg-transparent text-ink hover:bg-ink/5 border border-ink/15",
        variant === "danger" &&
          "bg-orange text-cream hover:brightness-95",
        className,
      )}
      {...props}
    />
  );
});
