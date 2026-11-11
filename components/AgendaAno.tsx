"use client";

import { useEffect, useRef, useState } from "react";
import { CORES_MES, DIAS_SEMANA, MESES, diaDaSemana, diasDoAno, feriados, hojeEmBrasilia, lerFrase, porDia, type Compromisso } from "@/lib/agenda";

type Reconhecimento = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type JanelaComVoz = Window & { webkitSpeechRecognition?: new () => Reconhecimento; SpeechRecognition?: new () => Reconhecimento };

const novoId = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const extenso = (data: string, opcoes: Intl.DateTimeFormatOptions) => {
  const [a, m, d] = data.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { ...opcoes, timeZone: "UTC" }).format(new Date(Date.UTC(a, m - 1, d)));
};
const linkIcs = (c: Compromisso) =>
  `/api/ics?${new URLSearchParams({ titulo: c.titulo, data: c.data, hora: c.hora || "09:00", local: c.local, notas: c.observacao }).toString()}`;

export default function AgendaAno({ lista, aoMudar, aoVoltar }: { lista: Compromisso[]; aoMudar: (l: Compromisso[]) => void; aoVoltar: () => void }) {
  const hoje = hojeEmBrasilia();
  const [ano, setAno] = useState(+hoje.slice(0, 4));
  const [frase, setFrase] = useState("");
  const [recado, setRecado] = useState<{ ok: boolean; texto: string } | null>(null);
  const [editando, setEditando] = useState<Compromisso | null>(null);
  const [ouvindo, setOuvindo] = useState(false);
  const [temVoz, setTemVoz] = useState(false);
  const refHoje = useRef<HTMLDivElement>(null);
  const rec = useRef<Reconhecimento | null>(null);

  useEffect(() => {
    const w = window as JanelaComVoz;
    setTemVoz(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);
  useEffect(() => {
    if (ano === +hoje.slice(0, 4)) setTimeout(() => refHoje.current?.scrollIntoView({ block: "start" }), 60);
  }, [ano, hoje]);

  const fer = feriados(ano);
  const doDia = porDia(lista, ano);

  function marcar(texto = frase) {
    const t = texto.trim();
    if (!t) return;
    const p = lerFrase(t, hoje);
    if (!p) {
      setRecado({ ok: false, texto: 'Não achei a data. Fale junto, por exemplo: "aniversário André 20 de outubro".' });
      return;
    }
    aoMudar([...lista, { id: novoId(), titulo: p.titulo, data: p.data, hora: p.hora, local: "", observacao: "", repetir: p.repetir }]);
    setRecado({ ok: true, texto: `Marcado: ${p.titulo} · ${extenso(p.data, { weekday: "short", day: "numeric", month: "long", year: "numeric" })}${p.hora ? " às " + p.hora : ""}${p.repetir ? " · todo ano" : ""}` });
    setFrase("");
    if (!p.repetir && +p.data.slice(0, 4) !== ano) setAno(+p.data.slice(0, 4));
  }

  function falar() {
    const w = window as JanelaComVoz;
    const Classe = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Classe) return;
    if (ouvindo) return rec.current?.stop();
    const r = new Classe();
    r.lang = "pt-BR";
    r.interimResults = true;
    r.continuous = false;
    let dito = "";
    r.onresult = (e) => {
      dito = "";
      for (let i = 0; i < e.results.length; i++) dito += e.results[i][0].transcript;
      setFrase(dito);
    };
    r.onerror = (e) => {
      setOuvindo(false);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") setRecado({ ok: false, texto: "O iPhone bloqueou o microfone. Use o microfone do teclado." });
    };
    r.onend = () => {
      setOuvindo(false);
      if (dito.trim()) marcar(dito);
    };
    rec.current = r;
    setOuvindo(true);
    r.start();
  }

  function salvar(c: Compromisso) {
    aoMudar(lista.some((x) => x.id === c.id) ? lista.map((x) => (x.id === c.id ? c : x)) : [...lista, c]);
    setEditando(null);
  }

  return (
    <div className="ano">
      <header className="ano-topo">
        <button type="button" className="ano-btn" onClick={aoVoltar} aria-label="Voltar">←</button>
        <h1>Meu ano</h1>
        <div className="ano-sel">
          <button type="button" className="ano-btn" onClick={() => setAno((a) => a - 1)} aria-label="Ano anterior">‹</button>
          <b>{ano}</b>
          <button type="button" className="ano-btn" onClick={() => setAno((a) => a + 1)} aria-label="Próximo ano">›</button>
        </div>
      </header>

      <div className="ano-barra">
        <div className="ano-linha">
          <input
            type="text"
            value={frase}
            onChange={(e) => setFrase(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && marcar()}
            placeholder='Ex.: "aniversário André 20 de outubro"'
            aria-label="Compromisso com a data"
          />
          {temVoz && (
            <button type="button" className={`ano-mic ${ouvindo ? "ouvindo" : ""}`} onClick={falar} aria-label={ouvindo ? "Parar" : "Falar"}>
              🎤
            </button>
          )}
          <button type="button" className="principal ano-marcar" onClick={() => marcar()} disabled={!frase.trim()}>
            Marcar
          </button>
        </div>
        <div className="ano-linha2">
          {recado && <span className={recado.ok ? "ano-ok" : "ano-erro"}>{recado.texto}</span>}
          {ano === +hoje.slice(0, 4) && (
            <button type="button" className="ano-link" onClick={() => refHoje.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              Ir para hoje
            </button>
          )}
        </div>
      </div>

      <div className="ano-lista">
        {diasDoAno(ano).map((dia) => {
          const mes = +dia.slice(5, 7) - 1;
          const n = +dia.slice(8, 10);
          const sem = diaDaSemana(dia);
          const fds = sem === 0 || sem === 6;
          const feriado = fer[dia];
          const itens = doDia[dia] || [];
          const abrir = () => setEditando({ id: novoId(), titulo: "", data: dia, hora: "", local: "", observacao: "", repetir: "" });
          return (
            <div key={dia} ref={dia === hoje ? refHoje : null} className="ano-bloco">
              {n === 1 && (
                <div className="ano-mes" style={{ background: CORES_MES[mes] }}>
                  {MESES[mes]} {ano}
                </div>
              )}
              <div
                className={`ano-dia${fds ? " fds" : ""}${feriado ? " feriado" : ""}${dia === hoje ? " hoje" : ""}${dia < hoje ? " passou" : ""}`}
                style={{ borderLeftColor: CORES_MES[mes] }}
                role="button"
                tabIndex={0}
                onClick={abrir}
                onKeyDown={(e) => e.key === "Enter" && abrir()}
              >
                <span className="ano-n">{String(n).padStart(2, "0")}</span>
                <span className="ano-s">{DIAS_SEMANA[sem]}</span>
                <span className="ano-c">
                  {feriado && <span className="ano-feriado">{feriado}</span>}
                  {itens.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      className="ano-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditando(c);
                      }}
                    >
                      {c.hora && <em>{c.hora}</em>}
                      {c.repetir === "ano" && "🔁 "}
                      {c.titulo}
                      {(c.local || c.observacao) && <small>{[c.local, c.observacao].filter(Boolean).join(" · ")}</small>}
                    </button>
                  ))}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {editando && (
        <Editor
          c={editando}
          novo={!lista.some((x) => x.id === editando.id)}
          aoFechar={() => setEditando(null)}
          aoSalvar={salvar}
          aoApagar={() => {
            aoMudar(lista.filter((x) => x.id !== editando.id));
            setEditando(null);
          }}
        />
      )}
    </div>
  );
}

function Editor({ c, novo, aoFechar, aoSalvar, aoApagar }: { c: Compromisso; novo: boolean; aoFechar: () => void; aoSalvar: (c: Compromisso) => void; aoApagar: () => void }) {
  const [v, setV] = useState(c);
  const muda = (campo: keyof Compromisso) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((x) => ({ ...x, [campo]: e.target.value }));
  const ok = v.titulo.trim() && /^\d{4}-\d{2}-\d{2}$/.test(v.data);
  return (
    <div className="ano-fundo" onClick={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className="ano-folha" role="dialog" aria-modal="true">
        <p className="ano-quando">{/^\d{4}-\d{2}-\d{2}$/.test(v.data) ? extenso(v.data, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : ""}</p>
        <h2>{novo ? "Novo compromisso" : "Editar"}</h2>
        <div className="campos">
          <label htmlFor="ano-t">O quê</label>
          <input id="ano-t" value={v.titulo} onChange={muda("titulo")} autoFocus={novo} placeholder="Ex.: Aniversário da Gilmara" />
          <div className="linha">
            <div>
              <label htmlFor="ano-d">Dia</label>
              <input id="ano-d" type="date" value={v.data} onChange={muda("data")} />
            </div>
            <div>
              <label htmlFor="ano-h">Horário</label>
              <input id="ano-h" type="time" value={v.hora} onChange={muda("hora")} />
            </div>
          </div>
          <label htmlFor="ano-l">Onde (opcional)</label>
          <input id="ano-l" value={v.local} onChange={muda("local")} />
          <label htmlFor="ano-o">Observações</label>
          <textarea id="ano-o" rows={3} value={v.observacao} onChange={muda("observacao")} />
          <label className="ano-repetir">
            <input type="checkbox" checked={v.repetir === "ano"} onChange={(e) => setV((x) => ({ ...x, repetir: e.target.checked ? "ano" : "" }))} /> Repetir todo ano
          </label>
        </div>
        {ok && v.hora && (
          <a className="secundario ano-ics" href={linkIcs(v)}>
            📅 Pôr também no Calendário do iPhone (com avisos)
          </a>
        )}
        <div className="ano-botoes">
          {!novo && (
            <button type="button" className="ano-apagar" onClick={() => confirm("Apagar este compromisso?") && aoApagar()}>
              Apagar
            </button>
          )}
          <button type="button" className="secundario" onClick={aoFechar}>
            Cancelar
          </button>
          <button type="button" className="principal" disabled={!ok} onClick={() => aoSalvar({ ...v, titulo: v.titulo.trim() })}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
