import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Linking, View } from "react-native";
import { Button, Card, Chip, H2, KV, Label, Row, Screen, Txt } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { CONTACTS } from "../../lib/content";
import { useT } from "../../lib/i18n";
import { pushEnabled, registerForPush } from "../../lib/push";
import { space } from "../../lib/theme";

export default function Account() {
  const { t, lang, setLang } = useT();
  const { profile, session, signOut } = useAuth();
  const router = useRouter();
  const [notif, setNotif] = useState<boolean | null>(null);
  const A = t.account;

  useEffect(() => { pushEnabled().then(setNotif).catch(() => setNotif(false)); }, []);

  return (
    <Screen>
      <Card>
        <Row style={{ justifyContent: "space-between" }}>
          <H2>{profile?.full_name || "—"}</H2>
          <Label>{A.role[profile?.role ?? "member"]}</Label>
        </Row>
        <Row gap={space.md}>
          <KV k={t.setup.check} v={profile?.check_no} mono />
          <KV k={t.setup.member} v={profile?.member_no} mono />
          <KV k={t.setup.employer} v={profile?.employer} />
          <KV k={t.setup.region} v={profile?.region} />
          <KV k={t.setup.phone} v={profile?.phone ?? session?.user.phone ?? null} mono />
        </Row>
        <Button small variant="secondary" icon="create-outline" title={A.profile} onPress={() => router.push("/setup")} />
      </Card>

      <Card>
        <Label>{A.lang}</Label>
        <Row>
          <Chip label="Kiswahili" selected={lang === "sw"} onPress={() => setLang("sw")} />
          <Chip label="English" selected={lang === "en"} onPress={() => setLang("en")} />
        </Row>
        <Label>{A.notif}</Label>
        {notif ? <Txt>✓ {A.notifOn}</Txt> : (
          <Button small variant="secondary" icon="notifications-outline" title={A.notifOff}
            onPress={async () => { if (session) setNotif(await registerForPush(session.user.id)); }} />
        )}
      </Card>

      <Card>
        <H2>{A.contacts}</H2>
        <View style={{ gap: space.md }}>
          <KV k={A.hq} v={CONTACTS.address} />
          <KV k={A.phone} v={CONTACTS.phone} mono />
          <KV k={A.email} v={CONTACTS.email} mono />
        </View>
        <Row>
          <Button small icon="call-outline" title={A.phone} onPress={() => Linking.openURL(`tel:${CONTACTS.phoneDial}`)} />
          <Button small variant="secondary" icon="mail-outline" title={A.email} onPress={() => Linking.openURL(`mailto:${CONTACTS.email}`)} />
          <Button small variant="secondary" icon="globe-outline" title={A.web} onPress={() => Linking.openURL(CONTACTS.web)} />
        </Row>
      </Card>

      <Button variant="danger" icon="log-out-outline" title={A.signOut} onPress={async () => { await signOut(); router.replace("/login"); }} />
      <Txt small muted style={{ textAlign: "center" }}>{t.appName} · {A.version} {Constants.expoConfig?.version ?? "1.0.0"} · {t.tagline}</Txt>
    </Screen>
  );
}
