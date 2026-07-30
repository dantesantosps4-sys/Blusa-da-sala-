import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  adminListParticipants,
  adminCreateParticipant,
  adminUpdateName,
  adminDeleteParticipant,
  adminMarkShared,
} from "../lib/api";
import type { Participant, AdminStats } from "../types";

const POLL_MS = 8000;

export function useAdminParticipants() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const firstLoad = useRef(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await adminListParticipants();
      setParticipants(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar alunos.");
    } finally {
      if (!silent) setLoading(false);
      firstLoad.current = false;
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // "Tempo real" via polling: a tabela é fechada por RLS, então
  // atualizamos por chamada periódica em vez de postgres_changes.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!firstLoad.current) void load(true);
    }, POLL_MS);
    const onFocus = () => void load(true);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const create = useCallback(
    async (name: string) => {
      const created = await adminCreateParticipant(name);
      await load(true);
      return created;
    },
    [load],
  );

  const rename = useCallback(
    async (id: string, name: string) => {
      const updated = await adminUpdateName(id, name);
      setParticipants((prev) =>
        prev.map((p) => (p.id === id ? updated : p)),
      );
      return updated;
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    await adminDeleteParticipant(id);
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const markShared = useCallback(async (id: string) => {
    const updated = await adminMarkShared(id);
    setParticipants((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  }, []);

  const stats: AdminStats = useMemo(() => {
    const total = participants.length;
    const answered = participants.filter((p) => p.answered).length;
    const onlyBlusa = participants.filter((p) => p.choice === "blusa").length;
    const blusaShort = participants.filter(
      (p) => p.choice === "blusa_short",
    ).length;
    const sharedCount = participants.filter((p) => p.shared).length;
    const expected = participants
      .filter((p) => p.answered)
      .reduce((s, p) => s + Number(p.amount), 0);
    const collected = participants
      .filter((p) => p.paid)
      .reduce((s, p) => s + Number(p.amount), 0);
    return {
      total,
      answered,
      pending: total - answered,
      onlyBlusa,
      blusaShort,
      sharedCount,
      sharedPct: total === 0 ? 0 : Math.round((sharedCount / total) * 100),
      expected,
      collected,
      outstanding: expected - collected,
    };
  }, [participants]);

  return {
    participants,
    stats,
    loading,
    error,
    reload: () => load(false),
    create,
    rename,
    remove,
    markShared,
  };
}
