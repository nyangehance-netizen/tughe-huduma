import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, View } from "react-native";
import { Banner, Button, Chip, Field, H1, Row, Screen, Txt } from "../components/ui";
import { useT } from "../lib/i18n";
import { isConfigured, supabase } from "../lib/supabase";
import { BRAND, radius, space, useColors } from "../lib/theme";
import { IS_STAFF_APP } from "../lib/variant";

/** 0754 123 456 → +255754123456 */
function normalizePhone(raw: string): string | null {
  let p = raw.replace(/[\s\-()]/g, "");
  if (p.startsWith("0") && p.length === 10) p = "+255" + p.slice(1);
  else if (p.startsWith("255")) p = "+" + p;
  else if (/^[67]\d{8}$/.test(p)) p = "+255" + p;
  return /^\+255[67]\d{8}$/.test(p) ? p : null;
}

export default function Login() {
  const c = useColors();
  const { t, lang, setLang } = useT();
  const router = useRouter();
  const [mode, setMode] = useState<"phone" | "email">("phone");
  const [step, setStep] = useState<"enter" | "code">("enter");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const L = t.login;

  const target = mode === "phone" ? normalizePhone(phone) : /^\S+@\S+\.\S+$/.test(email.trim()) ? email.trim().toLowerCase() : null;

  async function sendCode() {
    setErr("");
    if (!target) { setErr(mode === "phone" ? L.badPhone : L.badEmail); return; }
    setBusy(true);
    const { error } = mode === "phone"
      ? await supabase.auth.signInWithOtp({ phone: target })
      : await supabase.auth.signInWithOtp({ email: target, options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) { setErr(error.message || t.common.error); return; }
    setStep("code");
  }

  async function verify() {
    setErr("");
    if (!target || code.trim().length < 6) { setErr(L.badCode); return; }
    setBusy(true);
    const { error } = mode === "phone"
      ? await supabase.auth.verifyOtp({ phone: target, token: code.trim(), type: "sms" })
      : await supabase.auth.verifyOtp({ email: target, token: code.trim(), type: "email" });
    setBusy(false);
    if (error) { setErr(L.badCode); return; }
    router.replace("/");
  }

  return (
    <Screen edges={["top", "left", "right", "bottom"]}>
      <Row style={{ justifyContent: "flex-end" }}>
        <Chip label="Kiswahili" selected={lang === "sw"} onPress={() => setLang("sw")} />
        <Chip label="English" selected={lang === "en"} onPress={() => setLang("en")} />
      </Row>
      <View style={{ alignItems: "center", gap: space.md, paddingVertical: space.lg }}>
        <View style={{ width: 112, height: 112, borderRadius: 56, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: BRAND }}>
          <Image source={require("../assets/logo.png")} style={{ width: 100, height: 100, borderRadius: 50 }} accessibilityLabel="TUGHE" />
        </View>
        <Txt bold style={{ color: c.blue, letterSpacing: 0.5 }}>{IS_STAFF_APP ? t.staff.portal : t.tagline}</Txt>
      </View>
      <H1>{IS_STAFF_APP ? t.staff.appName : L.title}</H1>
      <Txt muted>{IS_STAFF_APP ? t.staff.loginSub : L.sub}</Txt>
      {!isConfigured ? <Banner tone="warn" text={L.notConfigured} /> : null}

      {step === "enter" ? (
        <View style={{ gap: space.lg }}>
          <Row>
            <Chip icon="call-outline" label={L.usePhone} selected={mode === "phone"} onPress={() => { setMode("phone"); setErr(""); }} />
            <Chip icon="mail-outline" label={L.useEmail} selected={mode === "email"} onPress={() => { setMode("email"); setErr(""); }} />
          </Row>
          {mode === "phone" ? (
            <Field label={L.phone} value={phone} onChangeText={setPhone} placeholder={L.phonePh} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" error={err || undefined} />
          ) : (
            <Field label={L.email} value={email} onChangeText={setEmail} placeholder="jina@mfano.go.tz" keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={err || undefined} />
          )}
          <Button title={L.sendCode} onPress={sendCode} loading={busy} disabled={!isConfigured} />
        </View>
      ) : (
        <View style={{ gap: space.lg }}>
          <View style={{ backgroundColor: c.blueSoft, borderRadius: radius.sm, padding: space.md }}>
            <Txt>{L.sentTo} <Txt bold>{target}</Txt></Txt>
          </View>
          <Field label={L.code} value={code} onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} error={err || undefined} style={{ fontSize: 22, letterSpacing: 6, textAlign: "center" }} />
          <Button title={L.verify} onPress={verify} loading={busy} />
          <Row style={{ justifyContent: "space-between" }}>
            <Button title={t.common.cancel} variant="ghost" small onPress={() => { setStep("enter"); setCode(""); setErr(""); }} />
            <Button title={L.resend} variant="ghost" small onPress={sendCode} disabled={busy} />
          </Row>
        </View>
      )}
    </Screen>
  );
}
