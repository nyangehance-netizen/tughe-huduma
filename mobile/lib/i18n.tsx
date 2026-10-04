import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CaseStatus, Lang } from "./types";

const sw = {
  appName: "TUGHE Huduma",
  tagline: "Huduma Bora, Maslahi Zaidi",
  union: "Chama cha Wafanyakazi wa Serikali na Afya Tanzania",
  tabs: { home: "Mwanzo", cases: "Mashauri", assistant: "Msaidizi", guide: "Mwongozo", desk: "Dawati", account: "Akaunti" },
  common: { save: "Hifadhi", send: "Tuma", cancel: "Ghairi", retry: "Jaribu tena", loading: "Inapakia…", choose: "Chagua", done: "Sawa", error: "Hitilafu imetokea. Jaribu tena.", offline: "Hakuna mtandao. Angalia muunganisho wako." },
  login: {
    title: "Karibu TUGHE Huduma", sub: "Ingia kwa namba yako ya simu. Tutakutumia nambari ya siri kwa SMS.",
    phone: "Namba ya simu", phonePh: "07XX XXX XXX", email: "Barua pepe", usePhone: "Simu", useEmail: "Barua pepe",
    sendCode: "Nitumie nambari", code: "Nambari ya siri (tarakimu 6)", verify: "Ingia", resend: "Tuma tena",
    sentTo: "Tumetuma nambari kwa", badPhone: "Andika namba sahihi ya simu ya Tanzania.", badEmail: "Andika barua pepe sahihi.",
    badCode: "Nambari si sahihi au imeisha muda. Jaribu tena.", notConfigured: "Programu bado haijaunganishwa na seva. Weka EXPO_PUBLIC_SUPABASE_URL na EXPO_PUBLIC_SUPABASE_ANON_KEY kwenye faili .env.",
  },
  setup: {
    title: "Taarifa zako", sub: "Taarifa hizi zinatumika kwenye kila shauri unalowasilisha. Zinaonekana kwako na kwa maafisa wa TUGHE tu.",
    name: "Jina kamili", check: "Namba ya utambulisho wa mtumishi (Check No.)", member: "Namba ya uanachama (kama unayo)",
    employer: "Mwajiri / Taasisi", employerPh: "Mfano: Hospitali ya Rufaa ya Mkoa", station: "Kituo cha kazi", region: "Mkoa",
    phone: "Namba ya simu", required: "Jaza sehemu zote zenye nyota (*).", continue: "Endelea",
  },
  home: {
    hello: "Habari", heroH: "Tatizo lako kazini, sehemu moja ya kulitatua.",
    heroP: "Wasilisha tatizo, pata namba ya kumbukumbu, na fuatilia hadi litatuliwe ndani ya muda uliopangwa.",
    report: "Wasilisha tatizo", track: "Mashauri yangu", ask: "Uliza msaidizi",
    open: "yaliyo wazi", promiseH: "Ahadi yetu ya muda",
    promise: [["Kawaida", "Jibu ndani ya siku 3 za kazi · kutatuliwa ndani ya siku 21"], ["Haraka", "Jibu ndani ya siku 1 ya kazi · kutatuliwa ndani ya siku 7"]],
    catsH: "Chagua aina ya tatizo", deskBanner: "Dawati la maafisa", deskBannerSub: "yamechelewa · yanaisha karibuni",
  },
  form: {
    title: "Wasilisha tatizo", category: "Aina ya tatizo", caseTitle: "Kichwa kifupi cha tatizo", desc: "Eleza tatizo kwa kina",
    descHint: "Taja tarehe, hatua ulizochukua, na nani umewasiliana naye.", urgency: "Uharaka", contact: "Njia ya kuwasiliana nawe",
    submit: "Wasilisha", required: "Chagua aina ya tatizo, andika kichwa (herufi 3+) na maelezo (herufi 10+).",
    sentH: "Tatizo lako limepokelewa", sentP: "Hifadhi namba hii. Afisa atakujibu kabla ya", autoUrgent: "Shauri hili limewekwa kama la HARAKA kutokana na aina yake.",
    view: "Fungua shauri", another: "Wasilisha jingine", from: "Kutoka kwa",
  },
  urg: { normal: "Kawaida", high: "Haraka" },
  cpref: { phone: "Simu", sms: "SMS / WhatsApp", office: "Nitafika ofisini" },
  status: { received: "Limepokelewa", review: "Linachambuliwa", action: "Linashughulikiwa", resolved: "Limetatuliwa", closed: "Limefungwa" } as Record<CaseStatus, string>,
  steps: ["Limepokelewa", "Linachambuliwa", "Kwa mwajiri", "Limetatuliwa"],
  cases: {
    title: "Mashauri yangu", emptyH: "Bado hujawasilisha tatizo", emptyP: "Ukiwasilisha tatizo, litaonekana hapa pamoja na hatua yake na majibu ya maafisa.",
    updated: "Mabadiliko", respondBy: "Kujibiwa kabla ya", resolveBy: "Lengo la kutatua", resolvedOn: "Limetatuliwa",
    resolution: "Jinsi lilivyotatuliwa", officer: "Afisa", unassigned: "Bado hajapangwa", convo: "Mazungumzo",
    writeMsg: "Andika ujumbe kwa afisa…", closedNote: "Shauri hili limefungwa.", details: "Maelezo",
  },
  sla: { late: "Limechelewa siku", today: "Mwisho leo", left: "siku zimebaki", noReply: "Halijajibiwa – limechelewa", done: "Limetatuliwa ndani ya siku" },
  desk: {
    title: "Dawati la maafisa", sub: "Maombi yote, yakipangwa kwa tarehe ya mwisho.",
    views: { open: "Yaliyo wazi", mine: "Kazi zangu", unassigned: "Hayajapangwa", overdue: "Yamechelewa", done: "Yaliyotatuliwa" },
    st: { open: "Wazi", overdue: "Yamechelewa", soon: "≤ siku 2", unassigned: "Hayajapangwa", done30: "Yametatuliwa (30)", avg: "Wastani (siku)" },
    search: "Tafuta jina, namba au taasisi…", allRegions: "Mikoa yote", allCats: "Aina zote", none: "Hakuna shauri linalolingana.",
    member: "Mwanachama", stage: "Hatua", assign: "Afisa anayeshughulikia", assignMe: "Nichukue mimi", extend: "Ongeza siku 5",
    resolution: "Jinsi lilivyotatuliwa", resolutionPh: "Mfano: Malimbikizo yamelipwa tarehe…", needResolution: "Andika jinsi shauri lilivyotatuliwa kabla ya kulifunga.",
    saved: "Imehifadhiwa", reply: "Mjibu mwanachama…", templates: "Majibu ya haraka", aiDraft: "Andaa jibu kwa AI", drafting: "Inaandaa…",
    notes: "Maelezo ya ndani (maafisa tu)", notePh: "Andika maelezo ya ndani…", add: "Ongeza", log: "Kumbukumbu za hatua",
    call: "Piga simu", notOfficer: "Sehemu hii ni ya maafisa wa TUGHE tu.",
    tpl: [
      ["Omba nyaraka", "Habari. Tumepokea shauri lako. Ili tuendelee, tafadhali wasilisha nakala za nyaraka zifuatazo kwenye ofisi ya TUGHE ya mkoa wako: "],
      ["Kwa mwajiri", "Habari. Tumewasilisha shauri lako kwa mwajiri kwa maandishi na tunasubiri majibu. Tutakujulisha mara tu tukipokea majibu."],
      ["Njoo ofisini", "Habari. Tungependa kukutana nawe ofisini kwa mazungumzo zaidi. Tafadhali fika ofisi ya TUGHE ya mkoa siku ya kazi ukiwa na nyaraka zako."],
    ],
    events: { created: "Shauri liliwasilishwa", status: "Hatua", assigned: "Limepangwa kwa", reply: "Afisa amejibu", extended: "Muda umeongezwa hadi", note: "Maelezo ya ndani" } as Record<string, string>,
  },
  guide: { title: "Mwongozo wa haki zako", sub: "Maelezo ya jumla. Kwa ushauri wa shauri lako, wasilisha tatizo.", law: "Sheria husika", docs: "Nyaraka za kuandaa", report: "Wasilisha tatizo la aina hii" },
  account: {
    title: "Akaunti", profile: "Taarifa zangu", lang: "Lugha", contacts: "Mawasiliano ya TUGHE", hq: "Makao Makuu", phone: "Simu", email: "Barua pepe",
    web: "Tovuti", signOut: "Toka", role: { member: "Mwanachama", officer: "Afisa wa TUGHE", admin: "Msimamizi" } as Record<string, string>,
    notif: "Arifa", notifOn: "Arifa zimewashwa", notifOff: "Washa arifa", version: "Toleo",
  },
  bot: {
    name: "Msaidizi wa TUGHE", sub: "Hujibu papo hapo, saa 24", ph: "Andika swali au namba ya shauri…",
    hello: "Habari! Mimi ni msaidizi wa TUGHE. Naweza kujibu maswali ya kawaida kuhusu haki zako kazini, kufuatilia shauri lako kwa namba ya kumbukumbu, au kukusaidia kuwasilisha tatizo.",
    quick: ["Fuatilia shauri langu", "Wasilisha tatizo", "Likizo ni siku ngapi?", "Nijiunge vipi na TUGHE?", "Mawasiliano ya TUGHE"],
    noCases: "Bado huna shauri lililowasilishwa. Ungependa kuwasilisha tatizo sasa?",
    yourCases: "Haya ndiyo mashauri yako:", notFound: "Sikuona shauri lenye namba hiyo kati ya mashauri yako. Hakikisha namba (mfano TGH-261004-K7QD).",
    report: "Sawa. Bonyeza hapa chini kufungua fomu ya kuwasilisha tatizo.",
    contacts: "Makao Makuu ya TUGHE: Mkoani Street Plot No. 189, Kibaha (S.L.P 4669 Dar es Salaam). Simu: 023 240 2534. Barua pepe: info@tughe.or.tz. Unaweza pia kufika ofisi ya TUGHE ya mkoa wako.",
    leave: "Kwa mujibu wa Sheria ya Ajira na Mahusiano Kazini (2004): likizo ya mwaka ni siku 28 mfululizo; likizo ya uzazi ni siku 84 zenye malipo (siku 100 kwa mapacha); likizo ya ubaba ni angalau siku 3; likizo ya ugonjwa ni hadi siku 126 katika kipindi cha miaka 3 (siku 63 mshahara kamili, 63 nusu mshahara). Kama umenyimwa likizo, wasilisha tatizo.",
    join: "Kujiunga na TUGHE: jaza fomu ya uanachama inayopatikana ofisi ya TUGHE ya mkoa au kwenye tovuti (tughe.or.tz). Fomu ikiwasilishwa kwa mwajiri, ada ya chama hukatwa kwenye mshahara. Kama makato hayaonekani au si sahihi, wasilisha tatizo la Uanachama.",
    urgentNote: "Hili ni jambo la HARAKA kwa sababu muda wa kujitetea na kukata rufaa ni mfupi. Wasilisha tatizo sasa au wasiliana na ofisi ya TUGHE leo.",
    catIntro: "Mwongozo wa haraka:", more: "Ukihitaji msaada wa afisa, wasilisha tatizo hili.",
    greet: "Habari! Nikusaidie nini leo?", thanks: "Karibu sana! Kama una swali jingine, niulize tu.",
    fallback: "Sijaelewa vizuri swali hilo. Unaweza kuwasilisha tatizo ili afisa akusaidie, au kuwasiliana na ofisi ya TUGHE.",
    aiErr: "Sikuweza kujibu sasa hivi. Jaribu tena, au wasilisha tatizo ili afisa akusaidie.",
    act: { report: "Wasilisha tatizo", guide: "Soma mwongozo", mine: "Mashauri yangu", contact: "Mawasiliano" },
  },
};

