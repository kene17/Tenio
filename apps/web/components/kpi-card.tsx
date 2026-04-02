import { cn } from "../lib/cn";

type Variant = "neutral" | "success" | "warning";
type Trend = "up" | "down" | "neutral";

type KPIProps = {
  label?: string;
  title?: string;
  value: string | number;
  change?: string;
  trend?: Trend;
  variant?: Variant;
  subtext?: string;
  subtitle?: string;
  className?: string;
};

export function KPICard({
  label,
  title,
  value,
  change,
  trend,
  variant = "neutral",
  subtext,
  subtitle,
  className
}: KPIProps) {
  const effectiveTitle = label ?? title ?? "";
  const effectiveSubtitle = subtext ?? subtitle;

  const changeColor =
    trend === "up"
      ? variant === "warning"
        ? "text-amber-600"
        : "text-green-600"
      : trend === "down"
        ? variant === "success"
          ? "text-green-600"
          : "text-red-600"
        : "text-gray-600";

  return (
    <div className={cn("bg-white border border-gray-200 rounded-lg p-4", className)}>
      <div className="text-sm text-gray-600 mb-1">{effectiveTitle}</div>
      <div className="text-2xl font-semibold text-gray-900 mb-1">{value}</div>
      {effectiveSubtitle && <div className="text-xs text-gray-500">{effectiveSubtitle}</div>}
      {change && <div className={cn("text-xs mt-2", changeColor)}>{change}</div>}
    </div>
  );
}
