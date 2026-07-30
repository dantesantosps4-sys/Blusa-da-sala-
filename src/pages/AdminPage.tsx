import { useMemo, useState } from "react";
import { useAdminParticipants } from "../hooks/useAdminParticipants";
import { StatCards } from "../components/admin/StatCards";
import { AdminCharts } from "../components/admin/AdminCharts";
import { ParticipantsTable } from "../components/admin/ParticipantsTable";
import {
  FilterBar,
  EMPTY_FILTERS,
  type FilterState,
} from "../components/admin/FilterBar";
import { NameFormModal } from "../components/admin/NameFormModal";
import { ConfirmDialog } from "../components/shared/Modal";
import { useToast } from "../components/shared/Toast";
import { exportParticipantsCsv } from "../utils/csv";
import { normalize, studentLink } from "../utils/format";
import type { Participant } from "../types";

function triMatch(state: "all" | "yes" | "no", value: boolean): boolean {
  if (state === "all") return true;
  return state === "yes" ? value : !value;
}

export function AdminPage() {
  const {
    participants,
    stats,
    loading,
    error,
    reload,
    create,
    rename,
    remove,
    markShared,
  } = useAdminParticipants();
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Participant | null>(null);
  const [deleting, setDeleting] = useState<Participant | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = normalize(query);
    return participants.filter((p) => {
      if (!triMatch(filters.answered, p.answered)) return false;
      if (!triMatch(filters.paid, p.paid)) return false;
      if (!triMatch(filters.shared, p.shared)) return false;
      if (filters.type !== "all" && p.choice !== filters.type) return false;
      if (filters.color !== "all" && p.shirt_color !== filters.color)
        return false;
      if (filters.size !== "all" && p.shirt_size !== filters.size) return false;

      if (q) {
        const inName = normalize(p.name).includes(q);
        const inShirt = p.shirt_name
          ? normalize(p.shirt_name).includes(q)
          : false;
        const inNumber =
          p.shirt_number !== null && String(p.shirt_number).includes(q);
        if (!inName && !inShirt && !inNumber) return false;
      }
      return true;
    });
  }, [participants, query, filters]);

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.show("Link copiado.", "success");
    } catch {
      toast.show("Não foi possível copiar. Copie manualmente.", "error");
    }
  };

  const share = async (p: Participant) => {
    const link = studentLink(p.token);

    if (!navigator.share) {
      await copyLink(link);
      return;
    }

    try {
      await navigator.share({
        title: "Blusa da turma",
        text: `${p.name}, confirme sua blusa da turma:`,
        url: link,
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      toast.show("Não foi possível compartilhar.", "error");
      return;
    }

    try {
      if (!p.shared) await markShared(p.id);
      toast.show("Link compartilhado com sucesso.", "success");
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : "Erro ao registrar envio.",
        "error",
      );
    }
  };

  const handleCreate = async (name: string) => {
    try {
      await create(name);
      toast.show(`${name} cadastrado(a).`, "success");
      setCreating(false);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Erro ao cadastrar.", "error");
    }
  };

  const handleRename = async (name: string) => {
    if (!editing) return;
    try {
      await rename(editing.id, name);
      toast.show("Nome atualizado.", "success");
      setEditing(null);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Erro ao editar.", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await remove(deleting.id);
      toast.show("Aluno excluído.", "info");
      setDeleting(null);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Erro ao excluir.", "error");
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleExport = () => {
    if (participants.length === 0) {
      toast.show("Não há dados para exportar.", "error");
      return;
    }
    exportParticipantsCsv(participants);
    toast.show("CSV exportado.", "success");
  };

  return (
    <div className="app">
      <header className="hero">
        <div className="hero__mark" aria-hidden="true">
          👕
        </div>
        <div>
          <h1 className="hero__title">Painel da Turma</h1>
          <p className="hero__subtitle">Blusas • gestão de links e pagamentos</p>
        </div>
      </header>

      {error && (
        <div className="state state--error">
          <strong>Ops.</strong> {error}{" "}
          <button className="linkbtn" onClick={reload}>
            tentar de novo
          </button>
        </div>
      )}

      <StatCards stats={stats} />
      <AdminCharts stats={stats} />

      <section className="panel">
        <div className="toolbar toolbar--wrap">
          <div className="search search--inline">
            <input
              className="search__input"
              type="search"
              placeholder="Buscar por nome, nome na blusa ou número…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Buscar"
            />
          </div>
          <div className="toolbar__spacer" />
          <button className="btn btn--primary" onClick={() => setCreating(true)}>
            + Novo aluno
          </button>
          <button className="btn btn--ghost" onClick={handleExport}>
            Exportar CSV
          </button>
          <button className="btn btn--ghost" onClick={reload}>
            Atualizar
          </button>
        </div>

        <FilterBar value={filters} onChange={setFilters} />

        <div className="panel__count">
          {filtered.length} de {participants.length} alunos
        </div>

        {loading ? (
          <div className="state state--loading">Carregando alunos…</div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <p className="empty__title">Nenhum aluno neste filtro</p>
            <p className="empty__hint">
              Ajuste a busca ou os filtros para ver a lista.
            </p>
          </div>
        ) : (
          <ParticipantsTable
            participants={filtered}
            onCopy={copyLink}
            onShare={share}
            onEdit={setEditing}
            onDelete={setDeleting}
          />
        )}
      </section>

      <footer className="footer">
        {stats.sharedCount}/{stats.total} links enviados • {stats.answered}{" "}
        responderam
      </footer>

      <NameFormModal
        open={creating}
        title="Novo aluno"
        confirmLabel="Cadastrar"
        onSubmit={handleCreate}
        onClose={() => setCreating(false)}
      />

      <NameFormModal
        open={editing !== null}
        title="Editar nome"
        initialName={editing?.name}
        confirmLabel="Salvar"
        onSubmit={handleRename}
        onClose={() => setEditing(null)}
      />

      <ConfirmDialog
        open={deleting !== null}
        danger
        busy={deleteBusy}
        title="Excluir aluno?"
        message={`Isso remove ${deleting?.name ?? "o aluno"} e invalida o link dele. Não dá para desfazer.`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
