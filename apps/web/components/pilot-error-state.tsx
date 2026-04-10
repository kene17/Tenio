import Link from "next/link";

type PilotErrorStateProps = {
  title: string;
  body: string;
  eyebrow: string;
  openPilotGuide: string;
  contactSupport: string;
};

export function PilotErrorState({
  title,
  body,
  eyebrow,
  openPilotGuide,
  contactSupport
}: PilotErrorStateProps) {
  const supportEmail =
    process.env.NEXT_PUBLIC_PILOT_SUPPORT_EMAIL ?? "pilot-support@example.com";

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-2xl rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
        <div className="mb-4 inline-flex rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
          {eyebrow}
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">{body}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/pilot-guide"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {openPilotGuide}
          </Link>
          <a
            href={`mailto:${supportEmail}`}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {contactSupport}
          </a>
        </div>
      </div>
    </div>
  );
}
