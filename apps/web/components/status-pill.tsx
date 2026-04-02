import { cn } from "../lib/cn";

type StatusVariant =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "neutral"
  | "pending"
  | "blocked"
  | "review";

type StatusPillProps = {
  children: React.ReactNode;
  variant: StatusVariant;
  className?: string;
  size?: "sm" | "md";
};

const variantStyles: Record<StatusVariant, string> = {
  success: "bg-green-100 text-green-800 border-green-300",
  warning: "bg-amber-100 text-amber-800 border-amber-300",
  error: "bg-red-100 text-red-800 border-red-300",
  info: "bg-blue-100 text-blue-800 border-blue-300",
  neutral: "bg-gray-100 text-gray-700 border-gray-300",
  pending: "bg-purple-100 text-purple-800 border-purple-300",
  blocked: "bg-red-100 text-red-800 border-red-300",
  review: "bg-orange-100 text-orange-800 border-orange-300"
};

export function StatusPill({
  children,
  variant,
  className,
  size = "sm"
}: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border font-medium",
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-2.5 py-1 text-xs",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function statusVariantFromText(text: string): StatusVariant {
  const value = text.toLowerCase();

  if (value.includes("paid") || value.includes("verified") || value.includes("resolved")) {
    return "success";
  }

  if (value.includes("review")) {
    return "review";
  }

  if (value.includes("denied") || value.includes("breached")) {
    return "error";
  }

  if (value.includes("process") || value.includes("progress")) {
    return "info";
  }

  if (value.includes("pending")) {
    return "pending";
  }

  if (value.includes("blocked")) {
    return "blocked";
  }

  return "neutral";
}
