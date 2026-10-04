import { usePreventScreenCapture } from "expo-screen-capture";
import React, { useEffect, useState } from "react";
import { ScrollView, Share, Text } from "react-native";
import { Button, Loading, Screen, Txt } from "../components/ui";
import { useAuth } from "../lib/auth";
import { useT } from "../lib/i18n";
import { supabase } from "../lib/supabase";
import { radius, space, useColors } from "../lib/theme";

/** Everything the server holds about the signed-in member, readable and shareable (data-subject access). */
export default function MyData() {
  usePreventScreenCapture();
  const c = useColors();
  const { t } = useT();
  const { session } = useAuth();
  const [dump, setDump] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const uid = session.user.id;
      const [{ data: profile }, { data: cases }] = await Promise.all([
        supabase.from("profiles").select("full_name, phone, email, check_no, member_no, employer, station, region, lang, consent_at, consent_version, created_at").eq("id", uid).single(),
        supabase.from("cases").select("id, ref, category, title, description, urgency, status, officer_name, created_at, resolved_at, resolution").eq("member_id", uid).order("created_at"),
      ]);
      const ids = (cases ?? []).map((x: { id: string }) => x.id);
      const [{ data: messages }, { data: views }] = ids.length
        ? await Promise.all([
            supabase.from("messages").select("case_id, kind, sender_name, body, created_at").in("case_id", ids).order("created_at"),
            supabase.from("case_views").select("case_id, officer_name, viewed_at").in("case_id", ids).order("viewed_at"),
          ])
        : [{ data: [] }, { data: [] }];
      setDump(JSON.stringify({ exported_at: new Date().toISOString(), profile, cases, messages, officer_views: views }, null, 2));
    })();
  }, [session]);

  if (!dump) return <Loading />;
  return (
    <Screen>
      <Txt muted>{t.privacy.myDataP}</Txt>
      <Button title={t.privacy.share} icon="share-outline" onPress={() => Share.share({ title: "TUGHE Huduma", message: dump })} />
      <ScrollView horizontal style={{ backgroundColor: c.sunk, borderRadius: radius.md }} contentContainerStyle={{ padding: space.md }}>
        <Text selectable style={{ color: c.ink, fontFamily: "monospace", fontSize: 12 }}>{dump}</Text>
      </ScrollView>
    </Screen>
  );
}
