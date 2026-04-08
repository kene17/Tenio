import { DashboardShell } from "../../components/dashboard-shell";
import { getLocaleMessages } from "../../lib/locale";
import { getCurrentSession } from "../../lib/pilot-api";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  const { locale, messages } = await getLocaleMessages();

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
      organizationName="Acme Healthcare RCM"
      roleLabel={session?.role ?? "viewer"}
    >
      {children}
    </DashboardShell>
  );
}
