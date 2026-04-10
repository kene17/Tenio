import { cookies } from "next/headers";

import en from "../messages/en.json";
import fr from "../messages/fr.json";

export const TENIO_LOCALE_COOKIE = "tenio_locale";

export type Locale = "en" | "fr";
export type TenioMessages = typeof en;

const dictionaries: Record<Locale, TenioMessages> = {
  en,
  fr
};

export function normalizeLocale(value: string | null | undefined): Locale {
  return value === "fr" ? "fr" : "en";
}

export function getMessagesForLocale(locale: Locale): TenioMessages {
  return dictionaries[locale];
}

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get(TENIO_LOCALE_COOKIE)?.value);
}

export async function getLocaleMessages() {
  const locale = await getLocale();
  return {
    locale,
    messages: getMessagesForLocale(locale)
  };
}

/** Shared chrome strings for `PilotErrorState` from the active locale. */
export function getPilotErrorChrome(messages: TenioMessages): TenioMessages["errors"] {
  return messages.errors ?? getMessagesForLocale("en").errors;
}
