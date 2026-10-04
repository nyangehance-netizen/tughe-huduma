import { useRouter } from "expo-router";
import React from "react";
import { Banner, Button, Screen } from "../components/ui";
import { useAuth } from "../lib/auth";
import { useT } from "../lib/i18n";
import { IS_STAFF_APP } from "../lib/variant";

/** Shown when someone signs in to the wrong app (an officer in TUGHE Huduma, or a member in TUGHE Dawati). */
export default function WrongApp() {
  const { t } = useT();
  const { signOut } = useAuth();
  const router = useRouter();
  return (
    <Screen edges={["top", "left", "right", "bottom"]}>
      <Banner tone="warn" text={IS_STAFF_APP ? t.staff.wrongAppStaff : t.staff.wrongAppMember} />
      <Button title={t.account.signOut} icon="log-out-outline" onPress={async () => { await signOut(); router.replace("/login"); }} />
    </Screen>
  );
}
