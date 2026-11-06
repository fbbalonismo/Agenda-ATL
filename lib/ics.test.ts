import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularAvisos, gerarIcs, validar } from "./ics.ts";

test("compromisso à tarde avisa às 8h, 1 hora antes e na hora", () => {
  const a = calcularAvisos("14:30");
  assert.deepEqual(a.map((x) => x.minutosAntes), [390, 60, 0]);
  assert.match(a[2].rotulo, /14:30 \(na hora\)/);
  assert.match(a[0].rotulo, /08:00/);
  assert.match(a[1].rotulo, /13:30/);
});

test("compromisso às 9h não duplica o aviso das 8h", () => {
  assert.deepEqual(calcularAvisos("09:00").map((x) => x.minutosAntes), [60, 0]);
});

test("compromisso às 8h30 avisa às 7h30 e às 8h", () => {
  assert.deepEqual(calcularAvisos("08:30").map((x) => x.minutosAntes), [30, 60, 0]);
});

test("compromisso às 7h avisa 1 hora antes e na hora", () => {
  assert.deepEqual(calcularAvisos("07:00").map((x) => x.minutosAntes), [60, 0]);
});

test("ics tem fuso, horário e três avisos", () => {
  const ics = gerarIcs({ titulo: "Dentista, Dr. Paulo", data: "2026-11-20", hora: "14:30", local: "Rua A; 10" });
  assert.match(ics, /DTSTART;TZID=America\/Sao_Paulo:20261120T143000/);
  assert.match(ics, /DTEND;TZID=America\/Sao_Paulo:20261120T153000/);
  assert.match(ics, /SUMMARY:Dentista\\, Dr\. Paulo/);
  assert.match(ics, /LOCATION:Rua A\\; 10/);
  assert.equal(ics.match(/BEGIN:VALARM/g)?.length, 3);
  assert.match(ics, /TRIGGER:PT0S/);
  assert.match(ics, /TRIGGER:-PT390M/);
  assert.match(ics, /TRIGGER:-PT60M/);
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
});

test("evento perto da meia-noite vira o dia no término", () => {
  const ics = gerarIcs({ titulo: "Voo", data: "2026-12-31", hora: "23:30" });
  assert.match(ics, /DTEND;TZID=America\/Sao_Paulo:20270101T003000/);
});

test("linhas longas são dobradas em até 75 bytes", () => {
  const ics = gerarIcs({ titulo: "Consulta ".repeat(30), data: "2026-11-20", hora: "10:00" });
  for (const l of ics.split("\r\n")) assert.ok(new TextEncoder().encode(l).length <= 75);
});

test("validação pede data e horário", () => {
  assert.equal(validar({ titulo: "X", data: "", hora: "10:00" }), "Falta a data.");
  assert.equal(validar({ titulo: "X", data: "2026-11-20", hora: "" }), "Falta o horário.");
  assert.equal(validar({ titulo: "X", data: "2026-11-20", hora: "10:00" }), null);
});
