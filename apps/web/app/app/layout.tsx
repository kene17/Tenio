import type { UserRole } from "@tenio/domain";

import { DashboardShell } from "../../components/dashboard-shell";
import { getLocaleMessages } from "../../lib/locale";
import { getCurrentSession } from "../../lib/pilot-api";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  const { locale, messages } = await getLocaleMessages();
  const organizationName = session?.organizationName ?? "My Organization";

  return (
    <DashboardShell
      locale={locale}
      messages={messages.shell}
      currentUserName={session?.fullName ?? "Workspace User"}
      currentUserInitials={
        session?.fullName
          ?.split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase() ?? "WU"
      }
      organizationName={organizationName}
      currentRole={(session?.role ?? "viewer") as UserRole}
      userId={session?.userId ?? null}
      userEmail={session?.email ?? null}
      organizationId={session?.organizationId ?? null}
    >
      {children}
    </DashboardShell>
  );
}
