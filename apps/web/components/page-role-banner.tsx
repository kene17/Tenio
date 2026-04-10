import { Info } from "lucide-react";

type PageRoleBannerProps = {
  title?: string;
  body: string;
};

export function PageRoleBanner({ title, body }: PageRoleBannerProps) {
  return (
    <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
        <div>
          {title ? <div className="font-medium text-blue-900">{title}</div> : null}
          <div className={title ? "mt-1 text-blue-800" : "text-blue-800"}>{body}</div>
        </div>
      </div>
    </div>
  );
}
