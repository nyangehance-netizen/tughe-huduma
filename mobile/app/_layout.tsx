import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppLock } from "../components/AppLock";
import { AuthProvider, useAuth } from "../lib/auth";
import { LangProvider, useT } from "../lib/i18n";
import { registerForPush } from "../lib/push";
import { supabase } from "../lib/supabase";
import { BRAND, useColors } from "../lib/theme";
import { IS_STAFF_APP } from "../lib/variant";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LangProvider>
        <AuthProvider>
          <AppLock>
            <Navigator />
          </AppLock>
        </AuthProvider>
      </LangProvider>
    </SafeAreaProvider>
  );
}

function Navigator() {
  const c = useColors();
  const { t, lang, setLang } = useT();
  const { session, profile, profileComplete } = useAuth();
  const router = useRouter();

  // Open the right screen when a notification is tapped.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      const url = res.notification.request.content.data?.url;
      if (typeof url === "string") router.push(url as never);
    });
    return () => sub.remove();
  }, [router]);

  // Register this phone for push once the person is signed in and set up.
  useEffect(() => {
    if (session && (profileComplete || IS_STAFF_APP)) registerForPush(session.user.id).catch(() => {});
  }, [session, profileComplete]);

  // Use the language saved on the profile; keep the profile in sync when it changes here.
  useEffect(() => {
    if (profile?.lang && profile.lang !== lang) setLang(profile.lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);
  useEffect(() => {
    if (profile && profile.lang !== lang) supabase.from("profiles").update({ lang }).eq("id", profile.id).then(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: IS_STAFF_APP ? "#1B2160" : BRAND },
          headerTintColor: "#FFFFFF",
          headerTitleStyle: { fontWeight: "700" },
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: c.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="setup" options={{ title: t.setup.title }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="new-case" options={{ title: t.form.title, presentation: "modal" }} />
        <Stack.Screen name="case/[id]" options={{ title: "" }} />
        <Stack.Screen name="desk/[id]" options={{ title: "" }} />
        <Stack.Screen name="privacy" options={{ title: t.privacy.title }} />
        <Stack.Screen name="staff-apply" options={{ title: t.staff.portal, headerBackVisible: false }} />
        <Stack.Screen name="wrong-app" options={{ title: t.appName, headerBackVisible: false }} />
        <Stack.Screen name="my-data" options={{ title: t.privacy.myData }} />
      </Stack>
    </>
  );
}
