import { useColorScheme } from "react-native";

export const BRAND = "#2D3597"; // TUGHE logo blue

const light = {
  bg: "#F5F6FB", surface: "#FFFFFF", sunk: "#E9EBF6", line: "#D6DAEC",
  ink: "#12163A", muted: "#5A6082",
  blue: BRAND, blueInk: "#FFFFFF", blueSoft: "#E3E5F6",
  sky: "#3B5BDB", skySoft: "#E5EAFB",
  ok: "#1F7A4D", okSoft: "#DDF2E6", warn: "#A35F00", warnSoft: "#FFEFD3",
  bad: "#B23A2B", badSoft: "#FBE3DE", info: "#44507E", infoSoft: "#E6E8F2",
};
const dark: typeof light = {
  bg: "#0B0D1F", surface: "#12152E", sunk: "#0E1026", line: "#262A4D",
  ink: "#E8E9F6", muted: "#9A9EC0",
  blue: "#8C95F2", blueInk: "#0B0D2A", blueSoft: "#1E2350",
  sky: "#9DB4FF", skySoft: "#1B2550",
  ok: "#6BD39C", okSoft: "#173B28", warn: "#F2B35C", warnSoft: "#3B2A10",
  bad: "#F08A7A", badSoft: "#3F1D18", info: "#AEB4D8", infoSoft: "#1C2040",
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === "dark" ? dark : light;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };
export const font = { small: 12.5, body: 15, h3: 17, h2: 21, h1: 26 };
