import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput,
  TextInputProps, View, ViewStyle, StyleProp, TextStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ago, useT } from "../lib/i18n";
import { Sla } from "../lib/sla";
import { font, radius, space, useColors } from "../lib/theme";
import type { CaseStatus, Message } from "../lib/types";

/* ---------- layout ---------- */
export function Screen({ children, scroll = true, padded = true, edges }: {
  children: React.ReactNode; scroll?: boolean; padded?: boolean; edges?: ("top" | "bottom" | "left" | "right")[];
}) {
  const c = useColors();
  const inner = padded ? { padding: space.lg, gap: space.lg } : undefined;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={edges ?? ["left", "right"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
        {scroll ? (
          <ScrollView contentContainerStyle={[inner, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        ) : (
          <View style={[{ flex: 1 }, inner]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Row({ children, style, gap = space.sm, wrap = true }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; gap?: number; wrap?: boolean }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap, flexWrap: wrap ? "wrap" : "nowrap" }, style]}>{children}</View>;
}

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const c = useColors();
  const base: ViewStyle = { backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: radius.lg, padding: space.lg, gap: space.md };
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.85 }, style]} accessibilityRole="button">
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

/* ---------- text ---------- */
export function H1({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return <Text style={{ fontSize: font.h1, fontWeight: "800", color: c.ink, letterSpacing: -0.3 }}>{children}</Text>;
}
export function H2({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return <Text style={{ fontSize: font.h2, fontWeight: "700", color: c.ink }}>{children}</Text>;
}
export function H3({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return <Text style={[{ fontSize: font.h3, fontWeight: "700", color: c.ink }, style]}>{children}</Text>;
}
export function Txt({ children, style, muted, small, bold, selectable }: {
  children: React.ReactNode; style?: StyleProp<TextStyle>; muted?: boolean; small?: boolean; bold?: boolean; selectable?: boolean;
}) {
  const c = useColors();
  return (
    <Text selectable={selectable} style={[{ color: muted ? c.muted : c.ink, fontSize: small ? font.small : font.body, lineHeight: small ? 18 : 22, fontWeight: bold ? "600" : "400" }, style]}>
      {children}
    </Text>
  );
}
export function Label({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", color: c.muted }}>{children}</Text>;
}
export function Mono({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return <Text selectable style={[{ fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }), color: c.ink, fontSize: 13 }, style]}>{children}</Text>;
}

/* ---------- controls ---------- */
export function Button({ title, onPress, variant = "primary", loading, disabled, small, icon, style }: {
  title: string; onPress?: () => void; variant?: "primary" | "secondary" | "ghost" | "danger"; loading?: boolean; disabled?: boolean;
  small?: boolean; icon?: keyof typeof Ionicons.glyphMap; style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const bg = variant === "primary" ? c.blue : variant === "danger" ? c.badSoft : variant === "secondary" ? c.surface : "transparent";
  const fg = variant === "primary" ? c.blueInk : variant === "danger" ? c.bad : c.blue;
  const border = variant === "secondary" ? c.line : "transparent";
  const off = disabled || loading;
  return (
    <Pressable
      onPress={off ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off }}
      style={({ pressed }) => [{
        backgroundColor: bg, borderColor: border, borderWidth: 1, borderRadius: radius.sm,
        paddingVertical: small ? 8 : 13, paddingHorizontal: small ? 12 : 18, minHeight: small ? 36 : 48,
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, opacity: off ? 0.55 : pressed ? 0.85 : 1,
      }, style]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={small ? 16 : 19} color={fg} /> : null}
      <Text style={{ color: fg, fontWeight: "700", fontSize: small ? 14 : 15.5 }}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, hint, required, error, style, ...props }: TextInputProps & {
  label: string; hint?: string; required?: boolean; error?: string; style?: StyleProp<TextStyle>;
}) {
  const c = useColors();
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 13.5, fontWeight: "600", color: c.ink }}>{label}{required ? " *" : ""}</Text>
      <TextInput
        placeholderTextColor={c.muted}
        {...props}
        onFocus={(e) => { setFocus(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocus(false); props.onBlur?.(e); }}
        style={[{
          backgroundColor: c.surface, color: c.ink, borderColor: error ? c.bad : focus ? c.blue : c.line, borderWidth: focus ? 2 : 1,
          borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: props.multiline ? 10 : 11, fontSize: 15.5,
          minHeight: props.multiline ? 120 : 48, textAlignVertical: props.multiline ? "top" : "center",
        }, style]}
      />
      {error ? <Text style={{ color: c.bad, fontSize: 12.5 }}>{error}</Text> : hint ? <Text style={{ color: c.muted, fontSize: 12.5 }}>{hint}</Text> : null}
    </View>
  );
}

export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress?: () => void; icon?: keyof typeof Ionicons.glyphMap }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => ({
        borderRadius: radius.pill, borderWidth: 1, borderColor: selected ? c.blue : c.line,
        backgroundColor: selected ? c.blue : c.surface, paddingHorizontal: 13, paddingVertical: 8, opacity: pressed ? 0.8 : 1,
        flexDirection: "row", alignItems: "center", gap: 6,
      })}
    >
      {icon ? <Ionicons name={icon} size={14} color={selected ? c.blueInk : c.blue} /> : null}
      <Text style={{ color: selected ? c.blueInk : c.ink, fontWeight: "600", fontSize: 13.5 }}>{label}</Text>
    </Pressable>
  );
}

