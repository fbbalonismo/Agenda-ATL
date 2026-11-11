"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { calcularAvisos, validar } from "@/lib/ics";
import { Arquivos, CalendarioOk, Festa, Hero, Lapis, Lupa, Microfone, Sino, Sol, Vazio } from "@/components/Ilustracoes";
import AgendaAno from "@/components/AgendaAno";
import type { Compromisso } from "@/lib/agenda";
import type { ItemViagem } from "@/lib/sync";

type Item = { titulo: string; data: string; hora: string; local: string; observacao: string };
type Corpo = { texto?: string; arquivo?: { tipo: string; base64: string } };

const VAZIO: Item = { titulo: "", data: "", hora: "", local: "", observacao: "" };
const CHAVE_SENHA = "agenda-senha";
const CHAVE_ANO = "agenda-ano-v1";
const PDF_MAX = 3 * 1024 * 1024;
const MAX_ARQUIVOS = 5;

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

// A agenda do ano fica guardada neste aparelho (o Calendário do iPhone continua sendo onde os avisos tocam).
function lerAno(): Compromisso[] {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE_ANO) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function gravarAno(l: Compromisso[]) {
  try {
    localStorage.setItem(CHAVE_ANO, JSON.stringify(l));
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
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff"; // prints com fundo transparente ficam legíveis
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
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

const ehPdf = (f: File) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
const ehImagem = (f: File) => f.type.startsWith("image/") || /\.(heic|heif|jpe?g|png|webp|gif)$/i.test(f.name);

async function prepararArquivo(f: File): Promise<{ tipo: string; base64: string } | string> {
  if (ehPdf(f)) {
    if (f.size > PDF_MAX) return `“${f.name}” é grande demais (máximo 3 MB). Tire um print só da parte com a data.`;
    return { tipo: "application/pdf", base64: await arquivoParaBase64(f) };
  }
  if (ehImagem(f)) return { tipo: "image/jpeg", base64: await imagemParaJpeg(f) };
  return `“${f.name}” não é foto, print nem PDF.`;
}

const mesmo = (a: Item, b: Item) => a.titulo === b.titulo && a.data === b.data && a.hora === b.hora;

export default function Pagina() {
  const [senha, setSenha] = useState("");
  const senhaRef = useRef("");
  const [pedirSenha, setPedirSenha] = useState(false);
  const [senhaDigitada, setSenhaDigitada] = useState("");
  const [texto, setTexto] = useState("");
  const [lendo, setLendo] = useState("");
  const [ouvindo, setOuvindo] = useState(false);
  const [vozDisponivel, setVozDisponivel] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [achados, setAchados] = useState<Item[]>([]);
  const [salvos, setSalvos] = useState<Item[]>([]);
  const [item, setItem] = useState<Item>(VAZIO);
  const [adicionado, setAdicionado] = useState(false);
  const [verAno, setVerAno] = useState<false | "ano" | "semana">(false);
  const [anoLista, setAnoLista] = useState<Compromisso[]>([]);
  const [viagens, setViagens] = useState<ItemViagem[]>([]);
  const [sinc, setSinc] = useState<"local" | "ligado" | "senha" | "erro">("local");
  const [senhaAno, setSenhaAno] = useState("");
  const reconhecimento = useRef<Reconhecimento | null>(null);
  const textoFalado = useRef("");
  const pendente = useRef<null | (() => void)>(null);
  const inputArquivo = useRef<HTMLInputElement>(null);
  const conferir = useRef<HTMLElement>(null);
  const contadorArraste = useRef(0);

  useEffect(() => {
    setAnoLista(lerAno());
    const ver = new URLSearchParams(window.location.search).get("ver");
    if (ver === "ano" || ver === "semana") setVerAno(ver);
    const s = lerSenha();
    senhaRef.current = s;
    carregarAgenda(s);
    setSenha(s);
    const w = window as JanelaComVoz;
    setVozDisponivel(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));

    // Pedido vindo da Siri (Atalho abre /?texto=...): lê na hora.
    const pedido = new URLSearchParams(window.location.search).get("texto")?.trim();
    if (pedido) {
      window.history.replaceState(null, "", window.location.pathname);
      setTexto(pedido);
      lerTexto(pedido);
    }
    // roda só uma vez, ao abrir a página
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const problema = validar({ titulo: item.titulo, data: item.data, hora: item.hora });
  const avisos = useMemo(() => (/^\d{2}:\d{2}$/.test(item.hora) ? calcularAvisos(item.hora) : []), [item.hora]);
  const linkCalendario = useMemo(() => {
    const p = new URLSearchParams({ titulo: item.titulo, data: item.data, hora: item.hora, local: item.local, notas: item.observacao });
    return `/api/ics?${p.toString()}`;
  }, [item]);

  function exigirSenha(acao: () => void) {
    if (senhaRef.current) return acao();
    pendente.current = acao;
    setPedirSenha(true);
  }

  // Envia um pedido para a IA. Devolve os compromissos, ou null se deu erro (a mensagem já fica na tela).
  async function chamarIa(corpo: Corpo): Promise<{ compromissos: Item[]; aviso: string } | null> {
    try {
      const r = await fetch("/api/extrair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha: senhaRef.current, ...corpo }),
      });
      const dados = await r.json().catch(() => ({ erro: "Resposta inválida do servidor. Tente de novo." }));
      if (r.status === 401) {
        gravarSenha("");
        senhaRef.current = "";
        setSenha("");
        setErro("Senha errada. Digite de novo.");
        setPedirSenha(true);
        return null;
      }
      if (!r.ok) {
        setErro(dados.erro ?? "Não deu para ler. Preencha na mão.");
        return null;
      }
      return { compromissos: dados.compromissos ?? [], aviso: dados.aviso ?? "" };
    } catch {
      setErro("Sem internet ou servidor fora do ar. Tente de novo.");
      return null;
    }
  }

  function mostrarResultado(lista: Item[], avisosLidos: string[]) {
    setAchados(lista);
    setItem(lista[0] ?? VAZIO);
    const a = avisosLidos.filter(Boolean).join(" ");
    setAviso(a || (lista.length ? "" : "Não achei nenhum compromisso. Preencha na mão abaixo."));
    setTimeout(() => conferir.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  function comecar() {
    setErro("");
    setAviso("");
    setAdicionado(false);
    setSalvos([]);
  }

  function lerTexto(t = texto) {
    if (!t.trim()) {
      setErro("Escreva ou fale o compromisso primeiro.");
      return;
    }
    exigirSenha(async () => {
      comecar();
      setLendo("Lendo o compromisso…");
      const res = await chamarIa({ texto: t });
      setLendo("");
      if (res) mostrarResultado(res.compromissos, [res.aviso]);
    });
  }

  const processarArquivos = useCallback((lista: File[]) => {
    if (!lista.length) return;
    const escolhidos = lista.slice(0, MAX_ARQUIVOS);
    exigirSenha(async () => {
      comecar();
      const todos: Item[] = [];
      const recados: string[] = [];
      if (lista.length > MAX_ARQUIVOS) recados.push(`Li só os ${MAX_ARQUIVOS} primeiros arquivos.`);
      for (let i = 0; i < escolhidos.length; i++) {
        const f = escolhidos[i];
        setLendo(escolhidos.length > 1 ? `Lendo arquivo ${i + 1} de ${escolhidos.length}…` : "Lendo o arquivo…");
        let preparado: { tipo: string; base64: string } | string;
        try {
          preparado = await prepararArquivo(f);
        } catch {
          preparado = `Não consegui abrir “${f.name}”. Tente tirar um print dele.`;
        }
        if (typeof preparado === "string") {
          recados.push(preparado);
          continue;
        }
        const res = await chamarIa({ arquivo: preparado });
        if (!res) break;
        todos.push(...res.compromissos);
        if (res.aviso) recados.push(escolhidos.length > 1 ? `${f.name}: ${res.aviso}` : res.aviso);
      }
      setLendo("");
      todos.sort((a, b) => `${a.data}${a.hora}`.localeCompare(`${b.data}${b.hora}`));
      mostrarResultado(todos, recados);
    });
    // exigirSenha e chamarIa só usam refs e setters estáveis
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Arrastar arquivos para qualquer lugar da página (computador).
  useEffect(() => {
    const temArquivos = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const entrar = (e: DragEvent) => {
      if (!temArquivos(e)) return;
      e.preventDefault();
      contadorArraste.current++;
      setArrastando(true);
    };
    const sobre = (e: DragEvent) => {
      if (!temArquivos(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    const sair = (e: DragEvent) => {
      if (!temArquivos(e)) return;
      contadorArraste.current = Math.max(0, contadorArraste.current - 1);
      if (contadorArraste.current === 0) setArrastando(false);
    };
    const soltar = (e: DragEvent) => {
      if (!temArquivos(e)) return;
      e.preventDefault();
      contadorArraste.current = 0;
      setArrastando(false);
      processarArquivos(Array.from(e.dataTransfer?.files ?? []));
    };
    // Colar um print (Ctrl+V / Cmd+V) fora do campo de texto.
    const colar = (e: ClipboardEvent) => {
      const arquivos = Array.from(e.clipboardData?.files ?? []).filter((f) => ehImagem(f) || ehPdf(f));
      if (!arquivos.length) return;
      e.preventDefault();
      processarArquivos(arquivos);
    };
    window.addEventListener("dragenter", entrar);
    window.addEventListener("dragover", sobre);
    window.addEventListener("dragleave", sair);
    window.addEventListener("drop", soltar);
    window.addEventListener("paste", colar);
    return () => {
      window.removeEventListener("dragenter", entrar);
      window.removeEventListener("dragover", sobre);
      window.removeEventListener("dragleave", sair);
      window.removeEventListener("drop", soltar);
      window.removeEventListener("paste", colar);
    };
  }, [processarArquivos]);

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
    senhaRef.current = s;
    setSenha(s);
    setPedirSenha(false);
    setSenhaDigitada("");
    setErro("");
    const acao = pendente.current;
    pendente.current = null;
    acao?.();
  }

  function mudarAno(l: Compromisso[]) {
    setAnoLista(l);
    gravarAno(l);
  }

  // ---------- Agenda compartilhada com o app de viagens ----------
  async function chamarAgenda(metodo: "GET" | "POST", corpo?: unknown, s = senhaRef.current) {
    const r = await fetch("/api/agenda", {
      method: metodo,
      headers: { "Content-Type": "application/json", "x-senha": s },
      body: corpo ? JSON.stringify(corpo) : undefined,
      cache: "no-store",
    });
    const d = await r.json().catch(() => ({}));
    return { r, d };
  }
  function aplicar(d: { lista?: Compromisso[]; viagens?: ItemViagem[] }) {
    if (d.lista) mudarAno(d.lista);
    if (d.viagens) setViagens(d.viagens);
  }
  async function carregarAgenda(s = senhaRef.current) {
    try {
      const { r, d } = await chamarAgenda("GET", undefined, s);
      if (d.ligado === false) return setSinc("local");
      if (r.status === 401) return setSinc("senha");
      if (!r.ok) return setSinc("erro");
      // Compromissos marcados só neste aparelho antes da integração sobem para o banco compartilhado
      const locais = lerAno().filter((c) => !(d.lista as Compromisso[]).some((x) => x.id === c.id));
      if (locais.length) {
        const imp = await chamarAgenda("POST", { op: "importar", varios: locais }, s);
        if (imp.r.ok) return (aplicar(imp.d), setSinc("ligado"));
      }
      aplicar(d);
      setSinc("ligado");
    } catch {
      setSinc("erro");
    }
  }
  async function salvarComp(c: Compromisso) {
    const atual = lerAno();
    mudarAno(atual.some((x) => x.id === c.id) ? atual.map((x) => (x.id === c.id ? c : x)) : [...atual, c]);
    if (sinc !== "ligado") return;
    try {
      const { r, d } = await chamarAgenda("POST", { op: "salvar", c });
      if (r.ok) aplicar(d); else setSinc(r.status === 401 ? "senha" : "erro");
    } catch { setSinc("erro"); }
  }
  async function apagarComp(id: string) {
    mudarAno(lerAno().filter((x) => x.id !== id));
    if (sinc !== "ligado") return;
    try {
      const { r, d } = await chamarAgenda("POST", { op: "apagar", id });
      if (r.ok) aplicar(d); else setSinc(r.status === 401 ? "senha" : "erro");
    } catch { setSinc("erro"); }
  }

  function salvar() {
    setAdicionado(true);
    setSalvos((s) => (s.some((x) => mesmo(x, item)) ? s : [...s, item]));
    // Tudo o que vai para o Calendário do iPhone também entra no "Meu ano" (e no app de viagens)
    if (!lerAno().some((c) => c.titulo === item.titulo && c.data === item.data && c.hora === item.hora))
      salvarComp({ id: Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4), titulo: item.titulo, data: item.data, hora: item.hora, local: item.local, observacao: item.observacao, repetir: "" });
  }

  function proximo() {
    const falta = achados.find((a) => !salvos.some((s) => mesmo(s, a)) && !mesmo(a, item));
    if (falta) {
      setItem(falta);
      setAdicionado(false);
      conferir.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else novo();
  }

  function novo() {
    setTexto("");
    setItem(VAZIO);
    setAchados([]);
    setSalvos([]);
    setAviso("");
    setErro("");
    setAdicionado(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const mudar = (campo: keyof Item) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setItem((v) => ({ ...v, [campo]: e.target.value }));
    setAdicionado(false);
  };

  const temDados = Boolean(item.titulo || item.data || item.hora);
  const faltam = achados.filter((a) => !salvos.some((s) => mesmo(s, a)) && !mesmo(a, item)).length;

  if (verAno) {
    const faixa =
      sinc === "senha" ? (
        <div className="ano-faixa">
          <span>Digite a senha do app para juntar com a agenda do app de viagens:</span>
          <div className="ano-linha">
            <input type="password" value={senhaAno} onChange={(e) => setSenhaAno(e.target.value)} autoComplete="current-password" aria-label="Senha do app" />
            <button type="button" className="principal ano-marcar" onClick={() => { gravarSenha(senhaAno.trim()); senhaRef.current = senhaAno.trim(); setSenha(senhaAno.trim()); setSenhaAno(""); carregarAgenda(senhaAno.trim()); }}>Entrar</button>
          </div>
        </div>
      ) : sinc === "erro" ? (
        <div className="ano-faixa erro">Sem conexão com a agenda compartilhada. O que marcar agora fica neste aparelho. <button type="button" className="ano-link" onClick={() => carregarAgenda()}>Tentar de novo</button></div>
      ) : sinc === "local" ? (
        <div className="ano-faixa">Agenda só deste aparelho: a ligação com o app de viagens ainda não foi ativada na Vercel.</div>
      ) : null;
    return (
      <AgendaAno
        lista={anoLista}
        viagens={viagens}
        aoSalvar={salvarComp}
        aoApagar={apagarComp}
        semana={verAno === "semana"}
        aoVerAno={() => setVerAno("ano")}
        faixa={faixa}
        aoVoltar={() => {
          setVerAno(false);
          window.history.replaceState(null, "", window.location.pathname);
          window.scrollTo({ top: 0 });
        }}
      />
    );
  }

  return (
    <main className="app">
      {arrastando && (
        <div className="solte" aria-hidden="true">
          <div className="solte-caixa">
            <Arquivos className="solte-ilu" />
            <p>Solte aqui para eu ler</p>
          </div>
        </div>
      )}

      <header className="topo">
        <Hero className="hero-ilu" />
        <div className="topo-texto">
          <h1>Agenda Alertas</h1>
          <p className="sub">Fale, mande um print ou arraste um arquivo. Eu aviso você no dia.</p>
          <div className="selos">
            <span className="selo selo-sol">
              <Sol className="selo-ico" /> 8h do dia
            </span>
            <span className="selo selo-sino">
              <Sino className="selo-ico" /> 1 hora antes
            </span>
            <span className="selo selo-sino">
              <Sino className="selo-ico" /> na hora
            </span>
          </div>
          <div className="ver-botoes">
            <button type="button" className="secundario ver-ano" onClick={() => setVerAno("ano")}>
              📅 Meu ano{anoLista.length ? ` · ${anoLista.length}` : ""}
            </button>
            <button type="button" className="secundario ver-ano" onClick={() => setVerAno("semana")}>
              🗓️ Semana
            </button>
          </div>
          <a className="lembrete-semana" href="/api/semana">🔔 Mostrar a semana toda segunda às 8h</a>
        </div>
      </header>

      <section className="cartao passo-1" aria-labelledby="t1">
        <h2 id="t1">
          <span className="num">1</span> Conte qual é o compromisso
        </h2>

        <button
          type="button"
          className={`soltar ${arrastando ? "ativo" : ""}`}
          onClick={() => inputArquivo.current?.click()}
          disabled={Boolean(lendo)}
        >
          <Arquivos className="soltar-ilu" />
          <span className="soltar-titulo">Foto, print ou PDF</span>
          <span className="soltar-sub so-toque">Toque para escolher</span>
          <span className="soltar-sub so-mouse">Arraste para cá, clique para escolher ou cole com Ctrl+V</span>
        </button>
        <input
          ref={inputArquivo}
          id="arquivo"
          type="file"
          accept="image/*,application/pdf,.pdf"
          multiple
          hidden
          onChange={(e) => {
            processarArquivos(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />

        {vozDisponivel && (
          <button type="button" className={`falar ${ouvindo ? "ouvindo" : ""}`} onClick={falar} disabled={Boolean(lendo)}>
            <Microfone className="falar-ico" />
            <span>{ouvindo ? "Ouvindo… toque para parar" : "Falar o compromisso"}</span>
          </button>
        )}

        <div className="escrever">
          <label htmlFor="texto" className="rotulo">
            <Lapis className="rotulo-ico" /> Ou escreva / cole o texto (e-mail, WhatsApp…)
          </label>
          <textarea
            id="texto"
            rows={3}
            placeholder="Ex.: dentista com Dr. Paulo dia 20 às 14h30, Rua das Flores 10"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <button type="button" className="secundario" onClick={() => lerTexto()} disabled={Boolean(lendo) || !texto.trim()}>
            Ler este texto
          </button>
          {!vozDisponivel && <p className="dica">No iPhone, para falar: toque no campo acima e use o microfone do teclado.</p>}
        </div>

        {lendo && (
          <div className="lendo" role="status">
            <span className="pontos" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            {lendo}
          </div>
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
          <p className="dica">Só na primeira vez. Ela fica guardada neste aparelho.</p>
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

      <section className="cartao passo-2" aria-labelledby="t2" ref={conferir}>
        <h2 id="t2">
          <span className="num">2</span> Confira e corrija
          <Lupa className="titulo-ico" />
        </h2>

        {!temDados && !aviso && (
          <div className="vazio">
            <Vazio className="vazio-ilu" />
            <p>O que eu ler aparece aqui. Se preferir, preencha na mão.</p>
          </div>
        )}

        {aviso && <p className="alerta">{aviso}</p>}

        {achados.length > 1 && (
          <div className="lista" role="radiogroup" aria-label="Compromissos encontrados">
            <p className="rotulo">Achei {achados.length} compromissos. Salve um de cada vez:</p>
            {achados.map((a, i) => {
              const ok = salvos.some((s) => mesmo(s, a));
              return (
                <button
                  type="button"
                  key={i}
                  role="radio"
                  aria-checked={mesmo(a, item)}
                  className={`opcao ${mesmo(a, item) ? "ativa" : ""} ${ok ? "feita" : ""}`}
                  onClick={() => {
                    setItem(a);
                    setAdicionado(false);
                  }}
                >
                  <b>
                    {ok && <span className="tique">✓</span>}
                    {a.titulo || "Sem nome"}
                  </b>
                  <span>
                    {dataPorExtenso(a.data) || "sem data"} · {a.hora || "sem hora"}
                  </span>
                </button>
              );
            })}
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
                <li key={a.minutosAntes}>
                  {a.rotulo.includes("manhã") ? <Sol className="aviso-ico" /> : <Sino className="aviso-ico" />}
                  {a.rotulo}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="cartao passo-3" aria-labelledby="t3">
        <h2 id="t3">
          <span className="num">3</span> Salvar no Calendário
          <CalendarioOk className="titulo-ico" />
        </h2>
        {adicionado ? (
          <div className="festa">
            <Festa className="festa-ilu" />
            <p className="festa-titulo">Prontinho!</p>
            <p className="dica">
              Na tela que abriu, toque em <b>Adicionar</b>. Depois confira no app Calendário.
            </p>
            <div className="festa-botoes">
              <a className="secundario" href={linkCalendario} onClick={salvar}>
                Abrir de novo
              </a>
              <button type="button" className="principal" onClick={proximo}>
                {faltam ? `Próximo compromisso (${faltam})` : "Agendar outro"}
              </button>
            </div>
          </div>
        ) : problema ? (
          <p className="dica">{problema}</p>
        ) : (
          <>
            <a className="principal grande" href={linkCalendario} onClick={salvar}>
              <CalendarioOk className="botao-ico" /> Adicionar ao Calendário
            </a>
            <p className="dica">
              No iPhone abre uma tela do Calendário: toque em <b>Adicionar</b>. No computador, abra o arquivo baixado.
            </p>
          </>
        )}
      </section>

      <details className="cartao siri">
        <summary>
          <Microfone className="titulo-ico-esq" /> Agendar falando com a Siri
        </summary>
        <ol>
          <li>
            Abra o app <b>Atalhos</b> e toque em <b>+</b>. Dê o nome <b>Agendar ATL</b>.
          </li>
          <li>
            Adicione a ação <b>Ditar Texto</b> (idioma: Português do Brasil).
          </li>
          <li>
            Adicione <b>Codificar URL</b> (fica com o “Texto Ditado”).
          </li>
          <li>
            Adicione <b>Abrir URLs</b> e escreva: <code>https://agenda-atl.vercel.app/?texto=</code> e, logo depois, coloque a variável{" "}
            <b>Texto Codificado em URL</b>.
          </li>
          <li>
            Pronto. Diga: <b>“E aí Siri, Agendar ATL”</b> e fale o compromisso. O app abre, lê e você só confere e toca em{" "}
            <b>Adicionar ao Calendário</b>.
          </li>
        </ol>
        <p className="dica">Funciona igual no Mac (app Atalhos + Siri).</p>
      </details>

      <footer className="rodape">Horários de Brasília · Confira sempre a data antes de salvar.</footer>
    </main>
  );
}
