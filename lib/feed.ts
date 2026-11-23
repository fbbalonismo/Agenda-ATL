// Calendário assinado no iPhone (Ajustes → Calendário → Contas → Calendários Assinados).
// O iPhone busca este arquivo sozinho de tempos em tempos: salvar no app = aparece no Calendário, sem tocar em "Adicionar".
import { createHmac } from "node:crypto";
import type { Compromisso } from "./agenda";
import { FUSO, HORA_AVISO_MANHA, calcularAvisos, dobrar, escapar, local, somarMinutos } from "./ics.ts";

// Chave do link de assinatura: derivada da APP_SENHA. Trocar a senha troca o link (o antigo para de funcionar).
export function chaveAssinatura(senha: string) {
  return createHmac("sha256", senha).update("agenda-atl:calendario:v1").digest("base64url").slice(0, 32);
}

const diaSeguinte = (data: string) => somarMinutos(data, "00:00", 24 * 60).slice(0, 8);

export function gerarCalendario(lista: Compromisso[], agora = new Date()): string {
  const stamp = agora.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Agenda ATL//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Agenda ATL",
    `X-WR-TIMEZONE:${FUSO}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
    "X-PUBLISHED-TTL:PT15M",
    "BEGIN:VTIMEZONE",
    `TZID:${FUSO}`,
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:-0300",
    "TZOFFSETTO:-0300",
    "TZNAME:-03",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];
  for (const c of lista) {
    if (!c.id || !c.titulo?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(c.data)) continue;
    const titulo = c.titulo.trim();
    const comHora = /^\d{2}:\d{2}$/.test(c.hora || "");
    linhas.push("BEGIN:VEVENT", `UID:${c.id}@agenda-atl`, `DTSTAMP:${stamp}`);
    if (comHora) {
      linhas.push(`DTSTART;TZID=${FUSO}:${local(c.data, c.hora)}`, `DTEND;TZID=${FUSO}:${somarMinutos(c.data, c.hora, 60)}`);
    } else {
      linhas.push(`DTSTART;VALUE=DATE:${c.data.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${diaSeguinte(c.data)}`);
    }
    linhas.push(`SUMMARY:${escapar(titulo)}`, "STATUS:CONFIRMED", "TRANSP:OPAQUE");
    if (c.repetir === "ano") linhas.push("RRULE:FREQ=YEARLY");
    if (c.local?.trim()) linhas.push(`LOCATION:${escapar(c.local.trim())}`);
    if (c.observacao?.trim()) linhas.push(`DESCRIPTION:${escapar(c.observacao.trim())}`);
    const gatilhos = comHora
      ? calcularAvisos(c.hora).map((a) => (a.minutosAntes === 0 ? "TRIGGER:PT0S" : `TRIGGER:-PT${a.minutosAntes}M`))
      : [`TRIGGER:PT${HORA_AVISO_MANHA}H`]; // dia inteiro: aviso às 8h do dia
    for (const g of gatilhos) linhas.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escapar(titulo)}`, g, "END:VALARM");
    linhas.push("END:VEVENT");
  }
  linhas.push("END:VCALENDAR");
  return linhas.map(dobrar).join("\r\n") + "\r\n";
}