export function SelectField({ label, value, options, onChange, required, placeholder }: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; required?: boolean; placeholder?: string;
}) {
  const c = useColors();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 13.5, fontWeight: "600", color: c.ink }}>{label}{required ? " *" : ""}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        style={{ backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 12, minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
      >
        <Text style={{ color: current ? c.ink : c.muted, fontSize: 15.5, flex: 1 }} numberOfLines={1}>{current?.label ?? placeholder ?? t.common.choose}</Text>
        <Ionicons name="chevron-down" size={18} color={c.muted} />
      </Pressable>
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(10,12,40,0.45)" }} onPress={() => setOpen(false)} />
        <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: "70%", paddingBottom: 28 }}>
          <View style={{ padding: space.lg, borderBottomColor: c.line, borderBottomWidth: 1 }}><H3>{label}</H3></View>
          <FlatList
            data={options}
            keyExtractor={(o) => o.value}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => { onChange(item.value); setOpen(false); }}
                style={({ pressed }) => ({ paddingVertical: 14, paddingHorizontal: space.lg, flexDirection: "row", justifyContent: "space-between", backgroundColor: pressed ? c.sunk : "transparent" })}
              >
                <Text style={{ color: c.ink, fontSize: 16 }}>{item.label}</Text>
                {item.value === value ? <Ionicons name="checkmark" size={20} color={c.blue} /> : null}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

/* ---------- status ---------- */
export function StatusPill({ status }: { status: CaseStatus }) {
  const c = useColors();
  const { t } = useT();
  const map: Record<CaseStatus, [string, string]> = {
    received: [c.infoSoft, c.info], review: [c.warnSoft, c.warn], action: [c.blue, c.blueInk], resolved: [c.okSoft, c.ok], closed: [c.sunk, c.muted],
  };
  const [bg, fg] = map[status];
  return (
    <View style={{ backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: fg }} />
      <Text style={{ color: fg, fontWeight: "700", fontSize: 12.5 }}>{t.status[status]}</Text>
    </View>
  );
}

