import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  variant?: "default" | "white" | "small";
}

export function Logo({ className, variant = "default" }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-lg",
          variant === "white" ? "bg-white" : "bg-brand-800",
          variant === "small" ? "h-7 w-7" : "h-9 w-9"
        )}
      >
        <span
          className={cn(
            "font-bold",
            variant === "white" ? "text-brand-800" : "text-white",
            variant === "small" ? "text-xs" : "text-sm"
          )}
        >
          TC
        </span>
      </div>
      <span
        className={cn(
          "font-bold tracking-tight",
          variant === "white" && "text-white",
          variant === "small" ? "text-base" : "text-xl"
        )}
      >
        TRUCORE
      </span>
    </div>
  );
}
