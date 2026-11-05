"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { calcularAvisos, validar } from "@/lib/ics";

type Item = { titulo: string; data: string; hora: string; local: string; observacao: string };

const VAZIO: Item = { titulo: "", data: "", hora: "", local: "", observacao: "" };
const CHAVE_SENHA = "agenda-senha";
const PDF_MAX = 3 * 1024 * 1024;

// Tipos mínimos do reconhecimento de voz do Safari (não estão no TypeScript padrão).
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

function lerSenha() {
  try {
    return localStorage.getItem(CHAVE_SENHA) ?? "";
  } catch {
    return "";
  }
}
function gravarSenha(s: string) {
  try {
    if (s) localStorage.setItem(CHAVE_SENHA, s);
    else localStorage.removeItem(CHAVE_SENHA);
  } catch {}
}

function dataPorExtenso(data: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return "";
  const [a, m, d] = data.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(a, m - 1, d)),
  );
}

async function imagemParaJpeg(arquivo: File): Promise<string> {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const max = 2000;
    const escala = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * escala);
    canvas.height = Math.round(img.naturalHeight * escala);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
  } finally {
    URL.revokeObjectURL(url);
  }
}

function arquivoParaBase64(arquivo: File): Promise<string> {
  return new Promise((ok, falha) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1]);
    r.onerror = () => falha(r.error);
    r.readAsDataURL(arquivo);
  });
}

