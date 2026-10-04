// Push notifications, called by Supabase Database Webhooks on:
//   messages INSERT, cases INSERT, cases UPDATE
// Deploy:  supabase functions deploy notify --no-verify-jwt
// Secret:  supabase secrets set WEBHOOK_SECRET=<long random string>
// In the webhook settings add the HTTP header  x-webhook-secret: <same string>
import { createClient } from "npm:@supabase/supabase-js@2";

type Push = { to: string; title: string; body: string; data?: Record<string, string>; sound?: "default" };

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const STATUS = {
  sw: { received: "Limepokelewa", review: "Linachambuliwa", action: "Linashughulikiwa", resolved: "Limetatuliwa", closed: "Limefungwa" },
  en: { received: "Received", review: "Under review", action: "In progress", resolved: "Resolved", closed: "Closed" },
} as const;

async function send(messages: Push[]) {
  const valid = messages.filter((m) => m.to && m.to.startsWith("ExponentPushToken"));
  for (let i = 0; i < valid.length; i += 100) {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(valid.slice(i, i + 100).map((m) => ({ sound: "default", ...m }))),
    });
  }
}

async function profile(id: string | null) {
  if (!id) return null;
  const { data } = await admin.from("profiles").select("id, push_token, lang, role").eq("id", id).single();
  return data;
}

const clip = (s: string, n = 120) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

Deno.serve(async (req) => {
  const secret = Deno.env.get("WEBHOOK_SECRET");
  if (!secret || req.headers.get("x-webhook-secret") !== secret) return new Response("forbidden", { status: 403 });

  const evt = await req.json();
  const { table, type, record, old_record } = evt;
  const out: Push[] = [];

  if (table === "messages" && type === "INSERT") {
    const { data: c } = await admin.from("cases").select("id, ref, member_id, officer_id, title").eq("id", record.case_id).single();
    if (c) {
      if (record.kind === "officer") {
        const p = await profile(c.member_id);
        if (p?.push_token) out.push({
          to: p.push_token,
          title: p.lang === "en" ? `TUGHE replied · ${c.ref}` : `Jibu jipya kutoka TUGHE · ${c.ref}`,
          body: clip(record.body), data: { url: `/case/${c.id}` },
        });
      } else if (record.kind === "member" && c.officer_id) {
        const p = await profile(c.officer_id);
        if (p?.push_token) out.push({
          to: p.push_token,
          title: p.lang === "en" ? `Member replied · ${c.ref}` : `Mwanachama amejibu · ${c.ref}`,
          body: clip(record.body), data: { url: `/desk/${c.id}` },
        });
      }
    }
  }

  if (table === "cases" && type === "INSERT" && record.urgency === "high") {
    const { data: officers } = await admin.from("profiles").select("push_token, lang").in("role", ["officer", "admin"]).not("push_token", "is", null);
    for (const o of officers ?? []) out.push({
      to: o.push_token!,
      title: o.lang === "en" ? `URGENT case · ${record.region ?? ""}` : `Shauri la HARAKA · ${record.region ?? ""}`,
      body: clip(record.title), data: { url: `/desk/${record.id}` },
    });
  }

  if (table === "cases" && type === "UPDATE" && old_record && record.status !== old_record.status && record.status !== "resolved") {
    // "resolved" already produces an officer message, which notifies the member.
    const p = await profile(record.member_id);
    if (p?.push_token) {
      const l = p.lang === "en" ? "en" : "sw";
      out.push({
        to: p.push_token,
        title: l === "en" ? `Case update · ${record.ref}` : `Hatua mpya · ${record.ref}`,
        body: `${STATUS[l][record.status as keyof typeof STATUS["sw"]] ?? record.status}: ${clip(record.title, 80)}`,
        data: { url: `/case/${record.id}` },
      });
    }
  }

  await send(out);
  return new Response(JSON.stringify({ sent: out.length }), { headers: { "Content-Type": "application/json" } });
});
