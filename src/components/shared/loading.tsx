import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingProps {
  className?: string;
  size?: "sm" | "default" | "lg";
  text?: string;
}

export function Loading({ className, size = "default", text }: LoadingProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-16", className)}>
      <Loader2
        className={cn(
          "animate-spin text-brand-600",
          size === "sm" && "h-4 w-4",
          size === "default" && "h-8 w-8",
          size === "lg" && "h-12 w-12"
        )}
      />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}
