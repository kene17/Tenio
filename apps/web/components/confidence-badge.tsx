import { cn } from "../lib/cn";

type ConfidenceBadgeProps = {
  confidence: number;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md";
};

export function ConfidenceBadge({
  confidence,
  className,
  showLabel = false,
  size = "sm"
}: ConfidenceBadgeProps) {
  const getColor = () => {
    if (confidence >= 95) return "text-green-800 bg-green-100 border-green-300";
    if (confidence >= 85) return "text-blue-800 bg-blue-100 border-blue-300";
    if (confidence >= 70) return "text-amber-800 bg-amber-100 border-amber-300";
    return "text-red-800 bg-red-100 border-red-300";
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border font-medium font-mono",
        size === "sm" && "px-1.5 py-0.5 text-xs",
        size === "md" && "px-2 py-1 text-xs",
        getColor(),
        className
      )}
    >
      {showLabel && <span>Conf:</span>}
      <span>{confidence}%</span>
    </span>
  );
}