export default function Pagina() {
  const [senha, setSenha] = useState("");
  const [pedirSenha, setPedirSenha] = useState(false);
  const [senhaDigitada, setSenhaDigitada] = useState("");
  const [texto, setTexto] = useState("");
  const [lendo, setLendo] = useState(false);
  const [ouvindo, setOuvindo] = useState(false);
  const [vozDisponivel, setVozDisponivel] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [achados, setAchados] = useState<Item[]>([]);
  const [item, setItem] = useState<Item>(VAZIO);
  const [adicionado, setAdicionado] = useState(false);
  const reconhecimento = useRef<Reconhecimento | null>(null);
  const textoFalado = useRef("");
  const pendente = useRef<null | (() => void)>(null);
  const inputArquivo = useRef<HTMLInputElement>(null);
  const conferir = useRef<HTMLElement>(null);

  useEffect(() => {
    setSenha(lerSenha());
    const w = window as JanelaComVoz;
    setVozDisponivel(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  const problema = validar({ titulo: item.titulo, data: item.data, hora: item.hora });
  const avisos = useMemo(() => (/^\d{2}:\d{2}$/.test(item.hora) ? calcularAvisos(item.hora) : []), [item.hora]);
  const linkCalendario = useMemo(() => {
    const p = new URLSearchParams({ titulo: item.titulo, data: item.data, hora: item.hora, local: item.local, notas: item.observacao });
    return `/api/ics?${p.toString()}`;
  }, [item]);

  function exigirSenha(acao: () => void) {
    if (senha) return acao();
    pendente.current = acao;
    setPedirSenha(true);
  }

  async function enviar(corpo: { texto?: string; arquivo?: { tipo: string; base64: string } }, senhaUsada = senha) {
    setLendo(true);
    setErro("");
    setAviso("");
    setAdicionado(false);
    try {
      const r = await fetch("/api/extrair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha: senhaUsada, ...corpo }),
      });
      const dados = await r.json().catch(() => ({ erro: "Resposta inválida do servidor. Tente de novo." }));
      if (r.status === 401) {
        gravarSenha("");
        setSenha("");
        setErro("Senha errada. Digite de novo.");
        setPedirSenha(true);
        return;
      }
      if (!r.ok) {
        setErro(dados.erro ?? "Não deu para ler. Preencha na mão.");
        return;
      }
      const lista: Item[] = dados.compromissos ?? [];
      setAchados(lista);
      setAviso(dados.aviso ?? "");
      setItem(lista[0] ?? VAZIO);
      if (!lista.length && !dados.aviso) setAviso("Não achei nenhum compromisso. Preencha na mão abaixo.");
      setTimeout(() => conferir.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch {
      setErro("Sem internet ou servidor fora do ar. Tente de novo.");
    } finally {
      setLendo(false);
    }
  }

  function lerTexto(t = texto) {
    if (!t.trim()) {
      setErro("Escreva ou fale o compromisso primeiro.");
      return;
    }
    exigirSenha(() => enviar({ texto: t }));
  }

  async function escolherArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro("");
    try {
      let corpo: { tipo: string; base64: string };
      if (arquivo.type === "application/pdf" || arquivo.name.toLowerCase().endsWith(".pdf")) {
        if (arquivo.size > PDF_MAX) {
          setErro("PDF grande demais (máximo 3 MB). Tire um print só da parte com a data.");
          return;
        }
        corpo = { tipo: "application/pdf", base64: await arquivoParaBase64(arquivo) };
      } else if (arquivo.type.startsWith("image/") || /\.(heic|heif|jpe?g|png|webp)$/i.test(arquivo.name)) {
        corpo = { tipo: "image/jpeg", base64: await imagemParaJpeg(arquivo) };
      } else {
        setErro("Esse tipo de arquivo não é aceito. Use foto, print ou PDF.");
        return;
      }
      exigirSenha(() => enviar({ arquivo: corpo, texto: texto.trim() || undefined }));
    } catch {
      setErro("Não consegui abrir esse arquivo. Tente tirar um print dele.");
    } finally {
      if (inputArquivo.current) inputArquivo.current.value = "";
    }
  }

  function falar() {
    const w = window as JanelaComVoz;
    const Classe = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Classe) return;
    if (ouvindo) {
      reconhecimento.current?.stop();
      return;
    }
    const rec = new Classe();
    rec.lang = "pt-BR";
    rec.interimResults = true;
    rec.continuous = false;
    textoFalado.current = "";
    rec.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      textoFalado.current = t;
      setTexto(t);
    };
    rec.onerror = (e) => {
      setOuvindo(false);
      if (e.error === "not-allowed" || e.error === "service-not-allowed")
        setErro("O iPhone bloqueou o microfone. Use o microfone do teclado no campo de texto.");
      else if (e.error !== "no-speech" && e.error !== "aborted") setErro("Não entendi. Tente de novo ou digite.");
    };
    rec.onend = () => {
      setOuvindo(false);
      if (textoFalado.current.trim()) lerTexto(textoFalado.current);
    };
    reconhecimento.current = rec;
    setErro("");
    setOuvindo(true);
    rec.start();
  }

  function confirmarSenha() {
    const s = senhaDigitada.trim();
    if (!s) return;
    gravarSenha(s);
    setSenha(s);
    setPedirSenha(false);
    setSenhaDigitada("");
    const acao = pendente.current;
    pendente.current = null;
    if (acao) {
      // usa a senha nova direto, sem esperar o estado atualizar
      setTimeout(() => acao(), 0);
    }
  }

  function novo() {
    setTexto("");
    setItem(VAZIO);
    setAchados([]);
    setAviso("");
    setErro("");
    setAdicionado(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const mudar = (campo: keyof Item) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setItem((v) => ({ ...v, [campo]: e.target.value }));

  return (
    <main className="app">
      <header className="topo">
        <h1>Agenda Alertas</h1>
        <p className="sub">
          Cada compromisso avisa <b>às 8h do dia</b> e <b>1 hora antes</b>.
        </p>
      </header>

      <section className="cartao" aria-labelledby="t1">
        <h2 id="t1">
          <span className="num">1</span> Diga ou mande o compromisso
        </h2>

        <div className="acoes">
          {vozDisponivel && (
            <button type="button" className={`grande ${ouvindo ? "ouvindo" : ""}`} onClick={falar} disabled={lendo}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
              {ouvindo ? "Ouvindo… toque para parar" : "Falar"}
            </button>
          )}
          <button type="button" className="grande" onClick={() => inputArquivo.current?.click()} disabled={lendo}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l2-3h6l2 3h3v12H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
            Foto, print ou PDF
          </button>
          <input
            ref={inputArquivo}
            id="arquivo"
            type="file"
            accept="image/*,application/pdf,.pdf"
            hidden
            onChange={(e) => escolherArquivo(e.target.files?.[0])}
          />
        </div>

        <label htmlFor="texto" className="rotulo">
          Ou escreva / cole aqui (e-mail, mensagem do WhatsApp…)
        </label>
        <textarea
          id="texto"
          rows={3}
          placeholder="Ex.: dentista com Dr. Paulo dia 20 às 14h30, Rua das Flores 10"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <button type="button" className="secundario" onClick={() => lerTexto()} disabled={lendo || !texto.trim()}>
          Ler este texto
        </button>
        {!vozDisponivel && <p className="dica">Para falar: toque no campo acima e use o microfone do teclado.</p>}

        {lendo && (
          <p className="status" role="status">
            <span className="giro" aria-hidden="true" /> Lendo o compromisso…
          </p>
        )}
        {erro && (
          <p className="erro" role="alert">
            {erro}
          </p>
        )}
      </section>

      {pedirSenha && (
        <section className="cartao destaque" aria-labelledby="ts">
          <h2 id="ts">Senha do app</h2>
          <p className="dica">Só na primeira vez. Ela fica guardada neste iPhone.</p>
          <input
            id="senha"
            type="password"
            autoComplete="current-password"
            value={senhaDigitada}
            onChange={(e) => setSenhaDigitada(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirmarSenha()}
          />
          <button type="button" className="principal" onClick={confirmarSenha}>
            Continuar
          </button>
        </section>
      )}

      <section className="cartao" aria-labelledby="t2" ref={conferir}>
        <h2 id="t2">
          <span className="num">2</span> Confira e corrija
        </h2>

        {aviso && <p className="alerta">{aviso}</p>}

        {achados.length > 1 && (
          <div className="lista" role="radiogroup" aria-label="Compromissos encontrados">
            <p className="rotulo">Achei {achados.length} compromissos. Escolha um (depois volte para os outros):</p>
            {achados.map((a, i) => (
              <button
                type="button"
                key={i}
                role="radio"
                aria-checked={a === item}
                className={`opcao ${a.titulo === item.titulo && a.data === item.data && a.hora === item.hora ? "ativa" : ""}`}
                onClick={() => {
                  setItem(a);
                  setAdicionado(false);
                }}
              >
                <b>{a.titulo || "Sem nome"}</b>
                <span>
                  {dataPorExtenso(a.data) || "sem data"} · {a.hora || "sem hora"}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="campos">
          <label htmlFor="titulo">O quê</label>
          <input id="titulo" value={item.titulo} onChange={mudar("titulo")} placeholder="Ex.: Consulta cardiologista" />

          <div className="linha">
            <div>
              <label htmlFor="data">Dia</label>
              <input id="data" type="date" value={item.data} onChange={mudar("data")} />
            </div>
            <div>
              <label htmlFor="hora">Horário</label>
              <input id="hora" type="time" value={item.hora} onChange={mudar("hora")} />
            </div>
          </div>
          {item.data && <p className="extenso">{dataPorExtenso(item.data)}</p>}

          <label htmlFor="local">Onde (opcional)</label>
          <input id="local" value={item.local} onChange={mudar("local")} />

          <label htmlFor="obs">Observação (opcional)</label>
          <textarea id="obs" rows={2} value={item.observacao} onChange={mudar("observacao")} />
        </div>

        {avisos.length > 0 && (
          <div className="avisos">
            <p className="rotulo">Você vai ser avisado:</p>
            <ul>
              {avisos.map((a) => (
                <li key={a.minutosAntes}>{a.rotulo}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="cartao" aria-labelledby="t3">
        <h2 id="t3">
          <span className="num">3</span> Salvar no Calendário
        </h2>
        {problema ? (
          <p className="dica">{problema}</p>
        ) : (
          <>
            <a className="principal" href={linkCalendario} onClick={() => setAdicionado(true)}>
              Adicionar ao Calendário
            </a>
            <p className="dica">
              Vai abrir uma tela do iPhone. Toque em <b>Adicionar ao Calendário</b> (ou “Adicionar Todos”) lá embaixo.
            </p>
          </>
        )}
        {adicionado && (
          <button type="button" className="secundario" onClick={novo}>
            Agendar outro
          </button>
        )}
      </section>

      <footer className="rodape">Horários de Brasília. Confira sempre a data antes de salvar.</footer>
    </main>
  );
}
