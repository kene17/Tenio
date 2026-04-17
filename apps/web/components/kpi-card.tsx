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
  /** If true, renders as a segment inside a horizontal strip (no outer border/shadow) */
  strip?: boolean;
  isFirst?: boolean;
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
  className,
  strip = false,
  isFirst = false,
}: KPIProps) {
  const effectiveTitle = label ?? title ?? "";
  const effectiveSubtitle = subtext ?? subtitle;

  const changeColor =
    trend === "up"
      ? variant === "warning"
        ? "#b45309"
        : "#059669"
      : trend === "down"
        ? variant === "success"
          ? "#059669"
          : "#dc2626"
        : "#64748b";

  const valueColor =
    variant === "warning" ? "#92400e" :
    variant === "success" ? "#065f46" :
    "#0f172a";

  const bg =
    variant === "warning" ? "rgba(245,158,11,0.04)" :
    variant === "success" ? "rgba(5,150,105,0.04)" :
    "#ffffff";

  if (strip) {
    return (
      <div
        style={{
          padding: "16px 20px",
          borderLeft: isFirst ? "none" : "1px solid rgba(15,23,42,0.07)",
          background: bg,
          flex: 1,
          minWidth: 0,
        }}
        className={className}
      >
        <div style={{
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase" as const,
          color: "#94a3b8",
          marginBottom: 7,
          whiteSpace: "nowrap" as const,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {effectiveTitle}
        </div>
        <div style={{
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          lineHeight: 1,
          color: valueColor,
        }}>
          {value}
        </div>
        {effectiveSubtitle && (
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{effectiveSubtitle}</div>
        )}
        {change && (
          <div style={{ fontSize: 11, marginTop: 5, color: changeColor, fontWeight: 500 }}>
            {change}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        background: bg,
        border: "1px solid rgba(15,23,42,0.08)",
        borderRadius: 10,
        padding: "16px 18px",
        boxShadow: "0 1px 4px rgba(15,23,42,0.04)",
      }}
      className={cn(className)}
    >
      <div style={{
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase" as const,
        color: "#94a3b8",
        marginBottom: 7,
      }}>
        {effectiveTitle}
      </div>
      <div style={{
        fontSize: 24,
        fontWeight: 700,
        letterSpacing: "-0.03em",
        lineHeight: 1,
        color: valueColor,
      }}>
        {value}
      </div>
      {effectiveSubtitle && (
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{effectiveSubtitle}</div>
      )}
      {change && (
        <div style={{ fontSize: 11, marginTop: 5, color: changeColor, fontWeight: 500 }}>
          {change}
        </div>
      )}
    </div>
  );
}
