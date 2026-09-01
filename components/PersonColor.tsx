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

export function normalizeProfileColor(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed.toUpperCase() : null;
}

export function safeProfileColor(value?: string | null) {
  return normalizeProfileColor(value) ?? defaultProfileColor;
}

export function profileColorContrast(value?: string | null) {
  const color = safeProfileColor(value);
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000 >= 150 ? "#17211B" : "#FFFFFF";
}

export function personColorStyle(value?: string | null): CSSProperties {
  return { "--person-color": safeProfileColor(value), "--person-contrast": profileColorContrast(value) } as CSSProperties;
}

export function PersonAvatar({ name, profileColor, className = "" }: { name: string; profileColor?: string | null; className?: string }) {
  return <span aria-hidden="true" className={`avatar person-avatar ${className}`.trim()} style={personColorStyle(profileColor)}>{name.charAt(0).toUpperCase()}</span>;
}
