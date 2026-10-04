// Morning reminder to officers about late and soon-due cases.
// Deploy:  supabase functions deploy sla-reminder --no-verify-jwt
// Schedule it (weekdays 07:30 Tanzania = 04:30 UTC) — see README, "Daily deadline reminder".
import { createClient } from "npm:@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  const secret = Deno.env.get("WEBHOOK_SECRET");
  if (!secret || req.headers.get("x-webhook-secret") !== secret) return new Response("forbidden", { status: 403 });

  const now = new Date();
  const soon = new Date(now.getTime() + 2 * 86400000);
  const { data: open } = await admin.from("cases")
    .select("id, officer_id, due_at, respond_by, first_response_at")
    .not("status", "in", "(resolved,closed)");
  const { data: officers } = await admin.from("profiles")
    .select("id, push_token, lang").in("role", ["officer", "admin"]).not("push_token", "is", null);

  type Row = { id: string; officer_id: string | null; due_at: string; respond_by: string; first_response_at: string | null };
  const rows: Row[] = open ?? [];
  const isLate = (c: Row) =>
    new Date(c.due_at) < now || (!c.first_response_at && new Date(c.respond_by) < now);
  const unassignedLate = rows.filter((c) => !c.officer_id && isLate(c)).length;

  const pushes = [];
  for (const o of (officers ?? []) as { id: string; push_token: string; lang: string }[]) {
    const mine = rows.filter((c) => c.officer_id === o.id);
    const late = mine.filter(isLate).length;
    const dueSoon = mine.filter((c) => !isLate(c) && new Date(c.due_at) < soon).length;
    if (!late && !dueSoon && !unassignedLate) continue;
    const en = o.lang === "en";
    pushes.push({
      to: o.push_token, sound: "default", data: { url: "/desk" },
      title: en ? "TUGHE desk: today's deadlines" : "Dawati la TUGHE: muda wa leo",
      body: en
        ? `Your cases: ${late} overdue, ${dueSoon} due within 2 days. Unassigned overdue: ${unassignedLate}.`
        : `Mashauri yako: ${late} yamechelewa, ${dueSoon} yanaisha ndani ya siku 2. Yasiyopangwa yaliyochelewa: ${unassignedLate}.`,
    });
  }
  for (let i = 0; i < pushes.length; i += 100) {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pushes.slice(i, i + 100)),
    });
  }
  return new Response(JSON.stringify({ sent: pushes.length }), { headers: { "Content-Type": "application/json" } });
});
