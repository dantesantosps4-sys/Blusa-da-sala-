import type { Participant } from "../types";
import { CHOICE_LABEL, COLOR_LABEL } from "../types";
import { formatDateOnly } from "./format";

function escapeField(value: string): string {
  if (/[";\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** CSV completo: dados da blusa, status, datas e token. */
export function exportParticipantsCsv(participants: Participant[]): void {
  const header = [
    "Nome",
    "Tipo",
    "Cor",
    "Tamanho",
    "Nome na blusa",
    "Número",
    "Valor",
    "Pago",
    "Data do pagamento",
    "Respondido",
    "Data da resposta",
    "Compartilhado",
    "Data do compartilhamento",
    "Token",
  ];

  const rows = participants.map((p) => [
    escapeField(p.name),
    p.choice ? CHOICE_LABEL[p.choice] : "—",
    p.shirt_color ? COLOR_LABEL[p.shirt_color] : "—",
    p.shirt_size ?? "—",
    escapeField(p.shirt_name ?? "—"),
    p.shirt_number !== null ? String(p.shirt_number) : "—",
    Number(p.amount) ? Number(p.amount).toFixed(2).replace(".", ",") : "0,00",
    p.paid ? "Sim" : "Não",
    formatDateOnly(p.paid_at),
    p.answered ? "Sim" : "Não",
    formatDateOnly(p.submitted_at),
    p.shared ? "Sim" : "Não",
    formatDateOnly(p.shared_at),
    escapeField(p.token),
  ]);

  const csv = [header, ...rows].map((cols) => cols.join(";")).join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 10);
  const link = document.createElement("a");
  link.href = url;
  link.download = `blusas-turma-${stamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
