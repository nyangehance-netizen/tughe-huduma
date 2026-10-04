import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { Card, Chip, Empty, H3, Mono, Row, Screen, SelectField, SlaChip, StatusPill, Txt } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { CATEGORIES, categoryName } from "../../lib/content";
import { useT } from "../../lib/i18n";
import { isOpen, slaOf } from "../../lib/sla";
import { supabase } from "../../lib/supabase";
import { radius, space, useColors } from "../../lib/theme";
import type { Case } from "../../lib/types";

type View_ = "open" | "mine" | "unassigned" | "overdue" | "done";

export default function Desk() {
  const c = useColors();
  const { t, lang } = useT();
  const { isOfficer, session } = useAuth();
  const router = useRouter();
  const D = t.desk;
  const [rows, setRows] = useState<Case[] | null>(null);
  const [view, setView] = useState<View_>("open");
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const [cat, setCat] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [, tick] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("cases").select("*").order("due_at", { ascending: true }).limit(1000);
    setRows((data as Case[]) ?? []);
  }, []);

  useFocusEffect(useCallback(() => { if (isOfficer) load(); }, [isOfficer, load]));

  // Live: any case change refreshes the list (debounced); clock ticks each minute so deadlines stay current.
  useEffect(() => {
    if (!isOfficer) return;
    const ch = supabase.channel("desk")
      .on("postgres_changes", { event: "*", schema: "public", table: "cases" }, () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(load, 600);
      })
      .subscribe();
    const iv = setInterval(() => tick((n) => n + 1), 60000);
    return () => { supabase.removeChannel(ch); clearInterval(iv); };
  }, [isOfficer, load]);

  const all = rows ?? [];
  const me = session?.user.id;
  const stats = useMemo(() => {
    const open = all.filter(isOpen);
    const done = all.filter((x) => x.resolved_at);
    const recent = done.filter((x) => new Date(x.resolved_at!).getTime() > Date.now() - 30 * 86400000);
    const avg = done.length ? (done.reduce((s, x) => s + (new Date(x.resolved_at!).getTime() - new Date(x.created_at).getTime()), 0) / done.length / 86400000).toFixed(1) : "—";
    return {
      open: open.length,
      overdue: open.filter((x) => slaOf(x, t.sla).level === 3).length,
      soon: open.filter((x) => slaOf(x, t.sla).level === 2).length,
      unassigned: open.filter((x) => !x.officer_id).length,
      done30: recent.length,
      avg,
    };
  }, [all, t.sla]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const inView = (x: Case) => ({
      open: isOpen(x), mine: isOpen(x) && x.officer_id === me, unassigned: isOpen(x) && !x.officer_id,
      overdue: isOpen(x) && slaOf(x, t.sla).level === 3, done: !isOpen(x),
    })[view];
    return all
      .filter((x) => inView(x) && (!region || x.region === region) && (!cat || x.category === cat) &&
        (!needle || [x.member_name, x.ref, x.employer, x.check_no, x.title].join(" ").toLowerCase().includes(needle)))
      .sort((a, b) => view === "done"
        ? new Date(b.resolved_at ?? b.updated_at).getTime() - new Date(a.resolved_at ?? a.updated_at).getTime()
        : (slaOf(b, t.sla).level - slaOf(a, t.sla).level) || ((a.urgency === "high" ? 0 : 1) - (b.urgency === "high" ? 0 : 1)) ||
          (new Date(a.due_at).getTime() - new Date(b.due_at).getTime()));
  }, [all, view, q, region, cat, me, t.sla]);

  if (!isOfficer) return <Screen><Empty title={D.notOfficer} /></Screen>;

  const tiles: [string, string | number, string, View_ | null][] = [
    [D.st.open, stats.open, c.ink, "open"], [D.st.overdue, stats.overdue, c.bad, "overdue"], [D.st.soon, stats.soon, c.warn, null],
    [D.st.unassigned, stats.unassigned, c.ink, "unassigned"], [D.st.done30, stats.done30, c.ok, "done"], [D.st.avg, stats.avg, c.ink, null],
  ];
  const regions = Array.from(new Set(all.map((x) => x.region).filter(Boolean) as string[])).sort();

  return (
    <Screen scroll={false} padded={false}>
      <FlatList
        data={list}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ padding: space.lg, gap: space.md }}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={c.blue} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListHeaderComponent={
          <View style={{ gap: space.md }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
              {tiles.map(([label, val, color, v]) => (
                <Pressable key={label} onPress={v ? () => setView(v) : undefined}
                  style={{ width: "31.8%", backgroundColor: c.surface, borderRadius: radius.md, borderWidth: v === view ? 2 : 1, borderColor: v === view ? c.blue : c.line, padding: space.sm }}>
                  <Text style={{ fontSize: 22, fontWeight: "800", color }}>{val}</Text>
                  <Text style={{ fontSize: 11.5, color: c.muted }} numberOfLines={1}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
              {(Object.keys(D.views) as View_[]).map((k) => <Chip key={k} label={D.views[k]} selected={view === k} onPress={() => setView(k)} />)}
            </ScrollView>
            <TextInput value={q} onChangeText={setQ} placeholder={D.search} placeholderTextColor={c.muted}
              style={{ backgroundColor: c.surface, color: c.ink, borderColor: c.line, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 12, minHeight: 46, fontSize: 15 }} />
            <Row wrap={false}>
              <View style={{ flex: 1 }}>
                <SelectField label={t.setup.region} value={region} onChange={setRegion} options={[{ value: "", label: D.allRegions }, ...regions.map((r) => ({ value: r, label: r }))]} placeholder={D.allRegions} />
              </View>
              <View style={{ flex: 1 }}>
                <SelectField label={t.form.category} value={cat} onChange={setCat} options={[{ value: "", label: D.allCats }, ...CATEGORIES.map((x) => ({ value: x.id, label: x.name[lang] }))]} placeholder={D.allCats} />
              </View>
            </Row>
          </View>
        }
        ListEmptyComponent={rows ? <Empty title={D.none} /> : <Txt muted>{t.common.loading}</Txt>}
        renderItem={({ item }) => {
          const s = slaOf(item, t.sla);
          const stripe = isOpen(item) ? (s.level === 3 ? c.bad : s.level === 2 ? c.warn : "transparent") : "transparent";
          return (
            <Card onPress={() => router.push(`/desk/${item.id}`)} style={{ borderLeftWidth: 5, borderLeftColor: stripe }}>
              <Row style={{ justifyContent: "space-between" }} wrap={false}>
                <Mono style={{ color: c.muted }}>{item.ref}</Mono>
                <StatusPill status={item.status} />
              </Row>
              <H3>{item.title}</H3>
              <Txt small muted>
                {item.member_name} · {item.region} · {categoryName(item.category, lang)}
                {item.urgency === "high" ? ` · ${t.urg.high.toUpperCase()}` : ""}
              </Txt>
              <Row style={{ justifyContent: "space-between" }}>
                <SlaChip sla={s} />
                <Txt small muted>{item.officer_name || t.cases.unassigned}</Txt>
              </Row>
            </Card>
          );
        }}
      />
    </Screen>
  );
}
