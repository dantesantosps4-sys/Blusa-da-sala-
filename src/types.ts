export type Choice = "blusa" | "blusa_short";

export const PRICES: Record<Choice, number> = {
  blusa: 40,
  blusa_short: 70,
};

export const CHOICE_LABEL: Record<Choice, string> = {
  blusa: "Blusa",
  blusa_short: "Blusa + Short",
};

export type ShirtColor = "azul" | "branca";
export const SHIRT_COLORS: ShirtColor[] = ["azul", "branca"];
export const COLOR_LABEL: Record<ShirtColor, string> = {
  azul: "Azul",
  branca: "Branca",
};

export type ShirtSize = "PP" | "P" | "M" | "G" | "GG" | "XGG";
export const SHIRT_SIZES: ShirtSize[] = ["PP", "P", "M", "G", "GG", "XGG"];

export const SHIRT_NAME_MAX = 20;

/** Registro completo (usado só no painel admin). */
export interface Participant {
  id: string;
  name: string;
  token: string;
  choice: Choice | null;
  amount: number;
  paid: boolean;
  paid_at: string | null;
  submitted_at: string | null;
  answered: boolean;
  shared: boolean;
  shared_at: string | null;
  shirt_color: ShirtColor | null;
  shirt_size: ShirtSize | null;
  shirt_name: string | null;
  shirt_number: number | null;
  created_at: string;
}

/** Visão restrita que o aluno recebe do próprio cadastro. */
export interface StudentView {
  name: string;
  choice: Choice | null;
  amount: number;
  paid: boolean;
  answered: boolean;
  submitted_at: string | null;
  shirt_color: ShirtColor | null;
  shirt_size: ShirtSize | null;
  shirt_name: string | null;
  shirt_number: number | null;
}

export interface AdminStats {
  total: number;
  answered: number;
  pending: number;
  onlyBlusa: number;
  blusaShort: number;
  sharedCount: number;
  sharedPct: number;
  expected: number;
  collected: number;
  outstanding: number;
}

export type SubmitStatus =
  | "ok"
  | "already_used"
  | "not_found"
  | "invalid_choice"
  | "invalid_color"
  | "invalid_size"
  | "invalid_name"
  | "invalid_number";

/** Normaliza o nome da blusa: MAIÚSCULAS, sem espaços duplicados, trim. */
export function normalizeShirtName(raw: string): string {
  return raw.replace(/\s+/g, " ").trimStart().toUpperCase().slice(0, SHIRT_NAME_MAX);
}
