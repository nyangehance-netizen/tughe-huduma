import { Ionicons } from "@expo/vector-icons";
import { Redirect, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import { Banner, Button, Card, Field, H2, KV, Label, Loading, Row, Screen, SelectField, Txt } from "../components/ui";
import { useAuth } from "../lib/auth";
import { REGIONS } from "../lib/content";
import { fmtDate, useT } from "../lib/i18n";
import { supabase } from "../lib/supabase";
import { space, useColors } from "../lib/theme";
import type { StaffApplication, StaffPosition } from "../lib/types";

const POSITIONS: StaffPosition[] = ["zonal", "regional", "branch", "legal", "hq", "ict"];

/** TUGHE Dawati: an officer applies here, then waits until an administrator approves them. */
export default function StaffApply() {
  const c = useColors();
  const { t, lang } = useT();
  const { session, profile, refreshProfile, signOut, isOfficer } = useAuth();
  const router = useRouter();
  const S = t.staff;
  const [app, setApp] = useState<StaffApplication | null | undefined>(undefined);
  const [f, setF] = useState({ full_name: "", staff_no: "", position: "", office_region: "", work_email: "" });
  const [pledge, setPledge] = useState(false);
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    await refreshProfile();
    const { data } = await supabase.from("staff_applications").select("*").eq("user_id", session.user.id).maybeSingle();
    setApp((data as StaffApplication) ?? null);
  }, [session, refreshProfile]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (isOfficer) return <Redirect href="/(tabs)/desk" />;
  if (app === undefined) return <Loading />;

  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  async function send() {
    setErr("");
    if (!f.full_name.trim() || !f.staff_no.trim() || !f.position || !f.office_region || !/^\S+@\S+\.\S+$/.test(f.work_email.trim()) || !pledge || !consent) {
      setErr(S.needAll); return;
    }
    setBusy(true);
    const { error } = await supabase.from("staff_applications").insert({
      full_name: f.full_name.trim(), staff_no: f.staff_no.trim(), position: f.position, office_region: f.office_region, work_email: f.work_email.trim().toLowerCase(),
    });
    if (!error && profile && !profile.consent_at) {
      await supabase.from("profiles").update({ consent_at: new Date().toISOString(), consent_version: t.privacy.version }).eq("id", profile.id);
    }
    setBusy(false);
    if (error) { setErr(error.message || t.common.error); return; }
    load();
  }

  const signOutBtn = <Button variant="ghost" icon="log-out-outline" title={t.account.signOut} onPress={async () => { await signOut(); router.replace("/login"); }} />;

  if (app) {
    const tone = app.status === "pending" ? "info" : app.status === "approved" ? "ok" : "bad";
    return (
      <Screen>
        <Banner tone={tone} text={S.status[app.status]} />
        <Txt>{app.status === "pending" ? S.pendingP : app.status === "approved" ? "" : S.contactIct}</Txt>
        {app.reason ? <Card><Label>{S.reason}</Label><Txt>{app.reason}</Txt></Card> : null}
        <Card>
          <Row gap={space.md}>
            <KV k={S.name} v={app.full_name} />
            <KV k={S.staffNo} v={app.staff_no} mono />
            <KV k={S.position} v={S.positions[app.position]} />
            <KV k={S.office} v={app.office_region} />
            <KV k={S.applied} v={fmtDate(app.created_at, lang, true)} />
            {app.decided_by_name ? <KV k={S.decided} v={`${app.decided_by_name} · ${fmtDate(app.decided_at, lang, true)}`} /> : null}
          </Row>
        </Card>
        <Button variant="secondary" icon="refresh-outline" title={S.refresh} onPress={async () => { await load(); router.replace("/"); }} />
        {signOutBtn}
      </Screen>
    );
  }

  const check = (on: boolean, toggle: () => void, label: string) => (
    <Pressable onPress={toggle} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={{ flexDirection: "row", gap: space.md, alignItems: "flex-start" }}>
      <Ionicons name={on ? "checkbox" : "square-outline"} size={24} color={c.blue} />
      <Txt style={{ flex: 1 }}>{label}</Txt>
    </Pressable>
  );

  return (
    <Screen>
      <H2>{S.applyH}</H2>
      <Txt muted>{S.applyP}</Txt>
      <View style={{ gap: space.lg }}>
        <Field label={S.name} required value={f.full_name} onChangeText={set("full_name")} autoComplete="name" />
        <Field label={S.staffNo} required value={f.staff_no} onChangeText={set("staff_no")} autoCapitalize="characters" />
        <SelectField label={S.position} required value={f.position} onChange={set("position")} options={POSITIONS.map((p) => ({ value: p, label: S.positions[p] }))} />
        <SelectField label={S.office} required value={f.office_region} onChange={set("office_region")} options={REGIONS.map((r) => ({ value: r, label: r }))} />
        <Field label={S.email} required value={f.work_email} onChangeText={set("work_email")} keyboardType="email-address" autoCapitalize="none" hint={S.emailHint} />
        {check(pledge, () => setPledge((v) => !v), S.pledge)}
        {check(consent, () => setConsent((v) => !v), t.privacy.consent)}
        <Button small variant="ghost" icon="shield-checkmark-outline" title={t.privacy.read} onPress={() => router.push("/privacy")} />
        {err ? <Banner tone="bad" text={err} /> : null}
        <Button title={S.send} icon="send-outline" onPress={send} loading={busy} />
        {signOutBtn}
      </View>
    </Screen>
  );
}
