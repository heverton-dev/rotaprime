import { supabase } from "@/integrations/supabase/client";

/**
 * Fila local de sincronização: quando o estafeta está sem rede, as atualizações
 * de paradas e registos de ponto ficam guardadas no dispositivo e são enviadas
 * sequencialmente assim que a ligação regressa.
 */
type Pendente =
  | { kind: "stop"; id: string; campos: Record<string, unknown> }
  | { kind: "time"; payload: Record<string, unknown> };

const CHAVE = "ctt.fila-sincronizacao";

function ler(): Pendente[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(CHAVE) ?? "[]") as Pendente[];
  } catch {
    return [];
  }
}

function escrever(fila: Pendente[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHAVE, JSON.stringify(fila));
  window.dispatchEvent(new Event("ctt-fila"));
}

export function tamanhoFila() {
  return ler().length;
}

function enfileirar(item: Pendente) {
  escrever([...ler(), item]);
}

async function enviar(item: Pendente) {
  if (item.kind === "stop") {
    const { error } = await supabase.from("stops").update(item.campos as never).eq("id", item.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("time_entries").insert(item.payload as never);
    if (error) throw error;
  }
}

/** Tenta enviar já; em falha ou sem rede, guarda para sincronizar mais tarde. */
export async function guardarParada(id: string, campos: Record<string, unknown>) {
  const item: Pendente = { kind: "stop", id, campos };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    enfileirar(item);
    return { sincronizado: false };
  }
  try {
    await enviar(item);
    return { sincronizado: true };
  } catch {
    enfileirar(item);
    return { sincronizado: false };
  }
}

export async function guardarPonto(payload: Record<string, unknown>) {
  const item: Pendente = { kind: "time", payload };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    enfileirar(item);
    return { sincronizado: false };
  }
  try {
    await enviar(item);
    return { sincronizado: true };
  } catch {
    enfileirar(item);
    return { sincronizado: false };
  }
}

/** Envia a fila por ordem de entrada. Devolve quantos itens foram enviados. */
export async function sincronizarFila() {
  const fila = ler();
  let enviados = 0;
  for (const item of fila) {
    try {
      await enviar(item);
      enviados++;
    } catch {
      break;
    }
  }
  if (enviados) escrever(fila.slice(enviados));
  return enviados;
}
