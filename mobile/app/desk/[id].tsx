import { usePreventScreenCapture } from "expo-screen-capture";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Linking, View } from "react-native";
import {
  Banner, Bubble, Button, Card, Chip, Composer, Field, H2, H3, KV, Label, Loading, Row, Screen, SlaChip, StatusPill, Txt,
} from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { categoryById, categoryName } from "../../lib/content";
import { ago, fmtDate, useT } from "../../lib/i18n";
import { addWorkDays, isOpen, slaOf } from "../../lib/sla";
import { errorText, supabase } from "../../lib/supabase";
import { space, useColors } from "../../lib/theme";
import type { Case, CaseEvent, CaseStatus, Message, Note } from "../../lib/types";

const STATUSES: CaseStatus[] = ["received", "review", "action", "resolved", "closed"];

export default function DeskCase() {
  usePreventScreenCapture();
  const c = useColors();
  const { t, lang } = useT();
  const { profile, isOfficer } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const D = t.desk;

  const [kase, setKase] = useState<Case | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [events, setEvents] = useState<CaseEvent[]>([]);
  const [status, setStatus] = useState<CaseStatus>("received");
  const [officer, setOfficer] = useState("");
  const [officerId, setOfficerId] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"" | "save" | "reply" | "note" | "extend" | "ai">("");
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  const load = useCallback(async () => {
    const [cs, ms, ns, es] = await Promise.all([
      supabase.from("cases").select("*").eq("id", id).single(),
      supabase.from("messages").select("*").eq("case_id", id).order("created_at"),
      supabase.from("case_notes").select("*").eq("case_id", id).order("created_at"),
      supabase.from("case_events").select("*").eq("case_id", id).order("created_at", { ascending: false }).limit(30),
    ]);
    const k = cs.data as Case | null;
    setKase(k);
    if (k) { setStatus(k.status); setOfficer(k.officer_name ?? ""); setOfficerId(k.officer_id); setResolution(k.resolution ?? ""); }
    setMsgs((ms.data as Message[]) ?? []);
    setNotes((ns.data as Note[]) ?? []);
    setEvents((es.data as CaseEvent[]) ?? []);
  }, [id]);

  useEffect(() => { load(); }, [load]);
  // Every officer view is recorded and shown to the member.
  useEffect(() => { if (isOfficer && id) supabase.rpc("log_case_view", { p_case: id }).then(() => {}); }, [isOfficer, id]);

  useEffect(() => {
    const ch = supabase.channel(`desk-case-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `case_id=eq.${id}` },
        (p) => setMsgs((prev) => prev.some((m) => m.id === (p.new as Message).id) ? prev : [...prev, p.new as Message]))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "case_notes", filter: `case_id=eq.${id}` },
        (p) => setNotes((prev) => prev.some((n) => n.id === (p.new as Note).id) ? prev : [...prev, p.new as Note]))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "cases", filter: `id=eq.${id}` },
        (p) => setKase(p.new as Case))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  const refreshEvents = async () => {
    const { data } = await supabase.from("case_events").select("*").eq("case_id", id).order("created_at", { ascending: false }).limit(30);
    setEvents((data as CaseEvent[]) ?? []);
  };

  async function save() {
    if (!kase) return;
    setMsg(null);
    if ((status === "resolved" || status === "closed") && !resolution.trim()) { setMsg({ tone: "bad", text: D.needResolution }); return; }
    setBusy("save");
    const { data, error } = await supabase.from("cases")
      .update({ status, officer_name: officer.trim() || null, officer_id: officer.trim() ? officerId : null, resolution: resolution.trim() || null })
      .eq("id", kase.id).select("*").single();
    setBusy("");
    if (error) {
      const e = errorText(error, t.common.error);
      setMsg({ tone: "bad", text: e === "RESOLUTION_REQUIRED" ? D.needResolution : e });
      return;
    }
    setKase(data as Case);
    setMsg({ tone: "ok", text: D.saved });
    refreshEvents();
  }

  async function extend() {
    if (!kase) return;
    setBusy("extend");
    const { data, error } = await supabase.from("cases").update({ due_at: addWorkDays(kase.due_at, 5) }).eq("id", kase.id).select("*").single();
    setBusy("");
    if (error) { setMsg({ tone: "bad", text: errorText(error, t.common.error) }); return; }
    setKase(data as Case);
    refreshEvents();
  }

  function assignMe() {
    if (!profile) return;
    setOfficer(profile.full_name);
    setOfficerId(profile.id);
  }

  async function sendReply() {
    const body = reply.trim();
    if (!body || !kase) return;
    setBusy("reply");
    const { data, error } = await supabase.from("messages").insert({ case_id: kase.id, kind: "officer", body }).select("*").single();
    setBusy("");
    if (error) { setMsg({ tone: "bad", text: errorText(error, t.common.error) }); return; }
    setReply("");
    if (data) setMsgs((prev) => prev.some((m) => m.id === data.id) ? prev : [...prev, data as Message]);
    const { data: fresh } = await supabase.from("cases").select("*").eq("id", kase.id).single();
    if (fresh) { setKase(fresh as Case); setStatus((fresh as Case).status); if (!officer) { setOfficer((fresh as Case).officer_name ?? ""); setOfficerId((fresh as Case).officer_id); } }
    refreshEvents();
  }

  async function addNote() {
    const body = note.trim();
    if (!body || !kase) return;
    setBusy("note");
    const { data, error } = await supabase.from("case_notes").insert({ case_id: kase.id, body }).select("*").single();
    setBusy("");
    if (error) { setMsg({ tone: "bad", text: errorText(error, t.common.error) }); return; }
    setNote("");
    if (data) setNotes((prev) => prev.some((n) => n.id === data.id) ? prev : [...prev, data as Note]);
    refreshEvents();
  }

  async function aiDraft() {
    if (!kase) return;
    setBusy("ai");
    const { data, error } = await supabase.functions.invoke("assistant", { body: { mode: "draft", lang, caseId: kase.id, draft: reply } });
    setBusy("");
    if (error || !data?.text) { setMsg({ tone: "bad", text: t.bot.aiErr }); return; }
    setReply(data.text);
  }

  function applyTemplate(i: number) {
    if (!kase) return;
    let text = D.tpl[i][1];
    if (i === 0) text += categoryById(kase.category).docs[lang].join(", ") + ".";
    setReply(text);
  }

  if (!isOfficer) return <Screen><Banner tone="warn" text={D.notOfficer} /></Screen>;
  if (!kase) return <Loading />;
  const sla = slaOf(kase, t.sla);

  return (
    <Screen>
      <Stack.Screen options={{ title: kase.ref }} />

      <Card>
        <Row style={{ justifyContent: "space-between" }}>
          <StatusPill status={kase.status} />
          <SlaChip sla={sla} />
        </Row>
        <H3>{kase.title}</H3>
        <Txt selectable>{kase.description}</Txt>
        <Row gap={space.md}>
          <KV k={D.member} v={kase.member_name} />
          <KV k={t.setup.check} v={kase.check_no} mono />
          <KV k={t.setup.employer} v={kase.employer} />
          <KV k={t.setup.station} v={kase.station} />
          <KV k={t.setup.region} v={kase.region} />
          <KV k={t.setup.phone} v={kase.member_phone} mono />
          <KV k={t.form.category} v={categoryName(kase.category, lang)} />
          <KV k={t.form.contact} v={`${t.cpref[kase.contact_pref]} · ${t.urg[kase.urgency]}`} />
        </Row>
        {kase.member_phone ? <Button small variant="secondary" icon="call-outline" title={`${D.call} ${kase.member_phone}`} onPress={() => Linking.openURL(`tel:${kase.member_phone}`)} /> : null}
      </Card>

      <Card style={{ backgroundColor: c.blueSoft, borderColor: "transparent" }}>
        <Row gap={space.lg}>
          <KV k={t.cases.respondBy} v={kase.first_response_at ? `✓ ${fmtDate(kase.first_response_at, lang)}` : fmtDate(kase.respond_by, lang)} />
          <KV k={t.cases.resolveBy} v={fmtDate(kase.due_at, lang)} />
        </Row>
        <Label>{D.stage}</Label>
        <Row>{STATUSES.map((s) => <Chip key={s} label={t.status[s]} selected={status === s} onPress={() => setStatus(s)} />)}</Row>
        <Field label={D.assign} value={officer} onChangeText={(v) => { setOfficer(v); if (v !== profile?.full_name) setOfficerId(null); }} />
        <Field label={D.resolution} value={resolution} onChangeText={setResolution} multiline placeholder={D.resolutionPh} style={{ minHeight: 80 }} />
        {msg ? <Banner tone={msg.tone} text={msg.text} /> : null}
        <Row>
          <Button small title={t.common.save} icon="checkmark" onPress={save} loading={busy === "save"} />
          <Button small variant="secondary" title={D.assignMe} icon="person-add-outline" onPress={assignMe} />
          {isOpen(kase) ? <Button small variant="secondary" title={D.extend} icon="time-outline" onPress={extend} loading={busy === "extend"} /> : null}
        </Row>
      </Card>

      <H2>{t.cases.convo}</H2>
      <View style={{ gap: space.sm }}>{msgs.map((m) => <Bubble key={m.id} m={m} viewer="officer" />)}</View>
      <Label>{D.templates}</Label>
      <Row>
        {D.tpl.map((x, i) => <Chip key={x[0]} label={x[0]} onPress={() => applyTemplate(i)} />)}
        <Chip icon="sparkles-outline" label={busy === "ai" ? D.drafting : D.aiDraft} onPress={busy ? undefined : aiDraft} />
      </Row>
      <Composer value={reply} onChange={setReply} onSend={sendReply} sending={busy === "reply"} placeholder={D.reply} minHeight={90} />

      <Card style={{ backgroundColor: c.warnSoft, borderColor: "transparent" }}>
        <Label>{D.notes}</Label>
        {notes.map((n) => (
          <View key={n.id} style={{ gap: 2 }}>
            <Txt selectable>{n.body}</Txt>
            <Txt small muted>{n.author_name} · {ago(n.created_at, lang)}</Txt>
          </View>
        ))}
        <Composer value={note} onChange={setNote} onSend={addNote} sending={busy === "note"} placeholder={D.notePh} />
      </Card>

      {events.length ? (
        <Card>
          <Label>{D.log}</Label>
          {events.map((e) => (
            <Txt key={e.id} small muted>
              {fmtDate(e.created_at, lang, true)} · {D.events[e.event] ?? e.event}
              {e.detail ? ` ${e.event === "status" ? (t.status[e.detail as CaseStatus] ?? e.detail) : e.event === "created" ? "" : e.detail}` : ""}
              {e.actor_name ? ` · ${e.actor_name}` : ""}
            </Txt>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
