import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Button, Card, H1, H2, Label, Row, Screen, Txt } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { CATEGORIES } from "../../lib/content";
import { useT } from "../../lib/i18n";
import { supabase } from "../../lib/supabase";
import { radius, space, useColors } from "../../lib/theme";
import type { DeskStats } from "../../lib/types";

export default function Home() {
  const c = useColors();
  const { t, lang } = useT();
  const { profile, isOfficer, session } = useAuth();
  const router = useRouter();
  const [openCount, setOpenCount] = useState<number | null>(null);
  const [stats, setStats] = useState<DeskStats | null>(null);

  useFocusEffect(useCallback(() => {
    if (!session) return;
    supabase.from("cases").select("id", { count: "exact", head: true })
      .eq("member_id", session.user.id).not("status", "in", "(resolved,closed)")
      .then(({ count }) => setOpenCount(count ?? 0));
    if (isOfficer) supabase.from("desk_stats").select("*").single().then(({ data }) => setStats((data as DeskStats) ?? null));
  }, [session, isOfficer]));

  const first = (profile?.full_name ?? "").split(" ")[0];

  return (
    <Screen>
      <View style={{ gap: space.sm }}>
        <Label>{t.home.hello}{first ? `, ${first}` : ""}</Label>
        <H1>{t.home.heroH}</H1>
        <Txt muted>{t.home.heroP}</Txt>
      </View>

      <View style={{ gap: space.sm }}>
        <Button title={t.home.report} icon="add-circle-outline" onPress={() => router.push("/new-case")} />
        <Row wrap={false}>
          <Button style={{ flex: 1 }} variant="secondary" title={t.home.track + (openCount ? ` (${openCount})` : "")} icon="folder-open-outline" onPress={() => router.push("/(tabs)/cases")} />
          <Button style={{ flex: 1 }} variant="secondary" title={t.home.ask} icon="chatbubbles-outline" onPress={() => router.push("/(tabs)/assistant")} />
        </Row>
      </View>

      {isOfficer && stats ? (
        <Card onPress={() => router.push("/(tabs)/desk")} style={{ backgroundColor: stats.overdue ? c.badSoft : c.blueSoft, borderColor: "transparent" }}>
          <Row style={{ justifyContent: "space-between" }} wrap={false}>
            <View style={{ gap: 2, flex: 1 }}>
              <Txt bold>{t.home.deskBanner}</Txt>
              <Text style={{ color: stats.overdue ? c.bad : c.ink, fontSize: 22, fontWeight: "800" }}>
                {stats.overdue} · {stats.due_soon}
              </Text>
              <Txt small muted>{t.home.deskBannerSub} · {stats.open_cases} {t.home.open}</Txt>
            </View>
            <Ionicons name="chevron-forward" size={22} color={c.ink} />
          </Row>
        </Card>
      ) : null}

      <View style={{ backgroundColor: c.blueSoft, borderRadius: radius.lg, padding: space.lg, gap: space.md }}>
        <H2>{t.home.promiseH}</H2>
        {t.home.promise.map(([k, v]) => (
          <View key={k} style={{ flexDirection: "row", gap: space.md, alignItems: "flex-start" }}>
            <Ionicons name="time-outline" size={20} color={c.blue} style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}><Txt bold>{k}</Txt><Txt small muted>{v}</Txt></View>
          </View>
        ))}
      </View>

      <H2>{t.home.catsH}</H2>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/new-case", params: { cat: cat.id } })}
            style={({ pressed }) => ({
              width: "48.5%", backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: radius.md,
              padding: space.md, gap: space.sm, opacity: pressed ? 0.85 : 1,
            })}
          >
            <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: c.blueSoft, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={cat.icon as keyof typeof Ionicons.glyphMap} size={20} color={c.blue} />
            </View>
            <Txt bold>{cat.name[lang]}</Txt>
            <Txt small muted>{cat.blurb[lang]}</Txt>
          </Pressable>
        ))}
      </View>
      <Txt small muted style={{ textAlign: "center" }}>{t.tagline} · TUGHE</Txt>
    </Screen>
  );
}
