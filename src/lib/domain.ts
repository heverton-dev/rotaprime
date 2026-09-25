export const STOP_ESTADOS = {
  pendente: { label: "Pendente", tone: "muted" },
  em_curso: { label: "Em curso", tone: "info" },
  concluida: { label: "Concluída", tone: "success" },
  insucesso: { label: "Insucesso", tone: "destructive" },
  reversa: { label: "Logística reversa", tone: "warning" },
} as const;

export const ROUTE_ESTADOS = {
  planeada: { label: "Planeada", tone: "muted" },
  em_curso: { label: "Em curso", tone: "info" },
  concluida: { label: "Concluída", tone: "success" },
} as const;

export const VEHICLE_ESTADOS = {
  ativa: { label: "Ativa", tone: "success" },
  manutencao: { label: "Em manutenção", tone: "warning" },
  inativa: { label: "Inativa", tone: "muted" },
} as const;

export const EXPENSE_TIPOS = {
  combustivel: "Combustível",
  portagem: "Portagem",
  estacionamento: "Estacionamento",
  outro: "Outro",
} as const;

export const ROLE_LABELS = {
  god: "Utilizador GOD",
  super_admin: "Super Admin",
  admin: "Admin-Empresa",
  colaborador: "Colaborador",
  estafeta: "Estafeta",
} as const;

export const TIME_TIPOS = {
  checkin: "Início de dia",
  pausa_inicio: "Início da pausa",
  pausa_fim: "Fim da pausa",
  checkout: "Fim de expediente",
} as const;

/** Tolerância de geofencing em metros para concluir uma parada. */
export const GEOFENCE_RAIO_M = 120;

/** Tempo máximo de permanência numa parada antes do alerta de SLA (minutos). */
export const SLA_PARADA_MIN = 12;

export function euro(valor: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(valor || 0);
}

export function hora(iso?: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );
}

export function dataCurta(iso?: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short" }).format(new Date(iso));
}

/** Distância em metros entre duas coordenadas (Haversine). */
export function distanciaM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export function minutosEntre(inicio?: string | null, fim?: string | null) {
  if (!inicio) return null;
  const end = fim ? new Date(fim).getTime() : Date.now();
  return Math.max(0, Math.round((end - new Date(inicio).getTime()) / 60000));
}
