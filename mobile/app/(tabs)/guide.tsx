import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Button, H3, Label, Screen, Txt } from "../../components/ui";
import { CATEGORIES } from "../../lib/content";
import { useT } from "../../lib/i18n";
import { radius, space, useColors } from "../../lib/theme";

export default function Guide() {
  const c = useColors();
  const { t, lang } = useT();
  const router = useRouter();
  const { cat } = useLocalSearchParams<{ cat?: string }>();
  const [open, setOpen] = useState<string | null>(cat ?? null);
  useEffect(() => { if (cat) setOpen(cat); }, [cat]);

  return (
    <Screen>
      <Txt muted>{t.guide.sub}</Txt>
      {CATEGORIES.map((k) => {
        const isOpen = open === k.id;
        return (
          <View key={k.id} style={{ backgroundColor: c.surface, borderColor: isOpen ? c.blue : c.line, borderWidth: 1, borderRadius: radius.md, overflow: "hidden" }}>
            <Pressable onPress={() => setOpen(isOpen ? null : k.id)} accessibilityRole="button" accessibilityState={{ expanded: isOpen }}
              style={{ flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg }}>
              <Ionicons name={k.icon as keyof typeof Ionicons.glyphMap} size={20} color={c.blue} />
              <H3 style={{ flex: 1 }}>{k.name[lang]}</H3>
              <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={18} color={c.muted} />
            </Pressable>
            {isOpen ? (
              <View style={{ paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.md }}>
                {k.guide[lang].map((g) => <Txt key={g}>• {g}</Txt>)}
                {k.docs[lang].length ? (<View style={{ gap: 4 }}><Label>{t.guide.docs}</Label><Txt small muted>{k.docs[lang].join(" · ")}</Txt></View>) : null}
                {k.law ? (<View style={{ gap: 4 }}><Label>{t.guide.law}</Label><Txt small muted>{k.law}</Txt></View>) : null}
                <Button small variant="secondary" title={t.guide.report} onPress={() => router.push({ pathname: "/new-case", params: { cat: k.id } })} />
              </View>
            ) : null}
          </View>
        );
      })}
    </Screen>
  );
}
