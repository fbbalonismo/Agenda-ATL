import { test } from "node:test";
import assert from "node:assert/strict";
import { chaveAssinatura, gerarCalendario } from "./feed.ts";

const base = { local: "", observacao: "", repetir: "" as const };

test("calendário assinado tem um evento por compromisso, com UID fixo e avisos", () => {
  const ics = gerarCalendario([
    { ...base, id: "a1", titulo: "Dentista", data: "2026-12-03", hora: "15:00" },
    { ...base, id: "b2", titulo: "Aniversário Gilmara", data: "2026-12-10", hora: "", repetir: "ano" },
  ]);
  assert.equal(ics.match(/BEGIN:VEVENT/g)?.length, 2);
  assert.match(ics, /UID:a1@agenda-atl/);
  assert.match(ics, /DTSTART;TZID=America\/Sao_Paulo:20261203T150000/);
  assert.match(ics, /TRIGGER:-PT420M/); // 8h
  assert.match(ics, /TRIGGER:-PT60M/);
  assert.match(ics, /TRIGGER:PT0S/);
  assert.match(ics, /DTSTART;VALUE=DATE:20261210/);
  assert.match(ics, /DTEND;VALUE=DATE:20261211/);
  assert.match(ics, /RRULE:FREQ=YEARLY/);
  assert.match(ics, /TRIGGER:PT8H/);
});

test("compromisso inválido fica de fora", () => {
  const ics = gerarCalendario([{ ...base, id: "x", titulo: "", data: "2026-12-03", hora: "10:00" }]);
  assert.equal(ics.match(/BEGIN:VEVENT/g), null);
});

test("chave do link muda quando a senha muda", () => {
  assert.equal(chaveAssinatura("abc"), chaveAssinatura("abc"));
  assert.notEqual(chaveAssinatura("abc"), chaveAssinatura("abd"));
  assert.equal(chaveAssinatura("abc").length, 32);
});
