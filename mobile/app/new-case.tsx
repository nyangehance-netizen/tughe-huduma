import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import { Banner, Button, Card, Chip, Field, H2, Label, Mono, Row, Screen, SelectField, Txt } from "../components/ui";
import { useAuth } from "../lib/auth";
import { CATEGORIES, categoryById } from "../lib/content";
import { fmtDate, useT } from "../lib/i18n";
import { supabase } from "../lib/supabase";
import { space, useColors } from "../lib/theme";
import type { Case, ContactPref, Urgency } from "../lib/types";

export default function NewCase() {
  const c = useColors();
  const { t, lang } = useT();
  const { session, profile } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ cat?: string }>();
  const F = t.form;

  const [category, setCategory] = useState(params.cat && CATEGORIES.some((x) => x.id === params.cat) ? params.cat : "");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("normal");
  const [contact, setContact] = useState<ContactPref>("phone");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Case | null>(null);

  async function submit() {
    setErr("");
    if (!category || title.trim().length < 3 || desc.trim().length < 10) { setErr(F.required); return; }
    if (!session) { router.replace("/login"); return; }
    setBusy(true);
    const { data, error } = await supabase.from("cases").insert({
      member_id: session.user.id, category, title: title.trim(), description: desc.trim(), urgency, contact_pref: contact,
    }).select("*").single();
    setBusy(false);
    if (error || !data) { setErr(error?.message || t.common.error); return; }
    setCreated(data as Case);
  }

  if (created) {
    return (
      <Screen>
        <Card style={{ alignItems: "flex-start" }}>
          <Label>{F.sentH}</Label>
          <View style={{ backgroundColor: c.blueSoft, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 }}>
            <Mono style={{ fontSize: 22, color: c.blue, fontWeight: "700" }}>{created.ref}</Mono>
          </View>
          <Txt muted>{F.sentP} <Txt bold>{fmtDate(created.respond_by, lang)}</Txt>.</Txt>
          {created.auto_urgent ? <Banner tone="warn" text={F.autoUrgent} /> : null}
        </Card>
        <Button title={F.view} onPress={() => router.replace(`/case/${created.id}`)} />
        <Button title={F.another} variant="secondary" onPress={() => { setCreated(null); setTitle(""); setDesc(""); setCategory(""); setUrgency("normal"); }} />
      </Screen>
    );
  }

  const cat = category ? categoryById(category) : null;

  return (
    <Screen>
      {profile ? (
        <Txt small muted>{F.from}: {profile.full_name} · {profile.employer} · {profile.region}</Txt>
      ) : null}
      <SelectField label={F.category} required value={category} onChange={setCategory} options={CATEGORIES.map((x) => ({ value: x.id, label: x.name[lang] }))} />
      {cat?.urgent ? <Banner tone="warn" text={t.bot.urgentNote} /> : null}
      <Field label={F.caseTitle} required value={title} onChangeText={setTitle} maxLength={160} />
      <Field label={F.desc} required value={desc} onChangeText={setDesc} multiline maxLength={6000} hint={F.descHint} />
      <View style={{ gap: space.sm }}>
        <Txt bold small>{F.urgency}</Txt>
        <Row>{(["normal", "high"] as Urgency[]).map((u) => <Chip key={u} label={t.urg[u]} selected={urgency === u} onPress={() => setUrgency(u)} />)}</Row>
      </View>
      <View style={{ gap: space.sm }}>
        <Txt bold small>{F.contact}</Txt>
        <Row>{(["phone", "sms", "office"] as ContactPref[]).map((p) => <Chip key={p} label={t.cpref[p]} selected={contact === p} onPress={() => setContact(p)} />)}</Row>
      </View>
      {cat && cat.docs[lang].length ? (
        <Card style={{ backgroundColor: c.skySoft, borderColor: "transparent" }}>
          <H2>{t.guide.docs}</H2>
          {cat.docs[lang].map((d) => <Txt key={d}>• {d}</Txt>)}
        </Card>
      ) : null}
      {err ? <Banner tone="bad" text={err} /> : null}
      <Button title={F.submit} icon="send-outline" onPress={submit} loading={busy} />
    </Screen>
  );
}