export function SlaChip({ sla }: { sla: Sla }) {
  const c = useColors();
  const tones = { ok: [c.okSoft, c.ok], neutral: [c.sunk, c.muted], warn: [c.warnSoft, c.warn], bad: [c.badSoft, c.bad] } as const;
  const [bg, fg] = tones[sla.tone];
  return (
    <View style={{ backgroundColor: bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start" }}>
      <Text style={{ color: fg, fontWeight: "700", fontSize: 12 }}>{sla.text}</Text>
    </View>
  );
}

export function Progress({ status }: { status: CaseStatus }) {
  const c = useColors();
  const { t } = useT();
  const idx = { received: 0, review: 1, action: 2, resolved: 3, closed: 3 }[status];
  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {t.steps.map((s, i) => (
        <View key={s} style={{ flex: 1, gap: 5 }}>
          <View style={{ height: 5, borderRadius: 3, backgroundColor: i <= idx ? c.blue : c.sunk }} />
          <Text style={{ fontSize: 11, color: i <= idx ? c.ink : c.muted, fontWeight: i <= idx ? "600" : "400" }} numberOfLines={1}>{s}</Text>
        </View>
      ))}
    </View>
  );
}

export function Banner({ text, tone = "info" }: { text: string; tone?: "info" | "warn" | "bad" | "ok" }) {
  const c = useColors();
  const tones = { info: [c.skySoft, c.ink], warn: [c.warnSoft, c.warn], bad: [c.badSoft, c.bad], ok: [c.okSoft, c.ok] } as const;
  const [bg, fg] = tones[tone];
  return <View style={{ backgroundColor: bg, borderRadius: radius.sm, padding: space.md }}><Text style={{ color: fg, fontSize: 14, lineHeight: 20 }}>{text}</Text></View>;
}

export function Empty({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ borderWidth: 1, borderStyle: "dashed", borderColor: c.line, borderRadius: radius.lg, padding: space.xl, alignItems: "center", gap: space.md, backgroundColor: c.surface }}>
      <H3 style={{ textAlign: "center" }}>{title}</H3>
      {body ? <Txt muted style={{ textAlign: "center" }}>{body}</Txt> : null}
      {action}
    </View>
  );
}

export function Loading() {
  const c = useColors();
  return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40, backgroundColor: c.bg }}><ActivityIndicator color={c.blue} size="large" /></View>;
}

/* ---------- conversation ---------- */
export function Bubble({ m, viewer }: { m: Message; viewer: "member" | "officer" }) {
  const c = useColors();
  const { t, lang } = useT();
  const mine = m.kind === viewer;
  const isBot = m.kind === "bot";
  const bg = isBot ? c.skySoft : mine ? c.blue : c.sunk;
  const fg = mine && !isBot ? c.blueInk : c.ink;
  const who = isBot ? t.bot.name : !mine ? (m.sender_name ?? "") : "";
  return (
    <View style={{ alignSelf: mine && !isBot ? "flex-end" : "flex-start", maxWidth: "88%", backgroundColor: bg, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 9, gap: 3 }}>
      {who ? <Text style={{ fontSize: 12, fontWeight: "700", color: isBot ? c.sky : c.blue }}>{who}</Text> : null}
      <Text selectable style={{ color: fg, fontSize: 15, lineHeight: 21 }}>{m.body}</Text>
      <Text style={{ color: fg, opacity: 0.7, fontSize: 11 }}>{ago(m.created_at, lang)}</Text>
    </View>
  );
}

export function Composer({ value, onChange, onSend, placeholder, sending, minHeight = 46 }: {
  value: string; onChange: (s: string) => void; onSend: () => void; placeholder: string; sending?: boolean; minHeight?: number;
}) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", gap: space.sm, alignItems: "flex-end" }}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        multiline
        style={{ flex: 1, minHeight, maxHeight: 160, backgroundColor: c.surface, color: c.ink, borderColor: c.line, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15.5, textAlignVertical: "top" }}
      />
      <Pressable
        onPress={sending || !value.trim() ? undefined : onSend}
        accessibilityRole="button"
        accessibilityLabel="send"
        style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: value.trim() ? c.blue : c.sunk, alignItems: "center", justifyContent: "center" }}
      >
        {sending ? <ActivityIndicator color={c.blueInk} /> : <Ionicons name="send" size={19} color={value.trim() ? c.blueInk : c.muted} />}
      </Pressable>
    </View>
  );
}

export function KV({ k, v, mono }: { k: string; v: string | null | undefined; mono?: boolean }) {
  return (
    <View style={{ gap: 2, minWidth: "45%", flexGrow: 1 }}>
      <Label>{k}</Label>
      {mono ? <Mono>{v || "—"}</Mono> : <Txt selectable>{v || "—"}</Txt>}
    </View>
  );
}