type Strings = typeof sw;

const en: Strings = {
  appName: "TUGHE Huduma",
  tagline: "Huduma Bora, Maslahi Zaidi",
  union: "Tanzania Union of Government and Health Employees",
  tabs: { home: "Home", cases: "Cases", assistant: "Assistant", guide: "Guidance", desk: "Desk", account: "Account" },
  common: { save: "Save", send: "Send", cancel: "Cancel", retry: "Try again", loading: "Loading…", choose: "Choose", done: "OK", error: "Something went wrong. Please try again.", offline: "No connection. Check your internet." },
  login: {
    title: "Welcome to TUGHE Huduma", sub: "Sign in with your phone number. We'll send you a code by SMS.",
    phone: "Phone number", phonePh: "07XX XXX XXX", email: "Email", usePhone: "Phone", useEmail: "Email",
    sendCode: "Send me a code", code: "Code (6 digits)", verify: "Sign in", resend: "Send again",
    sentTo: "We sent a code to", badPhone: "Enter a valid Tanzanian phone number.", badEmail: "Enter a valid email address.",
    badCode: "The code is wrong or expired. Try again.", notConfigured: "The app is not connected to a server yet. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in the .env file.",
  },
  setup: {
    title: "Your details", sub: "These details are used on every case you report. Only you and TUGHE officers can see them.",
    name: "Full name", check: "Employee check number", member: "Membership number (if any)",
    employer: "Employer / Institution", employerPh: "E.g. Regional Referral Hospital", station: "Workstation", region: "Region",
    phone: "Phone number", required: "Fill in all fields marked with an asterisk (*).", continue: "Continue",
  },
  home: {
    hello: "Hello", heroH: "Your problem at work, one place to solve it.",
    heroP: "Report a problem, get a reference number, and follow it until it is resolved within a set time.",
    report: "Report a problem", track: "My cases", ask: "Ask the assistant",
    open: "open", promiseH: "Our service times",
    promise: [["Normal", "Reply within 3 working days · resolved within 21"], ["Urgent", "Reply within 1 working day · resolved within 7"]],
    catsH: "Choose the type of problem", deskBanner: "Officers' desk", deskBannerSub: "overdue · due soon",
  },
  form: {
    title: "Report a problem", category: "Type of problem", caseTitle: "Short title", desc: "Describe the problem in detail",
    descHint: "Include dates, steps you have taken and who you have spoken to.", urgency: "Urgency", contact: "How should we contact you",
    submit: "Submit", required: "Choose a type, write a title (3+ characters) and a description (10+ characters).",
    sentH: "Your problem has been received", sentP: "Keep this number. An officer will reply before", autoUrgent: "This case was marked URGENT because of its type.",
    view: "Open case", another: "Report another", from: "From",
  },
  urg: { normal: "Normal", high: "Urgent" },
  cpref: { phone: "Phone call", sms: "SMS / WhatsApp", office: "I'll visit the office" },
  status: { received: "Received", review: "Under review", action: "In progress", resolved: "Resolved", closed: "Closed" },
  steps: ["Received", "Review", "With employer", "Resolved"],
  cases: {
    title: "My cases", emptyH: "You have not reported a problem yet", emptyP: "Once you report a problem, it appears here with its progress and officers' replies.",
    updated: "Updated", respondBy: "Reply expected by", resolveBy: "Resolution target", resolvedOn: "Resolved",
    resolution: "How it was resolved", officer: "Officer", unassigned: "Not yet assigned", convo: "Conversation",
    writeMsg: "Write a message to the officer…", closedNote: "This case is closed.", details: "Details",
  },
  sla: { late: "Overdue by days:", today: "Due today", left: "days left", noReply: "No reply yet – overdue", done: "Resolved in days:" },
  desk: {
    title: "Officers' desk", sub: "Every request, sorted by deadline.",
    views: { open: "Open", mine: "My tasks", unassigned: "Unassigned", overdue: "Overdue", done: "Resolved" },
    st: { open: "Open", overdue: "Overdue", soon: "≤ 2 days", unassigned: "Unassigned", done30: "Resolved (30d)", avg: "Avg. days" },
    search: "Search name, number or institution…", allRegions: "All regions", allCats: "All types", none: "No cases match.",
    member: "Member", stage: "Stage", assign: "Assigned officer", assignMe: "Assign to me", extend: "Extend 5 days",
    resolution: "How it was resolved", resolutionPh: "E.g. Arrears paid on…", needResolution: "Write how the case was resolved before closing it.",
    saved: "Saved", reply: "Reply to the member…", templates: "Quick replies", aiDraft: "Draft with AI", drafting: "Drafting…",
    notes: "Internal notes (officers only)", notePh: "Write an internal note…", add: "Add", log: "Activity log",
    call: "Call", notOfficer: "This section is for TUGHE officers only.",
    tpl: [
      ["Request documents", "Hello. We have received your case. To continue, please bring copies of these documents to your regional TUGHE office: "],
      ["Sent to employer", "Hello. We have submitted your case to the employer in writing and are awaiting their response. We will update you as soon as we hear back."],
      ["Visit the office", "Hello. We would like to meet you at the office to discuss further. Please visit your regional TUGHE office on a working day with your documents."],
    ],
    events: { created: "Case submitted", status: "Stage", assigned: "Assigned to", reply: "Officer replied", extended: "Deadline extended to", note: "Internal note" },
  },
  guide: { title: "Know your rights", sub: "General information. For advice on your own case, report the problem.", law: "Relevant law", docs: "Documents to prepare", report: "Report this type of problem" },
  account: {
    title: "Account", profile: "My details", lang: "Language", contacts: "Contact TUGHE", hq: "Head office", phone: "Phone", email: "Email",
    web: "Website", signOut: "Sign out", role: { member: "Member", officer: "TUGHE officer", admin: "Administrator" },
    notif: "Notifications", notifOn: "Notifications are on", notifOff: "Turn on notifications", version: "Version",
  },
  bot: {
    name: "TUGHE Assistant", sub: "Instant answers, 24 hours", ph: "Type a question or case number…",
    hello: "Hello! I'm the TUGHE assistant. I can answer common questions about your rights at work, track your case by reference number, or help you report a problem.",
    quick: ["Track my case", "Report a problem", "How many days of leave?", "How do I join TUGHE?", "TUGHE contacts"],
    noCases: "You have no cases yet. Would you like to report a problem now?",
    yourCases: "Here are your cases:", notFound: "I couldn't find a case with that number among your cases. Check the number (e.g. TGH-261004-K7QD).",
    report: "Sure. Tap below to open the form to report a problem.",
    contacts: "TUGHE Head Office: Mkoani Street Plot No. 189, Kibaha (P.O. Box 4669 Dar es Salaam). Phone: 023 240 2534. Email: info@tughe.or.tz. You can also visit the TUGHE office in your region.",
    leave: "Under the Employment and Labour Relations Act (2004): annual leave is 28 consecutive days; maternity leave is 84 paid days (100 for twins or more); paternity leave is at least 3 days; sick leave is up to 126 days in a 3-year cycle (63 on full pay, 63 on half pay). If you were denied leave, report it.",
    join: "To join TUGHE: fill in the membership form from your regional TUGHE office or the website (tughe.or.tz). Once it reaches your employer, union dues are deducted from salary. If deductions are missing or wrong, report a Membership problem.",
    urgentNote: "This is URGENT because the time to respond and appeal is short. Report it now or contact the TUGHE office today.",
    catIntro: "Quick guidance:", more: "If you need an officer's help, report this problem.",
    greet: "Hello! How can I help you today?", thanks: "You're welcome! Ask me anything else.",
    fallback: "I didn't quite understand that. You can report a problem so an officer can help, or contact the TUGHE office.",
    aiErr: "I couldn't answer right now. Try again, or report the problem so an officer can help.",
    act: { report: "Report a problem", guide: "Read guidance", mine: "My cases", contact: "Contacts" },
  },
};

