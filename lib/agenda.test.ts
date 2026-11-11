import { test } from "node:test";
import assert from "node:assert/strict";
import { diasDoAno, feriados, lerFrase, pascoa, porDia, type Compromisso } from "./agenda.ts";

const HOJE = "2026-11-11"; // quarta-feira

test("aniversário vira compromisso que repete todo ano", () => {
  assert.deepEqual(lerFrase("aniversário André 20 de outubro", HOJE), { titulo: "Aniversário André", data: "2027-10-20", hora: "", repetir: "ano" });
});

test("data com barra e horário com h", () => {
  assert.deepEqual(lerFrase("jantar com a Gilmara 05/12 às 20h", HOJE), { titulo: "Jantar com a Gilmara", data: "2026-12-05", hora: "20:00", repetir: "" });
});

test("amanhã e horário com dois pontos", () => {
  assert.deepEqual(lerFrase("reunião amanhã 10:30", HOJE), { titulo: "Reunião", data: "2026-11-12", hora: "10:30", repetir: "" });
});

test("dia da semana vai para o próximo", () => {
  assert.deepEqual(lerFrase("churrasco no sábado 13h", HOJE), { titulo: "Churrasco", data: "2026-11-14", hora: "13:00", repetir: "" });
});

test("ano explícito e 14h30", () => {
  assert.deepEqual(lerFrase("dentista dia 3 de março de 2027 às 14h30", HOJE), { titulo: "Dentista", data: "2027-03-03", hora: "14:30", repetir: "" });
});

test("sem data devolve null", () => {
  assert.equal(lerFrase("show do Coldplay", HOJE), null);
});

test("ano tem 365 ou 366 dias", () => {
  assert.equal(diasDoAno(2026).length, 365);
  assert.equal(diasDoAno(2028).length, 366);
});

test("Páscoa e feriados móveis", () => {
  assert.equal(pascoa(2026).toDateString(), new Date(2026, 3, 5).toDateString());
  const f = feriados(2026);
  assert.equal(f["2026-04-03"], "Sexta-feira Santa");
  assert.equal(f["2026-02-16"], "Carnaval");
  assert.equal(f["2026-06-04"], "Corpus Christi");
  assert.equal(f["2026-11-20"], "Consciência Negra");
});

test("compromisso anual aparece em qualquer ano", () => {
  const c: Compromisso = { id: "1", titulo: "Aniversário", data: "2027-10-20", hora: "", local: "", observacao: "", repetir: "ano" };
  assert.equal(porDia([c], 2030)["2030-10-20"]?.[0].titulo, "Aniversário");
});
