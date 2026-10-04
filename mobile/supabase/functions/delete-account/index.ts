// Deletes the signed-in member's account and everything linked to it
// (profile, cases, messages, views — all removed by ON DELETE CASCADE).
// Deploy:  supabase functions deploy delete-account
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const asUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return json({ error: "unauthorized" }, 401);

  let body: { confirm?: string } = {};
  try { body = await req.json(); } catch { /* empty body */ }
  if (body.confirm !== "DELETE") return json({ error: "confirmation_required" }, 400);

  // Officers and admins are removed by TUGHE ICT, not from the app.
  const { data: me } = await asUser.from("profiles").select("role").eq("id", user.id).single();
  if (me && me.role !== "member") return json({ error: "staff_account" }, 403);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return json({ error: "delete_failed" }, 500);
  return json({ deleted: true });
});