const STRINGS: Record<Lang, Strings> = { sw, en };

interface LangCtx { lang: Lang; t: Strings; setLang: (l: Lang) => void }
const Ctx = createContext<LangCtx>({ lang: "sw", t: sw, setLang: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("sw");
  useEffect(() => {
    AsyncStorage.getItem("tughe-lang").then((v) => { if (v === "en" || v === "sw") setLangState(v); }).catch(() => {});
  }, []);
  const value = useMemo<LangCtx>(() => ({
    lang, t: STRINGS[lang],
    setLang: (l) => { setLangState(l); AsyncStorage.setItem("tughe-lang", l).catch(() => {}); },
  }), [lang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useT = () => useContext(Ctx);

export function fmtDate(iso: string | null | undefined, lang: Lang, withYear = false): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = withYear
    ? { day: "numeric", month: "short", year: "numeric" }
    : { weekday: "short", day: "numeric", month: "short" };
  try { return d.toLocaleDateString(lang === "sw" ? "sw-TZ" : "en-GB", opts); } catch { return d.toDateString(); }
}

export function ago(iso: string, lang: Lang): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  const u = lang === "sw" ? { now: "sasa hivi", m: "dk", h: "saa", d: "siku" } : { now: "just now", m: "min", h: "h", d: "d" };
  if (s < 60) return u.now;
  if (s < 3600) return `${Math.floor(s / 60)} ${u.m}`;
  if (s < 86400) return `${Math.floor(s / 3600)} ${u.h}`;
  if (s < 86400 * 14) return `${Math.floor(s / 86400)} ${u.d}`;
  return fmtDate(iso, lang, true);
}
