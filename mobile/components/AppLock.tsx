import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState, Image, View } from "react-native";
import { useAuth } from "../lib/auth";
import { useT } from "../lib/i18n";
import { BRAND } from "../lib/theme";
import { Button, Txt } from "./ui";

const KEY = "tughe-app-lock";
const RELOCK_AFTER_MS = 60_000;

interface LockCtx { enabled: boolean; available: boolean; setEnabled: (v: boolean) => Promise<void> }
const Ctx = createContext<LockCtx>({ enabled: false, available: false, setEnabled: async () => {} });
export const useAppLock = () => useContext(Ctx);

/**
 * Covers the app with a TUGHE screen whenever it is not in the foreground (so the app switcher never
 * shows a member's case), and asks for fingerprint / face / phone PIN when the person comes back after
 * more than a minute. Only active while signed in and only if the phone has a screen lock set up.
 */
export function AppLock({ children }: { children: React.ReactNode }) {
  const { t } = useT();
  const { session } = useAuth();
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabledState] = useState(true);
  const [locked, setLocked] = useState(false);
  const [covered, setCovered] = useState(false);
  const leftAt = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const hw = await LocalAuthentication.hasHardwareAsync().catch(() => false);
      const level = await LocalAuthentication.getEnrolledLevelAsync().catch(() => LocalAuthentication.SecurityLevel.NONE);
      setAvailable(hw && level !== LocalAuthentication.SecurityLevel.NONE);
      const saved = await AsyncStorage.getItem(KEY).catch(() => null);
      setEnabledState(saved !== "off");
    })();
  }, []);

  const unlock = useCallback(async () => {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: t.privacy.lockP,
      cancelLabel: t.common.cancel,
      disableDeviceFallback: false,
    }).catch(() => ({ success: false }));
    if (res.success) setLocked(false);
  }, [t]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setCovered(false);
        const away = leftAt.current ? Date.now() - leftAt.current : 0;
        leftAt.current = null;
        if (session && enabled && available && away > RELOCK_AFTER_MS) setLocked(true);
      } else {
        setCovered(true);
        if (!leftAt.current) leftAt.current = Date.now();
      }
    });
    return () => sub.remove();
  }, [session, enabled, available]);

  useEffect(() => { if (locked) unlock(); }, [locked, unlock]);
  useEffect(() => { if (!session) setLocked(false); }, [session]);

  const setEnabled = async (v: boolean) => {
    if (!v) {
      // Turning protection off needs the owner's confirmation.
      const res = await LocalAuthentication.authenticateAsync({ promptMessage: t.privacy.lockP }).catch(() => ({ success: false }));
      if (!res.success) return;
    }
    setEnabledState(v);
    await AsyncStorage.setItem(KEY, v ? "on" : "off").catch(() => {});
  };

  const showCover = session && (locked || covered);

  return (
    <Ctx.Provider value={{ enabled, available, setEnabled }}>
      <View style={{ flex: 1 }}>
        {children}
        {showCover ? (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: BRAND, alignItems: "center", justifyContent: "center", gap: 18, padding: 24 }}>
            <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
              <Image source={require("../assets/logo.png")} style={{ width: 108, height: 108, borderRadius: 54 }} />
            </View>
            {locked ? (
              <>
                <Txt bold style={{ color: "#FFFFFF", fontSize: 18 }}>{t.privacy.lockH}</Txt>
                <Txt style={{ color: "#FFFFFF", textAlign: "center" }}>{t.privacy.lockP}</Txt>
                <Button title={t.privacy.unlock} icon="finger-print-outline" variant="secondary" onPress={unlock} />
              </>
            ) : null}
          </View>
        ) : null}
      </View>
    </Ctx.Provider>
  );
}
