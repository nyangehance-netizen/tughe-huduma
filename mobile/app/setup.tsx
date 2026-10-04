import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Banner, Button, Field, SelectField, Screen, Txt } from "../components/ui";
import { useAuth } from "../lib/auth";
import { REGIONS } from "../lib/content";
import { useT } from "../lib/i18n";
import { supabase } from "../lib/supabase";
import { space, useColors } from "../lib/theme";

export default function Setup() {
  const { t, lang } = useT();
  const { session, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const S = t.setup;
  const [f, setF] = useState({ full_name: "", check_no: "", member_no: "", employer: "", station: "", region: "", phone: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const c = useColors();
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    if (profile) setF({
      full_name: profile.full_name ?? "", check_no: profile.check_no ?? "", member_no: profile.member_no ?? "",
      employer: profile.employer ?? "", station: profile.station ?? "", region: profile.region ?? "", phone: profile.phone ?? "",
    });
    if (profile?.consent_at) setConsent(true);
  }, [profile]);

  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    setErr("");
    if (!session) { router.replace("/login"); return; }
    if (!f.full_name.trim() || !f.check_no.trim() || !f.employer.trim() || !f.region) { setErr(S.required); return; }
    if (!consent) { setErr(t.privacy.needConsent); return; }
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      full_name: f.full_name.trim(), check_no: f.check_no.trim(), member_no: f.member_no.trim() || null,
      employer: f.employer.trim(), station: f.station.trim() || null, region: f.region, phone: f.phone.trim() || null, lang,
      ...(profile?.consent_at ? {} : { consent_at: new Date().toISOString(), consent_version: t.privacy.version }),
    }).eq("id", session.user.id);
    setBusy(false);
    if (error) { setErr(error.message || t.common.error); return; }
    await refreshProfile();
    if (router.canGoBack()) router.back(); else router.replace("/(tabs)");
  }

  return (
    <Screen>
      <Txt muted>{S.sub}</Txt>
      <View style={{ gap: space.lg }}>
        <Field label={S.name} required value={f.full_name} onChangeText={set("full_name")} autoComplete="name" textContentType="name" />
        <Field label={S.check} required value={f.check_no} onChangeText={set("check_no")} keyboardType="number-pad" />
        <Field label={S.employer} required value={f.employer} onChangeText={set("employer")} placeholder={S.employerPh} />
        <Field label={S.station} value={f.station} onChangeText={set("station")} />
        <SelectField label={S.region} required value={f.region} onChange={set("region")} options={REGIONS.map((r) => ({ value: r, label: r }))} />
        <Field label={S.phone} value={f.phone} onChangeText={set("phone")} keyboardType="phone-pad" placeholder="07XX XXX XXX" />
        <Field label={S.member} value={f.member_no} onChangeText={set("member_no")} autoCapitalize="characters" />
        <Pressable onPress={() => setConsent((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: consent }}
          style={{ flexDirection: "row", gap: space.md, alignItems: "flex-start" }}>
          <Ionicons name={consent ? "checkbox" : "square-outline"} size={24} color={c.blue} />
          <Txt style={{ flex: 1 }}>{t.privacy.consent}</Txt>
        </Pressable>
        <Button small variant="ghost" icon="shield-checkmark-outline" title={t.privacy.read} onPress={() => router.push("/privacy")} />
        {err ? <Banner tone="bad" text={err} /> : null}
        <Button title={S.continue} onPress={save} loading={busy} />
      </View>
    </Screen>
  );
}
