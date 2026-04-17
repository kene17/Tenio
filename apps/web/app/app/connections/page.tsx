import { redirect } from "next/navigation";

// Merged into /app/configuration — connection cards now live in the
// per-payer detail view of the Configuration page.
export default function ConnectionsRedirect() {
  redirect("/app/configuration");
}
