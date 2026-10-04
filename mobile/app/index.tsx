import { Redirect } from "expo-router";
import React from "react";
import { Loading } from "../components/ui";
import { useAuth } from "../lib/auth";
import { isConfigured } from "../lib/supabase";

export default function Index() {
  const { loading, session, profileComplete } = useAuth();
  if (!isConfigured) return <Redirect href="/login" />;
  if (loading) return <Loading />;
  if (!session) return <Redirect href="/login" />;
  if (!profileComplete) return <Redirect href="/setup" />;
  return <Redirect href="/(tabs)" />;
}
