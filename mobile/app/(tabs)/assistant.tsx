import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Composer } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { BotAction, botReply, categoryAnswer, quickActions } from "../../lib/bot";
import { useT } from "../../lib/i18n";
import { isConfigured, supabase } from "../../lib/supabase";
import { radius, space, useColors } from "../../lib/theme";
import type { Case } from "../../lib/types";

interface Line { id: number; from: "user" | "bot"; text: string; actions: BotAction[] }

export default function Assistant() {
  const c = useColors();
  const { t, lang } = useT();
  const { session } = useAuth();
  const router = useRouter();
  const B = t.bot;
  const [lines, setLines] = useState<Line[]>([{ id: 0, from: "bot", text: B.hello, actions: quickActions(B) }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiOn, setAiOn] = useState(isConfigured);
  const [myCases, setMyCases] = useState<Case[]>([]);
  const scroller = useRef<ScrollView>(null);
  const nextId = useRef(1);

  useFocusEffect(useCallback(() => {
    if (!session) return;
    supabase.from("cases").select("*").eq("member_id", session.user.id).order("updated_at", { ascending: false }).limit(20)
      .then(({ data }) => setMyCases((data as Case[]) ?? []));
  }, [session]));

  const push = (l: Omit<Line, "id">) => setLines((prev) => [...prev, { ...l, id: nextId.current++ }]);

  async function ask(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    setInput("");
    const history = [...lines, { id: -1, from: "user" as const, text: question, actions: [] }];
    push({ from: "user", text: question, actions: [] });

    const r = botReply(question, lang, B, myCases, (s) => t.status[s], t.cases.resolveBy, aiOn);
    if (!r.useAI) { push({ from: "bot", text: r.text, actions: r.actions }); return; }

    setBusy(true);
    const messages = history.filter((l) => l.text).slice(-10).map((l) => ({ role: l.from === "user" ? "user" : "assistant", content: l.text }));
    const { data, error } = await supabase.functions.invoke("assistant", { body: { mode: "chat", lang, messages } });
    setBusy(false);
    if (error || !data?.text) {
      // Assistant not configured on the server, or no connection: answer from built-in guidance.
      if ((error as { context?: { status?: number } } | null)?.context?.status === 503) setAiOn(false);
      const fb = r.category ? categoryAnswer(r.category, lang, B) : { text: B.aiErr, actions: [{ kind: "report" as const, label: B.act.report }] };
      push({ from: "bot", text: fb.text, actions: fb.actions });
      return;
    }
    const cat: string | null = data.category && data.category !== "none" ? data.category : null;
    push({
      from: "bot", text: data.text,
      actions: cat
        ? [{ kind: "report", label: B.act.report, category: cat }, { kind: "guide", label: B.act.guide, category: cat }]
        : [{ kind: "report", label: B.act.report }, { kind: "contacts", label: B.act.contact }],
    });
  }

  function act(a: BotAction) {
    switch (a.kind) {
      case "ask": ask(a.text); break;
      case "report": router.push(a.category ? { pathname: "/new-case", params: { cat: a.category } } : "/new-case"); break;
      case "guide": router.push(a.category ? { pathname: "/(tabs)/guide", params: { cat: a.category } } : "/(tabs)/guide"); break;
      case "cases": router.push("/(tabs)/cases"); break;
      case "case": router.push(`/case/${a.id}`); break;
      case "contacts": router.push("/(tabs)/account"); break;
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}>
      <ScrollView
        ref={scroller}
        contentContainerStyle={{ padding: space.lg, gap: space.md }}
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {lines.map((l, i) => (
          <View key={l.id} style={{ alignSelf: l.from === "user" ? "flex-end" : "flex-start", maxWidth: "90%", gap: space.sm }}>
            <View style={{ backgroundColor: l.from === "user" ? c.blue : c.surface, borderColor: c.line, borderWidth: l.from === "user" ? 0 : 1, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 10 }}>
              <Text selectable style={{ color: l.from === "user" ? c.blueInk : c.ink, fontSize: 15, lineHeight: 21 }}>{l.text}</Text>
            </View>
            {l.actions.length && i === lines.length - 1 ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {l.actions.map((a, j) => (
                  <Pressable key={j} onPress={() => act(a)} accessibilityRole="button"
                    style={({ pressed }) => ({ borderColor: c.sky, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: pressed ? c.skySoft : c.surface })}>
                    <Text style={{ color: c.sky, fontWeight: "600", fontSize: 13.5 }}>{a.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ))}
        {busy ? <Text style={{ color: c.muted }}>{B.name}…</Text> : null}
      </ScrollView>
      <View style={{ padding: space.md, borderTopColor: c.line, borderTopWidth: 1, backgroundColor: c.surface }}>
        <Composer value={input} onChange={setInput} onSend={() => ask(input)} sending={busy} placeholder={B.ph} />
      </View>
    </KeyboardAvoidingView>
  );
}
