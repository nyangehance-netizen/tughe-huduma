import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isConfigured = Boolean(url && anonKey && !url.includes("YOUR-PROJECT"));

export const supabase = createClient(url || "https://placeholder.supabase.co", anonKey || "placeholder", {
  auth: {
    storage: Platform.OS === "web" ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Keep the session fresh only while the app is in the foreground.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** Turn a Supabase/Postgres error into a short message for the user. */
export function errorText(e: unknown, fallback: string): string {
  const msg = (e as { message?: string } | null)?.message ?? "";
  if (msg.includes("RESOLUTION_REQUIRED")) return "RESOLUTION_REQUIRED";
  if (/network|fetch/i.test(msg)) return fallback;
  return msg || fallback;
}
