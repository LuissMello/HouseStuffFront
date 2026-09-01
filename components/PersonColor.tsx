import type { CSSProperties } from "react";

export const profileColors = [
  { value: "#2F6B50", label: "Verde folha" },
  { value: "#A33F2B", label: "Terracota" },
  { value: "#80510D", label: "Caramelo" },
  { value: "#256B78", label: "Azul lago" },
  { value: "#51469B", label: "Roxo" },
  { value: "#9B356A", label: "Rosa ameixa" },
] as const;

export const defaultProfileColor = profileColors[0].value;

export function safeProfileColor(value?: string | null) {
  return profileColors.some((color) => color.value.toLowerCase() === value?.toLowerCase())
    ? value!
    : defaultProfileColor;
}

export function personColorStyle(value?: string | null): CSSProperties {
  return { "--person-color": safeProfileColor(value) } as CSSProperties;
}

export function PersonAvatar({ name, profileColor, className = "" }: { name: string; profileColor?: string | null; className?: string }) {
  return <span aria-hidden="true" className={`avatar person-avatar ${className}`.trim()} style={personColorStyle(profileColor)}>{name.charAt(0).toUpperCase()}</span>;
}
