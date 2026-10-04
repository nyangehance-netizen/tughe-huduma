import { Redirect } from "expo-router";
import React from "react";
import { Loading } from "../components/ui";
import { useAuth } from "../lib/auth";
import { isConfigured } from "../lib/supabase";
import { IS_STAFF_APP } from "../lib/variant";

export default function Index() {
  const { loading, session, profileComplete, isOfficer } = useAuth();
  if (!isConfigured) return <Redirect href="/login" />;
  if (loading) return <Loading />;
  if (!session) return <Redirect href="/login" />;
  if (IS_STAFF_APP) {
    // Officers' app: only approved officers reach the desk; everyone else applies or waits for approval.
    return isOfficer ? <Redirect href="/(tabs)/desk" /> : <Redirect href="/staff-apply" />;
  }
  // Members' app: officer accounts belong in TUGHE Dawati.
  if (isOfficer) return <Redirect href="/wrong-app" />;
  if (!profileComplete) return <Redirect href="/setup" />;
  return <Redirect href="/(tabs)" />;
}
