// Ponte entre o "Meu ano" do Agenda ATL e os compromissos (events) do app Agente de Viagens.
// Os dois apps usam o mesmo banco (Upstash Redis, chave agente-viagens:state).
import type { Compromisso } from "./agenda";

export type EventoViagens = {
  id: string;
  title: string;
  date: string;
  time?: string;
  endDate?: string;
  place?: string;
  city?: string;
  notes?: string;
  repeat?: "" | "ano";
  kind?: string;
  status?: string;
  origem?: string;
  u?: number;
  [k: string]: unknown;
};

export type ItemViagem = { id: string; viagem: string; emoji: string; tipo: string; titulo: string; data: string; hora: string; status: string };

export const deEvento = (e: EventoViagens): Compromisso => ({
  id: e.id,
  titulo: e.title || "",
  data: e.date || "",
  hora: e.time || "",
  local: [e.place, e.city].filter(Boolean).join(", "),
  observacao: e.notes || "",
  repetir: e.repeat === "ano" ? "ano" : "",
});

// Mantém os campos que só o app de viagens usa (tipo, ingresso, checklist…) ao editar pelo Agenda ATL.
export const paraEvento = (c: Compromisso, antigo?: EventoViagens): EventoViagens => ({
  kind: "outro",
  status: "confirmado",
  origem: "atl",
  ...(antigo || {}),
  id: c.id,
  title: c.titulo,
  date: c.data,
  time: c.hora,
  place: c.local,
  notes: c.observacao,
  repeat: c.repetir,
});
