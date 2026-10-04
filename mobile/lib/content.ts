import type { Lang } from "./types";

type Bi = { sw: string; en: string };
type BiList = { sw: string[]; en: string[] };

export interface Category {
  id: string;
  icon: string; // Ionicons name
  name: Bi;
  blurb: Bi;
  guide: BiList;
  docs: BiList;
  law: string;
  urgent?: boolean;
  kw: RegExp | null;
}

export const CATEGORIES: Category[] = [
  {
    id: "salary", icon: "cash-outline", kw: /mshahara|malimbikiz|makato|arrear|salary|deduct|payslip/i,
    name: { sw: "Mshahara na malimbikizo", en: "Salary and arrears" },
    blurb: { sw: "Malimbikizo, makato yasiyo sahihi, mshahara kuchelewa", en: "Arrears, wrong deductions, late salary" },
    guide: {
      sw: ["Hifadhi hati za mshahara (salary slips) za miezi husika.", "Uliza kwanza Afisa Utumishi au Mhasibu wa taasisi yako kwa maandishi, na hifadhi nakala.", "Malimbikizo yanahitaji uthibitisho wa stahiki (barua ya kupandishwa, uhamisho n.k.).", "TUGHE inaweza kufuatilia madai kwa mwajiri na Ofisi ya Rais Utumishi."],
      en: ["Keep payslips for the months concerned.", "First ask your institution's HR or accounts officer in writing, and keep a copy.", "Arrears claims need proof of entitlement (promotion letter, transfer letter, etc.).", "TUGHE can follow up claims with the employer and the President's Office, Public Service Management."],
    },
    docs: { sw: ["Hati za mshahara za miezi husika", "Barua ya stahiki (kupandishwa/uhamisho)", "Nakala ya barua uliyomwandikia mwajiri"], en: ["Payslips for the months concerned", "Entitlement letter (promotion/transfer)", "Copy of your letter to the employer"] },
    law: "Employment and Labour Relations Act, 2004; Public Service Act, Cap. 298",
  },
  {
    id: "promotion", icon: "trending-up-outline", kw: /daraja|cheo|kupandish|promot|opras|regrad/i,
    name: { sw: "Kupandishwa daraja / cheo", en: "Promotion and grading" },
    blurb: { sw: "Kucheleweshwa kupandishwa, kurekebishwa daraja", en: "Delayed promotion, regrading" },
    guide: {
      sw: ["Hakiki taarifa zako kwenye mfumo wa watumishi (elimu, tarehe ya ajira, daraja).", "Kuwa na nakala ya tathmini za utendaji kazi (OPRAS) za miaka husika.", "Kama umejiendeleza kielimu, wasilisha vyeti vilivyohakikiwa kwa mwajiri."],
      en: ["Check your records in the public servants' system (education, hire date, grade).", "Keep copies of your performance appraisals (OPRAS) for the relevant years.", "If you upgraded your qualifications, submit verified certificates to your employer."],
    },
    docs: { sw: ["Barua ya ajira na ya daraja la mwisho", "Fomu za OPRAS za miaka 3 iliyopita", "Vyeti vya elimu vilivyohakikiwa"], en: ["Appointment letter and last grading letter", "OPRAS forms for the last 3 years", "Verified academic certificates"] },
    law: "Public Service Act, Cap. 298 and Public Service Regulations",
  },
  {
    id: "transfer", icon: "swap-horizontal-outline", kw: /uhamisho|kuhamish|transfer|relocat/i,
    name: { sw: "Uhamisho", en: "Transfer" },
    blurb: { sw: "Uhamisho usio wa haki, posho za uhamisho", en: "Unfair transfer, transfer allowances" },
    guide: {
      sw: ["Uhamisho wa mwajiri unapaswa kuambatana na stahiki za usafiri na kujikimu.", "Kama unaomba uhamisho, fuata utaratibu wa maandishi kupitia mkuu wa idara.", "Hifadhi barua ya uhamisho na tarehe uliyoripoti kituo kipya."],
      en: ["An employer-initiated transfer should come with travel and subsistence entitlements.", "If you are requesting a transfer, apply in writing through your head of department.", "Keep the transfer letter and the date you reported to the new station."],
    },
    docs: { sw: ["Barua ya uhamisho", "Barua ya kuripoti kituo kipya", "Risiti za gharama za usafiri (kama zipo)"], en: ["Transfer letter", "Reporting letter at the new station", "Travel cost receipts (if any)"] },
    law: "Public Service Regulations; Standing Orders for the Public Service",
  },
  {
    id: "discipline", icon: "hammer-outline", urgent: true, kw: /nidhamu|kufukuz|kuachishwa|kusimamish|tuhuma|disciplin|dismiss|terminat|suspen|fired|hearing/i,
    name: { sw: "Nidhamu na kuachishwa kazi", en: "Discipline and dismissal" },
    blurb: { sw: "Mashauri ya nidhamu, kusimamishwa, kufukuzwa", en: "Disciplinary cases, suspension, termination" },
    guide: {
      sw: ["Una haki ya kuelezwa tuhuma kwa maandishi na kupewa muda wa kujitetea.", "Una haki ya kuwakilishwa na mwakilishi wa chama kwenye kikao cha nidhamu.", "Muda wa kukata rufaa ni mfupi. Wasiliana na TUGHE mara moja, usisubiri.", "Usisaini barua yoyote usiyoielewa bila ushauri."],
      en: ["You have the right to receive charges in writing and time to prepare your defence.", "You have the right to be represented by a union representative at a hearing.", "Appeal time limits are short. Contact TUGHE immediately; don't wait.", "Don't sign any letter you don't understand without advice."],
    },
    docs: { sw: ["Hati ya mashtaka / barua ya tuhuma", "Barua ya kusimamishwa au kuachishwa kazi", "Majibu yako ya utetezi (kama umeandika)"], en: ["Charge sheet / letter of allegations", "Suspension or termination letter", "Your written defence (if any)"] },
    law: "Employment and Labour Relations Act, 2004; Public Service Act, Cap. 298",
  },
  {
    id: "leave", icon: "calendar-outline", kw: /likizo|leave|uzazi|maternity|paternity|ubaba|ugonjwa|sick/i,
    name: { sw: "Likizo na stahiki", en: "Leave and entitlements" },
    blurb: { sw: "Likizo ya mwaka, uzazi, ugonjwa, posho", en: "Annual, maternity, sick leave, allowances" },
    guide: {
      sw: ["Likizo ya mwaka ni siku 28 mfululizo kwa mwaka (ikiwemo sikukuu zinazoangukia ndani yake).", "Likizo ya uzazi ni siku 84 zenye malipo (siku 100 kwa mapacha au zaidi).", "Likizo ya ubaba ni angalau siku 3 zenye malipo.", "Omba likizo kwa maandishi na hifadhi nakala ya kibali."],
      en: ["Annual leave is 28 consecutive days per year (including public holidays within it).", "Maternity leave is 84 days paid (100 days for twins or more).", "Paternity leave is at least 3 days paid.", "Apply for leave in writing and keep a copy of the approval."],
    },
    docs: { sw: ["Barua ya maombi ya likizo", "Majibu ya mwajiri (kama yapo)", "Cheti cha daktari (likizo ya ugonjwa/uzazi)"], en: ["Leave application letter", "Employer's reply (if any)", "Medical certificate (sick/maternity leave)"] },
    law: "Employment and Labour Relations Act, 2004, ss. 31–34",
  },
  {
    id: "safety", icon: "shield-checkmark-outline", kw: /usalama|vifaa kinga|ppe|ajali|jeraha|hatari|safety|injur|accident|hazard/i,
    name: { sw: "Usalama na afya kazini", en: "Health and safety at work" },
    blurb: { sw: "Vifaa kinga, mazingira hatarishi, majeraha", en: "Protective equipment, hazards, injuries" },
    guide: {
      sw: ["Mwajiri anawajibika kutoa vifaa kinga (PPE) vinavyofaa kazi yako.", "Ripoti ajali au jeraha kazini mapema na hakikisha imeandikwa.", "Majeraha na magonjwa yatokanayo na kazi yanaweza kufidiwa kupitia WCF."],
      en: ["Your employer must provide protective equipment (PPE) suited to your work.", "Report any workplace accident or injury promptly and make sure it is recorded.", "Work-related injuries and diseases may be compensated through the Workers Compensation Fund (WCF)."],
    },
    docs: { sw: ["Ripoti ya ajali / fomu ya WCF", "Taarifa ya daktari", "Picha au maelezo ya mazingira hatarishi"], en: ["Accident report / WCF form", "Medical report", "Photos or description of the hazard"] },
    law: "Occupational Health and Safety Act, 2003; Workers Compensation Act, Cap. 263",
  },
  {
    id: "pension", icon: "wallet-outline", kw: /pensheni|psssf|mafao|kustaafu|pension|retire|gratuity/i,
    name: { sw: "Mafao na pensheni", en: "Pension and benefits" },
    blurb: { sw: "PSSSF, michango kutowasilishwa, kustaafu", en: "PSSSF, unremitted contributions, retirement" },
    guide: {
      sw: ["Hakiki taarifa ya michango yako PSSSF mara kwa mara.", "Anza maandalizi ya nyaraka za kustaafu angalau miezi 6 kabla.", "Kama michango haijawasilishwa, TUGHE inaweza kufuatilia kwa mwajiri na mfuko."],
      en: ["Check your PSSSF contribution statement regularly.", "Start preparing retirement documents at least 6 months ahead.", "If contributions were not remitted, TUGHE can follow up with the employer and the fund."],
    },
    docs: { sw: ["Taarifa ya michango ya PSSSF", "Namba ya uanachama wa PSSSF", "Barua ya kustaafu (kama ipo)"], en: ["PSSSF contribution statement", "PSSSF membership number", "Retirement letter (if any)"] },
    law: "Public Service Social Security Fund Act, 2018",
  },
  {
    id: "membership", icon: "card-outline", kw: /jiunga|uanachama|kadi ya|ada ya chama|join|membership|dues/i,
    name: { sw: "Uanachama na michango", en: "Membership and dues" },
    blurb: { sw: "Kujiunga, kadi, makato ya ada ya chama", en: "Joining, membership card, union dues" },
    guide: {
      sw: ["Kujiunga, jaza fomu ya uanachama inayopatikana ofisi ya TUGHE au tovuti.", "Ada ya chama hukatwa kwenye mshahara baada ya fomu kuwasilishwa kwa mwajiri.", "Kama makato si sahihi au hayaonekani, wasilisha tatizo hapa."],
      en: ["To join, fill the membership form from a TUGHE office or the website.", "Union dues are deducted from salary once the form reaches your employer.", "If deductions are wrong or missing, report it here."],
    },
    docs: { sw: ["Hati ya mshahara inayoonyesha makato", "Nakala ya fomu ya uanachama"], en: ["Payslip showing deductions", "Copy of membership form"] },
    law: "Employment and Labour Relations Act, 2004 (union rights)",
  },
  {
    id: "harassment", icon: "hand-left-outline", urgent: true, kw: /unyanyas|ubaguzi|vitisho|harass|discriminat|bully|threat/i,
    name: { sw: "Unyanyasaji na ubaguzi", en: "Harassment and discrimination" },
    blurb: { sw: "Unyanyasaji wa kingono, ubaguzi, vitisho", en: "Sexual harassment, discrimination, threats" },
    guide: {
      sw: ["Una haki ya mazingira ya kazi yasiyo na ubaguzi wala unyanyasaji.", "Andika matukio: tarehe, mahali, mashahidi.", "Taarifa zako zitashughulikiwa kwa usiri. Kama uko hatarini, tafuta msaada wa haraka."],
      en: ["You have the right to a workplace free of discrimination and harassment.", "Write down incidents: dates, places, witnesses.", "Your report is handled confidentially. If you are in danger, seek urgent help."],
    },
    docs: { sw: ["Maelezo ya matukio (tarehe, mahali)", "Majina ya mashahidi (kama wapo)", "Ujumbe au barua zinazohusika"], en: ["Account of incidents (dates, places)", "Names of witnesses (if any)", "Related messages or letters"] },
    law: "Employment and Labour Relations Act, 2004, s. 7",
  },
  {
    id: "other", icon: "ellipsis-horizontal-circle-outline", kw: null,
    name: { sw: "Mengineyo", en: "Other" },
    blurb: { sw: "Tatizo jingine lolote la kikazi", en: "Any other work-related problem" },
    guide: { sw: ["Eleza tatizo kwa kina na afisa atakuelekeza."], en: ["Describe the problem in detail and an officer will guide you."] },
    docs: { sw: [], en: [] },
    law: "",
  },
];

export const categoryById = (id: string): Category =>
  CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];

export const categoryName = (id: string, lang: Lang) => categoryById(id).name[lang];

export const REGIONS = [
  "Arusha", "Dar es Salaam", "Dodoma", "Geita", "Iringa", "Kagera", "Katavi", "Kigoma", "Kilimanjaro", "Lindi",
  "Manyara", "Mara", "Mbeya", "Morogoro", "Mtwara", "Mwanza", "Njombe", "Pwani", "Rukwa", "Ruvuma", "Shinyanga",
  "Simiyu", "Singida", "Songwe", "Tabora", "Tanga", "Kaskazini Unguja", "Kusini Unguja", "Mjini Magharibi",
  "Kaskazini Pemba", "Kusini Pemba",
];

export const CONTACTS = {
  address: "Mkoani Street, Plot No. 189, Kibaha · S.L.P / P.O. Box 4669, Dar es Salaam",
  phone: "023 240 2534",
  phoneDial: "+255232402534",
  fax: "023 240 2533",
  email: "info@tughe.or.tz",
  web: "https://tughe.or.tz",
};
