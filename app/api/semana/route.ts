import { FUSO, dobrar } from "@/lib/ics";

// Evento que se repete toda segunda às 8h no Calendário do iPhone, com aviso na tela e link para a agenda da semana.
export async function GET(req: Request) {
  const base = new URL(req.url).origin;
  const hoje = new Date(new Date().toLocaleString("en-US", { timeZone: FUSO }));
  const seg = new Date(hoje);
  seg.setDate(seg.getDate() + ((8 - seg.getDay()) % 7 || 7)); // próxima segunda
  const p = (n: number) => String(n).padStart(2, "0");
  const dia = `${seg.getFullYear()}${p(seg.getMonth() + 1)}${p(seg.getDate())}`;
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const link = `${base}/?ver=semana`;
  const linhas = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Agenda Alertas//PT-BR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE", `TZID:${FUSO}`, "BEGIN:STANDARD", "DTSTART:19700101T000000", "TZOFFSETFROM:-0300", "TZOFFSETTO:-0300", "TZNAME:-03", "END:STANDARD", "END:VTIMEZONE",
    "BEGIN:VEVENT",
    "UID:agenda-da-semana@agenda-atl",
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=${FUSO}:${dia}T080000`,
    `DTEND;TZID=${FUSO}:${dia}T081500`,
    "RRULE:FREQ=WEEKLY;BYDAY=MO",
    "SUMMARY:📅 Sua agenda da semana",
    `URL:${link}`,
    `DESCRIPTION:Toque no link para ver todos os compromissos e viagens da semana:\\n${link}`,
    "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:📅 Sua agenda da semana", "TRIGGER:PT0S", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ];
  return new Response(linhas.map(dobrar).join("\r\n") + "\r\n", {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="agenda-da-semana.ics"', "Cache-Control": "no-store" },
  });
}
