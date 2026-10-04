import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { Banner, Button, Card, Empty, Field, H2, H3, KV, Label, Row, Screen, Txt } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { fmtDate, useT } from "../../lib/i18n";
import { errorText, supabase } from "../../lib/supabase";
import { space } from "../../lib/theme";
import type { StaffApplication } from "../../lib/types";

/** Administrators approve, reject or suspend officers. Decisions run through decide_staff_application() in the database. */
export default function Approvals() {
  const { t, lang } = useT();
  const { profile } = useAuth();
  const S = t.staff;
  const [rows, setRows] = useState<StaffApplication[] | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("staff_applications").select("*").order("created_at", { ascending: false });
    setRows((data as StaffApplication[]) ?? []);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (profile?.role !== "admin") return <Screen><Empty title={t.desk.notOfficer} /></Screen>;

  async function decide(a: StaffApplication, decision: "approved" | "rejected" | "suspended") {
    setBusy(a.id + decision); setErr("");
    const { error } = await supabase.rpc("decide_staff_application", { p_id: a.id, p_decision: decision, p_reason: reasons[a.id] ?? null });
    setBusy("");
    if (error) { setErr(errorText(error, t.common.error)); return; }
    load();
  }

  const all = rows ?? [];
  const groups: [string, StaffApplication[]][] = [
    [S.pending, all.filter((a) => a.status === "pending")],
    [S.active, all.filter((a) => a.status === "approved")],
    [S.closed, all.filter((a) => a.status === "rejected" || a.status === "suspended")],
  ];

  return (
    <Screen>
      <H2>{S.approvalsH}</H2>
      {err ? <Banner tone="bad" text={err} /> : null}
      {groups.map(([title, list]) => (
        <View key={title} style={{ gap: space.md }}>
          <H3>{title} ({list.length})</H3>
          {list.length ? list.map((a) => (
            <Card key={a.id}>
              <Row style={{ justifyContent: "space-between" }}><Txt bold>{a.full_name}</Txt><Label>{S.status[a.status]}</Label></Row>
              <Row gap={space.md}>
                <KV k={S.staffNo} v={a.staff_no} mono />
                <KV k={S.position} v={S.positions[a.position]} />
                <KV k={S.office} v={a.office_region} />
                <KV k={S.email} v={a.work_email} />
                <KV k={t.setup.phone} v={a.phone} mono />
                <KV k={S.applied} v={fmtDate(a.created_at, lang, true)} />
                {a.decided_by_name ? <KV k={S.decided} v={`${a.decided_by_name} · ${fmtDate(a.decided_at, lang, true)}`} /> : null}
                {a.reason ? <KV k={S.reason} v={a.reason} /> : null}
              </Row>
              {a.status === "pending" ? (
                <>
                  <Field label={S.rejectReason} value={reasons[a.id] ?? ""} onChangeText={(v) => setReasons((r) => ({ ...r, [a.id]: v }))} />
                  <Row>
                    <Button small title={S.approve} icon="checkmark" loading={busy === a.id + "approved"} onPress={() => decide(a, "approved")} />
                    <Button small variant="secondary" title={S.reject} loading={busy === a.id + "rejected"} onPress={() => decide(a, "rejected")} />
                  </Row>
                </>
              ) : a.status === "approved" ? (
                a.user_id === profile?.id ? null : <Button small variant="danger" title={S.suspend} loading={busy === a.id + "suspended"} onPress={() => decide(a, "suspended")} />
              ) : (
                <Button small variant="secondary" title={S.restore} loading={busy === a.id + "approved"} onPress={() => decide(a, "approved")} />
              )}
            </Card>
          )) : <Txt muted>{S.none}</Txt>}
        </View>
      ))}
    </Screen>
  );
}
