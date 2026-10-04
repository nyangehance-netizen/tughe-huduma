import React from "react";
import { View } from "react-native";
import { Card, H3, Screen, Txt } from "../components/ui";
import { useT } from "../lib/i18n";
import { space } from "../lib/theme";

export default function Privacy() {
  const { t } = useT();
  return (
    <Screen>
      {t.privacy.sections.map(([h, p]) => (
        <Card key={h}>
          <H3>{h}</H3>
          <Txt>{p}</Txt>
        </Card>
      ))}
      <View style={{ paddingHorizontal: space.sm }}>
        <Txt small muted>TUGHE · {t.privacy.title} · {t.privacy.version}</Txt>
      </View>
    </Screen>
  );
}
