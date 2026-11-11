// Gera o arquivo de calendário (.ics) que o iPhone importa no app Calendário.
// Todos os horários são de Brasília (America/Sao_Paulo, -03:00, sem horário de verão).

export const FUSO = "America/Sao_Paulo";
export const HORA_AVISO_MANHA = 8; // aviso no dia, às 8h
export const MINUTOS_ANTES = 60; // aviso 1 hora antes

export type Compromisso = {
  titulo: string;
  data: string; // AAAA-MM-DD
  hora: string; // HH:MM
  duracaoMin?: number;
  local?: string;
  notas?: string;
};

export type Aviso = { minutosAntes: number; rotulo: string };

/** Avisos do compromisso: às 8h do dia (quando fizer sentido), 1 hora antes e na hora. */
export function calcularAvisos(hora: string): Aviso[] {
  const [h, m] = hora.split(":").map(Number);
  const inicioMin = h * 60 + m;
  const avisos: Aviso[] = [];
  const antes = inicioMin - MINUTOS_ANTES;
  avisos.push({
    minutosAntes: MINUTOS_ANTES,
    rotulo: antes >= 0 ? `${fmtHora(antes)} (1 hora antes)` : "1 hora antes (no dia anterior)",
  });
  const manha = inicioMin - HORA_AVISO_MANHA * 60;
  // Só faz sentido se o compromisso for depois das 8h e se não coincidir com o aviso de 1 hora antes.
  if (manha > 0 && manha !== MINUTOS_ANTES) {
    avisos.unshift({ minutosAntes: manha, rotulo: `${fmtHora(HORA_AVISO_MANHA * 60)} (manhã do dia)` });
  }
  avisos.push({ minutosAntes: 0, rotulo: `${fmtHora(inicioMin)} (na hora)` });
  return avisos;
}

function fmtHora(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export function validar(c: Compromisso): string | null {
  if (!c.titulo?.trim()) return "Falta o nome do compromisso.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.data ?? "")) return "Falta a data.";
  if (!/^\d{2}:\d{2}$/.test(c.hora ?? "")) return "Falta o horário.";
  return null;
}

function escapar(texto: string) {
  return texto.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

// Linhas do .ics têm no máximo 75 bytes; as seguintes começam com espaço.
export function dobrar(linha: string) {
  const enc = new TextEncoder();
  const partes: string[] = [];
  let atual = "";
  let bytes = 0;
  for (const ch of linha) {
    const b = enc.encode(ch).length;
    const limite = partes.length === 0 ? 75 : 74;
    if (bytes + b > limite) {
      partes.push(atual);
      atual = "";
      bytes = 0;
    }
    atual += ch;
    bytes += b;
  }
  partes.push(atual);
  return partes.join("\r\n ");
}

function local(data: string, hora: string) {
  return `${data.replace(/-/g, "")}T${hora.replace(":", "")}00`;
}

function somarMinutos(data: string, hora: string, minutos: number) {
  const [a, mes, d] = data.split("-").map(Number);
  const [h, m] = hora.split(":").map(Number);
  const t = new Date(Date.UTC(a, mes - 1, d, h, m + minutos));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${t.getUTCFullYear()}${p(t.getUTCMonth() + 1)}${p(t.getUTCDate())}T${p(t.getUTCHours())}${p(t.getUTCMinutes())}00`;
}

export function gerarIcs(c: Compromisso, agora = new Date()): string {
  const duracao = c.duracaoMin && c.duracaoMin > 0 ? c.duracaoMin : 60;
  const stamp = agora.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const uid = `${local(c.data, c.hora)}-${Math.random().toString(36).slice(2, 10)}@agenda-alertas`;
  const titulo = c.titulo.trim();

  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Agenda Alertas//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE",
    `TZID:${FUSO}`,
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:-0300",
    "TZOFFSETTO:-0300",
    "TZNAME:-03",
    "END:STANDARD",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=${FUSO}:${local(c.data, c.hora)}`,
    `DTEND;TZID=${FUSO}:${somarMinutos(c.data, c.hora, duracao)}`,
    `SUMMARY:${escapar(titulo)}`,
  ];
  if (c.local?.trim()) linhas.push(`LOCATION:${escapar(c.local.trim())}`);
  if (c.notas?.trim()) linhas.push(`DESCRIPTION:${escapar(c.notas.trim())}`);

  for (const aviso of calcularAvisos(c.hora)) {
    linhas.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapar(titulo)}`,
      aviso.minutosAntes === 0 ? "TRIGGER:PT0S" : `TRIGGER:-PT${aviso.minutosAntes}M`,
      "END:VALARM",
    );
  }
  linhas.push("END:VEVENT", "END:VCALENDAR");
  return linhas.map(dobrar).join("\r\n") + "\r\n";
}
