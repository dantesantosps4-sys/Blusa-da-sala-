import { useState } from "react";
import type { Participant } from "../../types";
import { CHOICE_LABEL, COLOR_LABEL } from "../../types";
import { money, studentLink, formatDateOnly } from "../../utils/format";

interface ParticipantsTableProps {
  participants: Participant[];
  onCopy: (link: string) => void;
  onShare: (participant: Participant) => void;
  onEdit: (participant: Participant) => void;
  onDelete: (participant: Participant) => void;
}

function YesNo({ value, tone }: { value: boolean; tone: "paid" | "cyan" }) {
  return (
    <span className={`tchip ${value ? `tchip--${tone}` : "tchip--muted"}`}>
      {value ? "Sim" : "Não"}
    </span>
  );
}

export function ParticipantsTable({
  participants,
  onCopy,
  onShare,
  onEdit,
  onDelete,
}: ParticipantsTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copy = (p: Participant) => {
    onCopy(studentLink(p.token));
    setCopiedId(p.id);
    window.setTimeout(
      () => setCopiedId((cur) => (cur === p.id ? null : cur)),
      1500,
    );
  };

  return (
    <div className="tablewrap">
      <table className="ptable">
        <thead>
          <tr>
            <th className="ptable__sticky">Nome</th>
            <th>Tipo</th>
            <th>Cor</th>
            <th>Tam.</th>
            <th>Nome na blusa</th>
            <th>Nº</th>
            <th>Valor</th>
            <th>Pago</th>
            <th>Data pgto</th>
            <th>Respondido</th>
            <th>Data resp.</th>
            <th>Compart.</th>
            <th>Data compart.</th>
            <th className="ptable__actions-h">Ações</th>
          </tr>
        </thead>
        <tbody>
          {participants.map((p) => (
            <tr key={p.id} className={p.answered ? "is-answered" : ""}>
              <td className="ptable__sticky ptable__name">{p.name}</td>
              <td>{p.choice ? CHOICE_LABEL[p.choice] : "—"}</td>
              <td>{p.shirt_color ? COLOR_LABEL[p.shirt_color] : "—"}</td>
              <td>{p.shirt_size ?? "—"}</td>
              <td className="ptable__shirtname">{p.shirt_name ?? "—"}</td>
              <td>{p.shirt_number ?? "—"}</td>
              <td>{p.answered ? money(p.amount) : "—"}</td>
              <td>
                <YesNo value={p.paid} tone="paid" />
              </td>
              <td>{formatDateOnly(p.paid_at) || "—"}</td>
              <td>
                <YesNo value={p.answered} tone="cyan" />
              </td>
              <td>{formatDateOnly(p.submitted_at) || "—"}</td>
              <td>
                <YesNo value={p.shared} tone="paid" />
              </td>
              <td>{formatDateOnly(p.shared_at) || "—"}</td>
              <td>
                <div className="ptable__actions">
                  <button
                    type="button"
                    className="iconbtn"
                    onClick={() => copy(p)}
                    title="Copiar link"
                  >
                    {copiedId === p.id ? "✓" : "Copiar"}
                  </button>
                  <button
                    type="button"
                    className="iconbtn"
                    onClick={() => onShare(p)}
                    title="Compartilhar"
                  >
                    Enviar
                  </button>
                  <button
                    type="button"
                    className="iconbtn"
                    onClick={() => onEdit(p)}
                    title="Editar nome"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="iconbtn iconbtn--danger"
                    onClick={() => onDelete(p)}
                    title="Excluir"
                  >
                    Excluir
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
