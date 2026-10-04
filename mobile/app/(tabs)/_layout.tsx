import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { Loading } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { useT } from "../../lib/i18n";
import { BRAND, useColors } from "../../lib/theme";
import { IS_STAFF_APP } from "../../lib/variant";

type IconName = keyof typeof Ionicons.glyphMap;

export default function TabsLayout() {
  const c = useColors();
  const { t } = useT();
  const { loading, session, profileComplete, isOfficer, profile } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Redirect href="/login" />;
  if (IS_STAFF_APP && !isOfficer) return <Redirect href="/staff-apply" />;
  if (!IS_STAFF_APP && isOfficer) return <Redirect href="/wrong-app" />;
  if (!IS_STAFF_APP && !profileComplete) return <Redirect href="/setup" />;
  const memberOnly = IS_STAFF_APP ? null : undefined;   // hidden in TUGHE Dawati
  const staffOnly = IS_STAFF_APP ? undefined : null;    // hidden in TUGHE Huduma

  const icon = (name: IconName) => ({ color, size }: { color: string; size: number }) => <Ionicons name={name} size={size} color={color} />;

  return (
    <Tabs
      initialRouteName={IS_STAFF_APP ? "desk" : "index"}
      screenOptions={{
        headerStyle: { backgroundColor: IS_STAFF_APP ? "#1B2160" : BRAND },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { fontWeight: "700" },
        tabBarActiveTintColor: c.blue,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.line },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t.tabs.home, headerTitle: t.appName, tabBarIcon: icon("home-outline"), href: memberOnly }} />
      <Tabs.Screen name="cases" options={{ title: t.tabs.cases, headerTitle: t.cases.title, tabBarIcon: icon("folder-open-outline"), href: memberOnly }} />
      <Tabs.Screen name="assistant" options={{ title: t.tabs.assistant, headerTitle: t.bot.name, tabBarIcon: icon("chatbubbles-outline"), href: memberOnly }} />
      <Tabs.Screen name="desk" options={{ title: t.tabs.desk, headerTitle: t.desk.title, tabBarIcon: icon("briefcase-outline"), href: staffOnly }} />
      <Tabs.Screen name="approvals" options={{ title: t.staff.approvals, headerTitle: t.staff.approvalsH, tabBarIcon: icon("people-outline"), href: IS_STAFF_APP && profile?.role === "admin" ? undefined : null }} />
      <Tabs.Screen name="guide" options={{ title: t.tabs.guide, headerTitle: t.guide.title, tabBarIcon: icon("book-outline") }} />
      <Tabs.Screen name="account" options={{ title: t.tabs.account, tabBarIcon: icon("person-circle-outline") }} />
    </Tabs>
  );
}
