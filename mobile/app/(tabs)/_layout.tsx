import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { Loading } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { useT } from "../../lib/i18n";
import { BRAND, useColors } from "../../lib/theme";

type IconName = keyof typeof Ionicons.glyphMap;

export default function TabsLayout() {
  const c = useColors();
  const { t } = useT();
  const { loading, session, profileComplete, isOfficer } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Redirect href="/login" />;
  if (!profileComplete) return <Redirect href="/setup" />;

  const icon = (name: IconName) => ({ color, size }: { color: string; size: number }) => <Ionicons name={name} size={size} color={color} />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: BRAND },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { fontWeight: "700" },
        tabBarActiveTintColor: c.blue,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.line },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t.tabs.home, headerTitle: t.appName, tabBarIcon: icon("home-outline") }} />
      <Tabs.Screen name="cases" options={{ title: t.tabs.cases, headerTitle: t.cases.title, tabBarIcon: icon("folder-open-outline") }} />
      <Tabs.Screen name="assistant" options={{ title: t.tabs.assistant, headerTitle: t.bot.name, tabBarIcon: icon("chatbubbles-outline") }} />
      <Tabs.Screen name="desk" options={{ title: t.tabs.desk, headerTitle: t.desk.title, tabBarIcon: icon("briefcase-outline"), href: isOfficer ? undefined : null }} />
      <Tabs.Screen name="guide" options={{ title: t.tabs.guide, headerTitle: t.guide.title, tabBarIcon: icon("book-outline") }} />
      <Tabs.Screen name="account" options={{ title: t.tabs.account, tabBarIcon: icon("person-circle-outline") }} />
    </Tabs>
  );
}
