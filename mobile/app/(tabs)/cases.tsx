import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { Button, Card, Empty, H3, Mono, Row, Screen, SlaChip, StatusPill, Txt } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { categoryName } from "../../lib/content";
import { ago, useT } from "../../lib/i18n";
import { slaOf } from "../../lib/sla";
import { supabase } from "../../lib/supabase";
import { space, useColors } from "../../lib/theme";
import type { Case } from "../../lib/types";

export default function MyCases() {
  const c = useColors();
  const { t, lang } = useT();
  const { session } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<Case[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const uid = session?.user.id;

  const load = useCallback(async () => {
    if (!uid) return;
    const { data } = await supabase.from("cases").select("*").eq("member_id", uid).order("updated_at", { ascending: false }).limit(200);
    setRows((data as Case[]) ?? []);
  }, [uid]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Live: refresh when an officer changes one of my cases.
  useEffect(() => {
    if (!uid) return;
    const ch = supabase.channel(`my-cases-${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "cases", filter: `member_id=eq.${uid}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [uid, load]);

  return (
    <Screen scroll={false} padded={false}>
      <FlatList
        data={rows ?? []}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ padding: space.lg, gap: space.md, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={c.blue} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListHeaderComponent={<Button title={t.home.report} icon="add-circle-outline" onPress={() => router.push("/new-case")} />}
        ListEmptyComponent={rows ? <Empty title={t.cases.emptyH} body={t.cases.emptyP} /> : <Txt muted>{t.common.loading}</Txt>}
        renderItem={({ item }) => (
          <Card onPress={() => router.push(`/case/${item.id}`)}>
            <Row style={{ justifyContent: "space-between" }} wrap={false}>
              <Mono style={{ color: c.muted }}>{item.ref}</Mono>
              <StatusPill status={item.status} />
            </Row>
            <H3>{item.title}</H3>
            <View style={{ gap: 6 }}>
              <Txt small muted>{categoryName(item.category, lang)} · {t.cases.updated}: {ago(item.updated_at, lang)}</Txt>
              <SlaChip sla={slaOf(item, t.sla)} />
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}
