import Constants from "expo-constants";

/** "member" = TUGHE Huduma (members' app), "staff" = TUGHE Dawati (officers' app). Set by APP_VARIANT at build time. */
export const VARIANT: "member" | "staff" = Constants.expoConfig?.extra?.variant === "staff" ? "staff" : "member";
export const IS_STAFF_APP = VARIANT === "staff";
