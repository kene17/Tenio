"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import type { UserRole } from "@tenio/domain";

export function SentryUserBootstrap({
  userId,
  userEmail,
  orgId,
  role
}: {
  userId: string | null;
  userEmail: string | null;
  orgId: string | null;
  role: UserRole;
}) {
  useEffect(() => {
    if (userId) {
      Sentry.setUser({
        id: userId,
        email: userEmail ?? undefined
      });
      Sentry.setTag("orgId", orgId ?? "unknown");
      Sentry.setTag("role", role);
      return;
    }

    Sentry.setUser(null);
  }, [orgId, role, userEmail, userId]);

  return null;
}
