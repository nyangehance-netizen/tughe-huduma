import { Stack, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Banner, Bubble, Card, Composer, H3, KV, Label, Loading, Progress, Row, SlaChip, StatusPill, Txt } from "../../components/ui";
import { categoryName } from "../../lib/content";
import { fmtDate, useT } from "../../lib/i18n";
import { isOpen, slaOf } from "../../lib/sla";
import { supabase } from "../../lib/supabase";
import { space, useColors } from "../../lib/theme";
import type { Case, Message } from "../../lib/types";

export default function CaseDetail() {
  const c = useColors();
  const { t, lang } = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [kase, setKase] = useState<Case | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const scroller = useRef<ScrollView>(null);
  const C = t.cases;

  const load = useCallback(async () => {
    const [{ data: cs }, { data: ms }] = await Promise.all([
      supabase.from("cases").select("*").eq("id", id).single(),
      supabase.from("messages").select("*").eq("case_id", id).order("created_at"),
    ]);
    setKase((cs as Case) ?? null);
    setMsgs((ms as Message[]) ?? []);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase.channel(`case-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `case_id=eq.${id}` },
        (p) => setMsgs((prev) => prev.some((m) => m.id === (p.new as Message).id) ? prev : [...prev, p.new as Message]))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "cases", filter: `id=eq.${id}` },
        (p) => setKase(p.new as Case))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setSending(true); setErr("");
    const { data, error } = await supabase.from("messages").insert({ case_id: id, kind: "member", body }).select("*").single();
    setSending(false);
    if (error) { setErr(error.message || t.common.error); return; }
    setText("");
    if (data) setMsgs((prev) => prev.some((m) => m.id === data.id) ? prev : [...prev, data as Message]);
  }

  if (!kase) return <Loading />;
  const open = isOpen(kase);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: kase.ref }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 96 : 0}>
        <ScrollView
          ref={scroller}
          contentContainerStyle={{ padding: space.lg, gap: space.lg }}
          onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
        >
          <Card>
            <Row style={{ justifyContent: "space-between" }}>
              <StatusPill status={kase.status} />
              <SlaChip sla={slaOf(kase, t.sla)} />
            </Row>
            <H3>{kase.title}</H3>
            <Progress status={kase.status} />
            <Row gap={space.lg}>
              {open ? (
                <>
                  {!kase.first_response_at ? <Txt small muted>{C.respondBy}: <Txt small bold>{fmtDate(kase.respond_by, lang)}</Txt></Txt> : null}
                  <Txt small muted>{C.resolveBy}: <Txt small bold>{fmtDate(kase.due_at, lang)}</Txt></Txt>
                </>
              ) : (
                <Txt small muted>{C.resolvedOn}: <Txt small bold>{fmtDate(kase.resolved_at ?? kase.updated_at, lang, true)}</Txt></Txt>
              )}
            </Row>
            <Txt small muted>{C.officer}: {kase.officer_name || C.unassigned}</Txt>
          </Card>

          {kase.resolution ? (
            <Card style={{ backgroundColor: c.okSoft, borderColor: "transparent" }}>
              <Label>{C.resolution}</Label>
              <Txt selectable>{kase.resolution}</Txt>
            </Card>
          ) : null}

          <Card onPress={() => setShowDetails((v) => !v)}>
            <Row style={{ justifyContent: "space-between" }}><Label>{C.details}</Label><Txt small muted>{showDetails ? "▲" : "▼"}</Txt></Row>
            {showDetails ? (
              <View style={{ gap: space.md }}>
                <Txt selectable>{kase.description}</Txt>
                <Row gap={space.md}>
                  <KV k={t.form.category} v={categoryName(kase.category, lang)} />
                  <KV k={t.form.urgency} v={t.urg[kase.urgency]} />
                  <KV k={t.setup.employer} v={kase.employer} />
                  <KV k={t.setup.region} v={kase.region} />
                </Row>
              </View>
            ) : null}
          </Card>

          <Label>{C.convo}</Label>
          <View style={{ gap: space.sm }}>
            {msgs.map((m) => <Bubble key={m.id} m={m} viewer="member" />)}
          </View>
          {err ? <Banner tone="bad" text={err} /> : null}
        </ScrollView>
        <View style={{ padding: space.md, borderTopColor: c.line, borderTopWidth: 1, backgroundColor: c.surface }}>
          {kase.status === "closed"
            ? <Txt muted style={{ textAlign: "center" }}>{C.closedNote}</Txt>
            : <Composer value={text} onChange={setText} onSend={send} sending={sending} placeholder={C.writeMsg} />}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
