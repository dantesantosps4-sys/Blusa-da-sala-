import { supabase, ADMIN_KEY, isSupabaseConfigured } from "./supabase";
import type {
  Participant,
  StudentView,
  Choice,
  ShirtColor,
  ShirtSize,
  SubmitStatus,
} from "../types";

function ensureConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase não configurado. Preencha .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.",
    );
  }
}

/** ---------------- Aluno ---------------- */

export async function fetchStudentByToken(
  token: string,
): Promise<StudentView | null> {
  ensureConfigured();
  const { data, error } = await supabase.rpc("get_participant_by_token", {
    p_token: token,
  });
  if (error) throw new Error(error.message);
  return (data as StudentView | null) ?? null;
}

export async function submitResponse(
  token: string,
  choice: Choice,
  paid: boolean,
  color: ShirtColor,
  size: ShirtSize,
  shirtName: string,
  shirtNumber: number,
): Promise<{ status: SubmitStatus; amount?: number }> {
  ensureConfigured();
  const { data, error } = await supabase.rpc("submit_response", {
    p_token: token,
    p_choice: choice,
    p_paid: paid,
    p_color: color,
    p_size: size,
    p_name: shirtName,
    p_number: shirtNumber,
  });
  if (error) throw new Error(error.message);
  return data as { status: SubmitStatus; amount?: number };
}

/** ---------------- Admin ---------------- */

function mapAdminError(message: string): string {
  if (message.includes("unauthorized")) {
    return "Chave de admin inválida. Confira VITE_ADMIN_KEY.";
  }
  return message;
}

export async function adminListParticipants(): Promise<Participant[]> {
  ensureConfigured();
  const { data, error } = await supabase.rpc("admin_list_participants", {
    p_key: ADMIN_KEY,
  });
  if (error) throw new Error(mapAdminError(error.message));
  return (data as Participant[]) ?? [];
}

export async function adminCreateParticipant(
  name: string,
): Promise<Participant> {
  ensureConfigured();
  const { data, error } = await supabase.rpc("admin_create_participant", {
    p_key: ADMIN_KEY,
    p_name: name,
  });
  if (error) throw new Error(mapAdminError(error.message));
  return data as Participant;
}

export async function adminUpdateName(
  id: string,
  name: string,
): Promise<Participant> {
  ensureConfigured();
  const { data, error } = await supabase.rpc("admin_update_name", {
    p_key: ADMIN_KEY,
    p_id: id,
    p_name: name,
  });
  if (error) throw new Error(mapAdminError(error.message));
  return data as Participant;
}

export async function adminDeleteParticipant(id: string): Promise<void> {
  ensureConfigured();
  const { error } = await supabase.rpc("admin_delete_participant", {
    p_key: ADMIN_KEY,
    p_id: id,
  });
  if (error) throw new Error(mapAdminError(error.message));
}

export async function adminMarkShared(id: string): Promise<Participant> {
  ensureConfigured();
  const { data, error } = await supabase.rpc("admin_mark_shared", {
    p_key: ADMIN_KEY,
    p_id: id,
  });
  if (error) throw new Error(mapAdminError(error.message));
  return data as Participant;
}
