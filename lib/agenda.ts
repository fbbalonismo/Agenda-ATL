// Agenda do ano: feriados, leitura de frases ("aniversário André 20 de outubro") e utilidades de data.
// Tudo funciona sem IA e sem internet.

export type Compromisso = {
  id: string;
  titulo: string;
  data: string; // AAAA-MM-DD
  hora: string; // HH:MM ou ""
  local: string;
  observacao: string;
  repetir: "" | "ano";
};

export const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
export const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export const CORES_MES = ["#4c7df0", "#7c5ce0", "#2fa594", "#e08a00", "#d4537e", "#1f9bb0", "#5b6bd1", "#c0622d", "#3c9d3a", "#e0563f", "#8a63c9", "#178f7f"];

const dois = (n: number) => String(n).padStart(2, "0");
export const iso = (a: number, m: number, d: number) => `${a}-${dois(m)}-${dois(d)}`;
const deIso = (s: string) => {
  const [a, m, d] = s.split("-").map(Number);
  return new Date(a, m - 1, d);
};
const paraIso = (d: Date) => iso(d.getFullYear(), d.getMonth() + 1, d.getDate());

export function diasDoAno(ano: number): string[] {
  const out: string[] = [];
  for (const d = new Date(ano, 0, 1); d.getFullYear() === ano; d.setDate(d.getDate() + 1)) out.push(paraIso(d));
  return out;
}

export function diaDaSemana(s: string) {
  return deIso(s).getDay();
}

// Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher).
export function pascoa(ano: number): Date {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

// Feriados nacionais, datas móveis, Espírito Santo e Vitória.
export function feriados(ano: number): Record<string, string> {
  const f: Record<string, string> = {};
  const fixos: Record<string, string> = {
    "01-01": "Confraternização Universal", "04-21": "Tiradentes", "05-01": "Dia do Trabalho", "09-07": "Independência",
    "09-08": "Aniversário de Vitória", "10-12": "Nossa Senhora Aparecida", "11-02": "Finados", "11-15": "Proclamação da República",
    "11-20": "Consciência Negra", "12-25": "Natal",
  };
  for (const [md, nome] of Object.entries(fixos)) f[`${ano}-${md}`] = nome;
  const p = pascoa(ano);
  const relativo = (dias: number, nome: string) => {
    const d = new Date(p);
    d.setDate(d.getDate() + dias);
    f[paraIso(d)] = nome;
  };
  relativo(-48, "Carnaval");
  relativo(-47, "Carnaval");
  relativo(-2, "Sexta-feira Santa");
  relativo(0, "Páscoa");
  relativo(8, "Nossa Senhora da Penha (ES)");
  relativo(60, "Corpus Christi");
  return f;
}

const NUM_MES: Record<string, number> = {
  janeiro: 1, jan: 1, fevereiro: 2, fev: 2, marco: 3, mar: 3, abril: 4, abr: 4, maio: 5, mai: 5, junho: 6, jun: 6,
  julho: 7, jul: 7, agosto: 8, ago: 8, setembro: 9, set: 9, outubro: 10, out: 10, novembro: 11, nov: 11, dezembro: 12, dez: 12,
};
const SEMANA = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
const HORA_RE = /\b(?:as\s+)?(\d{1,2})(?:[:h](\d{2})(?:\s*h)?|\s*(?:h|horas))(?![\w/])/;
const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// "aniversário André 20 de outubro", "jantar 05/12 às 20h", "reunião amanhã 10:30", "churrasco no sábado 13h"
export function lerFrase(frase: string, hoje: string): { titulo: string; data: string; hora: string; repetir: "" | "ano" } | null {
  const t = ` ${String(frase || "").trim()} `;
  const n = semAcento(t); // mesmo comprimento de t (só tira acentos de letras pré-compostas)
  const dataHoje = deIso(hoje);
  let a: number | null = null, m = 0, d = 0;
  let achado: RegExpMatchArray | null;
  if ((achado = n.match(/\b(?:dia\s+)?(\d{1,2})\s*(?:de\s+)?(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\b(?:\s*(?:de\s+)?(\d{4}))?/))) {
    d = +achado[1]; m = NUM_MES[achado[2]]; a = achado[3] ? +achado[3] : null;
  } else if ((achado = n.match(/\b(?:dia\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) {
    d = +achado[1]; m = +achado[2]; a = achado[3] ? (achado[3].length === 2 ? 2000 + +achado[3] : +achado[3]) : null;
  } else if ((achado = n.match(/\b(?:no |na |nesta |neste |proxim[ao] )?(domingo|segunda|terca|quarta|quinta|sexta|sabado)(?:-feira)?\b/))) {
    const x = new Date(dataHoje);
    x.setDate(x.getDate() + ((SEMANA.indexOf(achado[1]) - x.getDay() + 7) % 7));
    a = x.getFullYear(); m = x.getMonth() + 1; d = x.getDate();
  } else if ((achado = n.match(/\b(depois de amanha|amanha|hoje)\b/))) {
    const x = new Date(dataHoje);
    x.setDate(x.getDate() + (achado[1] === "hoje" ? 0 : achado[1] === "amanha" ? 1 : 2));
    a = x.getFullYear(); m = x.getMonth() + 1; d = x.getDate();
  }
  if (!achado || achado.index === undefined || !m || m > 12 || !d || d > 31) return null;
  if (a === null) {
    a = dataHoje.getFullYear();
    if (iso(a, m, d) < hoje) a++;
  }
  const corta = (s: string, i: number, f: number) => s.slice(0, i) + " " + s.slice(f);
  let titulo = corta(t, achado.index, achado.index + achado[0].length);
  let nTitulo = corta(n, achado.index, achado.index + achado[0].length);
  let hora = "";
  const h = nTitulo.match(HORA_RE);
  if (h && h.index !== undefined) {
    const hh = +h[1], mm = +(h[2] || 0);
    if (hh < 24 && mm < 60) {
      hora = `${dois(hh)}:${dois(mm)}`;
      titulo = corta(titulo, h.index, h.index + h[0].length);
      nTitulo = corta(nTitulo, h.index, h.index + h[0].length);
    }
  }
  titulo = titulo
    .replace(/\s+(no|na|em|de|do|da|dia|às|as)\s*$/i, " ")
    .replace(/^\s*(marcar|marque|anotar|anote|colocar|coloque|agendar|agende)\s+/i, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/[,.;-]+$/, "");
  if (!titulo) return null;
  return {
    titulo: titulo[0].toUpperCase() + titulo.slice(1),
    data: iso(a, m, d),
    hora,
    repetir: /anivers[aá]rio|bodas/i.test(titulo) ? "ano" : "",
  };
}

// O que cai em cada dia do ano escolhido (compromissos que se repetem entram todo ano).
export function porDia(lista: Compromisso[], ano: number): Record<string, Compromisso[]> {
  const out: Record<string, Compromisso[]> = {};
  for (const c of lista) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c.data)) continue;
    const dia = c.repetir === "ano" ? `${ano}${c.data.slice(4)}` : c.data;
    if (dia.slice(0, 4) !== String(ano)) continue;
    (out[dia] ||= []).push(c);
  }
  for (const k of Object.keys(out)) out[k].sort((x, y) => (x.hora || "99").localeCompare(y.hora || "99"));
  return out;
}

export function hojeEmBrasilia(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}
