// Two apps from one codebase:
//   APP_VARIANT=member (default) → "TUGHE Huduma", the members' app
//   APP_VARIANT=staff            → "TUGHE Dawati", the officers' app (apply, approval, desk)
module.exports = ({ config }) => {
  const staff = process.env.APP_VARIANT === "staff";
  if (!staff) return { ...config, extra: { ...config.extra, variant: "member" } };
  return {
    ...config,
    name: "TUGHE Dawati",
    scheme: "tughe-dawati",
    splash: { ...config.splash, backgroundColor: "#1B2160" },
    ios: { ...config.ios, bundleIdentifier: "tz.or.tughe.dawati" },
    android: { ...config.android, package: "tz.or.tughe.dawati" },
    extra: { ...config.extra, variant: "staff" },
  };
};
