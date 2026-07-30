import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchStudentByToken, submitResponse } from "../lib/api";
import {
  PRICES,
  CHOICE_LABEL,
  COLOR_LABEL,
  SHIRT_COLORS,
  SHIRT_SIZES,
  SHIRT_NAME_MAX,
  normalizeShirtName,
  type Choice,
  type ShirtColor,
  type ShirtSize,
  type StudentView,
} from "../types";
import { money } from "../utils/format";
import { NotFoundPage } from "./NotFoundPage";

type Phase = "loading" | "form" | "done" | "notfound" | "error";

export function StudentPage() {
  const { token = "" } = useParams();
  const [phase, setPhase] = useState<Phase>("loading");
  const [student, setStudent] = useState<StudentView | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [choice, setChoice] = useState<Choice | null>(null);
  const [color, setColor] = useState<ShirtColor | null>(null);
  const [size, setSize] = useState<ShirtSize | null>(null);
  const [shirtName, setShirtName] = useState("");
  const [numberText, setNumberText] = useState("");
  const [paid, setPaid] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchStudentByToken(token);
        if (!active) return;
        if (!data) {
          setPhase("notfound");
          return;
        }
        setStudent(data);
        setChoice(data.choice);
        setColor(data.shirt_color);
        setSize(data.shirt_size);
        setShirtName(data.shirt_name ?? "");
        setNumberText(
          data.shirt_number !== null ? String(data.shirt_number) : "",
        );
        setPaid(data.paid);
        setPhase(data.answered ? "done" : "form");
      } catch (e) {
        if (!active) return;
        setErrorMsg(e instanceof Error ? e.message : "Erro ao carregar.");
        setPhase("error");
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const total = choice ? PRICES[choice] : 0;
  const normalizedName = normalizeShirtName(shirtName).trim();
  const parsedNumber =
    numberText === "" ? null : Math.min(999, parseInt(numberText, 10));

  const canSubmit = useMemo(
    () =>
      choice !== null &&
      color !== null &&
      size !== null &&
      normalizedName.length > 0 &&
      parsedNumber !== null &&
      !Number.isNaN(parsedNumber) &&
      parsedNumber >= 0 &&
      parsedNumber <= 999,
    [choice, color, size, normalizedName, parsedNumber],
  );

  const handleNumberChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 3);
    setNumberText(digits);
  };

  const errorText = (status: string): string => {
    switch (status) {
      case "invalid_name":
        return "Confira o nome na blusa (1 a 20 caracteres).";
      case "invalid_number":
        return "Número inválido (0 a 999).";
      case "invalid_color":
        return "Escolha a cor.";
      case "invalid_size":
        return "Escolha o tamanho.";
      case "invalid_choice":
        return "Escolha o tipo da blusa.";
      default:
        return "Não foi possível enviar.";
    }
  };

  const handleConfirm = async () => {
    if (!canSubmit || !choice || !color || !size || parsedNumber === null) {
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitResponse(
        token,
        choice,
        paid,
        color,
        size,
        normalizedName,
        parsedNumber,
      );
      if (res.status === "ok" || res.status === "already_used") {
        setPhase("done");
      } else if (res.status === "not_found") {
        setPhase("notfound");
      } else {
        setErrorMsg(errorText(res.status));
        setPhase("error");
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Erro ao enviar.");
      setPhase("error");
    } finally {
      setSubmitting(false);
    }
  };

  if (phase === "loading") {
    return (
      <div className="student">
        <div className="state state--loading">Carregando…</div>
      </div>
    );
  }

  if (phase === "notfound") return <NotFoundPage />;

  if (phase === "error") {
    return (
      <div className="student">
        <div className="scard">
          <div className="scard__badge scard__badge--error">!</div>
          <h1 className="scard__title">Algo deu errado</h1>
          <p className="scard__text">{errorMsg}</p>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setPhase("form")}
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    const sChoice = student?.choice ?? choice;
    const sColor = student?.shirt_color ?? color;
    const sSize = student?.shirt_size ?? size;
    const sName = student?.shirt_name ?? normalizedName;
    const sNumber = student?.shirt_number ?? parsedNumber;
    return (
      <div className="student">
        <div className="scard scard--success">
          <div className="scard__badge scard__badge--success">✓</div>
          <h1 className="scard__title">Resposta enviada com sucesso</h1>
          <p className="scard__text">Este link já foi utilizado.</p>
          {student && (
            <div className="scard__summary">
              <div>
                <span>Aluno</span>
                <strong>{student.name}</strong>
              </div>
              {sChoice && (
                <div>
                  <span>Tipo</span>
                  <strong>{CHOICE_LABEL[sChoice]}</strong>
                </div>
              )}
              {sColor && (
                <div>
                  <span>Cor</span>
                  <strong>{COLOR_LABEL[sColor]}</strong>
                </div>
              )}
              {sSize && (
                <div>
                  <span>Tamanho</span>
                  <strong>{sSize}</strong>
                </div>
              )}
              {sName && (
                <div>
                  <span>Nome na blusa</span>
                  <strong>{sName}</strong>
                </div>
              )}
              {sNumber !== null && (
                <div>
                  <span>Número</span>
                  <strong>{sNumber}</strong>
                </div>
              )}
              <div>
                <span>Valor</span>
                <strong>
                  {money(student.amount || (choice ? PRICES[choice] : 0))}
                </strong>
              </div>
              <div>
                <span>Pagamento</span>
                <strong>{student.paid || paid ? "Confirmado" : "Pendente"}</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // phase === "form"
  return (
    <div className="student">
      <div className="scard scard--form">
        <p className="scard__eyebrow">Blusa da turma</p>
        <h1 className="scard__title">Olá, {student?.name}</h1>
        <p className="scard__text">Preencha os dados da sua blusa e confirme.</p>

        {/* Tipo */}
        <div className="field-group">
          <span className="field-group__label">Tipo</span>
          <div className="options">
            {(Object.keys(PRICES) as Choice[]).map((opt) => (
              <button
                type="button"
                key={opt}
                className={`option ${choice === opt ? "option--active" : ""}`}
                onClick={() => setChoice(opt)}
                aria-pressed={choice === opt}
              >
                <span className="option__radio" aria-hidden="true" />
                <span className="option__label">{CHOICE_LABEL[opt]}</span>
                <span className="option__price">{money(PRICES[opt])}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Cor */}
        <div className="field-group">
          <span className="field-group__label">Cor da blusa</span>
          <div className="pills">
            {SHIRT_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                className={`pill ${color === c ? "pill--active" : ""}`}
                onClick={() => setColor(c)}
                aria-pressed={color === c}
              >
                {COLOR_LABEL[c]}
              </button>
            ))}
          </div>
        </div>

        {/* Tamanho */}
        <div className="field-group">
          <span className="field-group__label">Tamanho</span>
          <div className="pills pills--grid">
            {SHIRT_SIZES.map((s) => (
              <button
                type="button"
                key={s}
                className={`pill ${size === s ? "pill--active" : ""}`}
                onClick={() => setSize(s)}
                aria-pressed={size === s}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Nome na blusa */}
        <div className="field-group">
          <label className="field-group__label" htmlFor="shirt-name">
            Nome na blusa
          </label>
          <input
            id="shirt-name"
            className="field__input"
            value={shirtName}
            maxLength={SHIRT_NAME_MAX}
            placeholder="EX.: DANTE"
            inputMode="text"
            autoCapitalize="characters"
            onChange={(e) => setShirtName(normalizeShirtName(e.target.value))}
          />
          <span className="field__hint">
            {normalizedName.length}/{SHIRT_NAME_MAX} • em maiúsculas
          </span>
        </div>

        {/* Número */}
        <div className="field-group">
          <label className="field-group__label" htmlFor="shirt-number">
            Número da blusa
          </label>
          <input
            id="shirt-number"
            className="field__input"
            value={numberText}
            inputMode="numeric"
            placeholder="0 a 999"
            onChange={(e) => handleNumberChange(e.target.value)}
          />
        </div>

        {/* Total */}
        <div className="total">
          <span>Valor total</span>
          <strong>{money(total)}</strong>
        </div>

        {/* Pagamento */}
        <label className="paidcheck">
          <input
            type="checkbox"
            checked={paid}
            onChange={(e) => setPaid(e.target.checked)}
          />
          <span>Já realizei o pagamento</span>
        </label>

        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={!canSubmit || submitting}
          onClick={handleConfirm}
        >
          {submitting ? "Enviando…" : "Confirmar"}
        </button>

        <p className="scard__note">
          Você só pode responder uma vez. Depois de confirmar, o link é
          bloqueado.
        </p>
      </div>
    </div>
  );
}
