import { useEffect, useState } from "react";
import { Modal } from "../shared/Modal";

interface NameFormModalProps {
  open: boolean;
  title: string;
  initialName?: string;
  confirmLabel: string;
  onSubmit: (name: string) => Promise<void>;
  onClose: () => void;
}

export function NameFormModal({
  open,
  title,
  initialName = "",
  confirmLabel,
  onSubmit,
  onClose,
}: NameFormModalProps) {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setName(initialName);
  }, [open, initialName]);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onSubmit(trimmed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} title={title} onClose={onClose} busy={busy}>
      <label className="field">
        <span className="field__label">Nome do aluno</span>
        <input
          className="field__input"
          value={name}
          autoFocus
          placeholder="Ex.: Maria Clara"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
        />
      </label>
      <div className="dialog__actions">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onClose}
          disabled={busy}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={submit}
          disabled={busy || !name.trim()}
        >
          {busy ? "Salvando…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
