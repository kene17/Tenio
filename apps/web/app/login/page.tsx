import Link from "next/link";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next = "/app/queue", error } = await searchParams;
  const supportEmail =
    process.env.NEXT_PUBLIC_PILOT_SUPPORT_EMAIL ?? "pilot-support@example.com";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Sign In</h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in with your Tenio workspace credentials.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Need access help? Contact{" "}
            <a href={`mailto:${supportEmail}`} className="text-blue-600 hover:text-blue-700">
              {supportEmail}
            </a>
            .
          </p>
        </div>

        <form action="/api/auth/login" method="post" className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
              Work email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Invalid credentials. Try again or contact support.
            </div>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Enter Workspace
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Need the onboarding checklist?{" "}
          <Link href="/pilot-guide" className="text-blue-600 hover:text-blue-700">
            Open workspace guide
          </Link>
        </div>
      </div>
    </div>
  );
}
