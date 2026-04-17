"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { NotificationItem } from "../lib/notifications";

const POLL_INTERVAL_MS = 30_000;

export type UseNotificationsResult = {
  items: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  markAllRead: () => void;
};

export function useNotifications(): UseNotificationsResult {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const readIdsRef = useRef<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { items: NotificationItem[] };
      setItems((prev) => {
        const merged = data.items.map((n) => ({
          ...n,
          read: readIdsRef.current.has(n.id)
        }));
        if (
          merged.length === prev.length &&
          merged.every((n, i) => n.id === prev[i]?.id && n.read === prev[i]?.read)
        ) {
          return prev;
        }
        return merged;
      });
    } catch {
      // Network error — keep existing items, don't flash the UI
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
    const id = setInterval(() => void fetchNotifications(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  const markAllRead = useCallback(() => {
    setItems((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      next.forEach((n) => readIdsRef.current.add(n.id));
      return next;
    });
  }, []);

  const unreadCount = items.filter((n) => !n.read).length;

  return { items, unreadCount, loading, markAllRead };
}
