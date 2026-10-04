import type { Session } from "@supabase/supabase-js";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isConfigured, supabase } from "./supabase";
import type { Profile } from "./types";

interface AuthCtx {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isOfficer: boolean;
  profileComplete: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  session: null, profile: null, loading: true, isOfficer: false, profileComplete: false,
  refreshProfile: async () => {}, signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileFor, setProfileFor] = useState<string | null>(null); // which user the profile was loaded for
  const [init, setInit] = useState(false);

  const loadProfile = useCallback(async (uid: string | undefined) => {
    if (!uid) { setProfile(null); setProfileFor(null); return; }
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    setProfile((data as Profile) ?? null);
    setProfileFor(uid);
  }, []);

  useEffect(() => {
    if (!isConfigured) { setInit(true); return; }
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      setInit(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      // Run outside the auth callback to avoid blocking the client.
      setTimeout(() => { loadProfile(s?.user.id); }, 0);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [loadProfile]);

  // Loading until the first check finishes, and whenever a signed-in user's profile hasn't arrived yet.
  const loading = !init || (session !== null && profileFor !== session.user.id);

  const value = useMemo<AuthCtx>(() => ({
    session, profile, loading,
    isOfficer: profile?.role === "officer" || profile?.role === "admin",
    profileComplete: Boolean(profile?.full_name && profile?.check_no && profile?.employer && profile?.region),
    refreshProfile: () => loadProfile(session?.user.id),
    signOut: async () => { await supabase.auth.signOut(); setProfile(null); },
  }), [session, profile, loading, loadProfile]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
