import {
  SHIRT_SIZES,
  COLOR_LABEL,
  SHIRT_COLORS,
  CHOICE_LABEL,
} from "../../types";

export type TriState = "all" | "yes" | "no";

export interface FilterState {
  answered: TriState;
  paid: TriState;
  shared: TriState;
  type: "all" | "blusa" | "blusa_short";
  color: "all" | "azul" | "branca";
  size: "all" | (typeof SHIRT_SIZES)[number];
}

export const EMPTY_FILTERS: FilterState = {
  answered: "all",
  paid: "all",
  shared: "all",
  type: "all",
  color: "all",
  size: "all",
};

interface FilterBarProps {
  value: FilterState;
  onChange: (next: FilterState) => void;
}

export function FilterBar({ value, onChange }: FilterBarProps) {
  const set = <K extends keyof FilterState>(key: K, v: FilterState[K]) =>
    onChange({ ...value, [key]: v });

  const isDirty = JSON.stringify(value) !== JSON.stringify(EMPTY_FILTERS);

  return (
    <div className="filterbar">
      <label className="selectfield">
        <span>Respondido</span>
        <select
          value={value.answered}
          onChange={(e) => set("answered", e.target.value as TriState)}
        >
          <option value="all">Todos</option>
          <option value="yes">Sim</option>
          <option value="no">Não</option>
        </select>
      </label>

      <label className="selectfield">
        <span>Pago</span>
        <select
          value={value.paid}
          onChange={(e) => set("paid", e.target.value as TriState)}
        >
          <option value="all">Todos</option>
          <option value="yes">Sim</option>
          <option value="no">Não</option>
        </select>
      </label>

      <label className="selectfield">
        <span>Compartilhado</span>
        <select
          value={value.shared}
          onChange={(e) => set("shared", e.target.value as TriState)}
        >
          <option value="all">Todos</option>
          <option value="yes">Sim</option>
          <option value="no">Não</option>
        </select>
      </label>

      <label className="selectfield">
        <span>Tipo</span>
        <select
          value={value.type}
          onChange={(e) => set("type", e.target.value as FilterState["type"])}
        >
          <option value="all">Todos</option>
          <option value="blusa">{CHOICE_LABEL.blusa}</option>
          <option value="blusa_short">{CHOICE_LABEL.blusa_short}</option>
        </select>
      </label>

      <label className="selectfield">
        <span>Cor</span>
        <select
          value={value.color}
          onChange={(e) => set("color", e.target.value as FilterState["color"])}
        >
          <option value="all">Todas</option>
          {SHIRT_COLORS.map((c) => (
            <option key={c} value={c}>
              {COLOR_LABEL[c]}
            </option>
          ))}
        </select>
      </label>

      <label className="selectfield">
        <span>Tamanho</span>
        <select
          value={value.size}
          onChange={(e) => set("size", e.target.value as FilterState["size"])}
        >
          <option value="all">Todos</option>
          {SHIRT_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      {isDirty && (
        <button
          type="button"
          className="filterbar__clear"
          onClick={() => onChange(EMPTY_FILTERS)}
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
