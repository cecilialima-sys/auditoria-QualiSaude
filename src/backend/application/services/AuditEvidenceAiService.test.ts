import assert from "node:assert/strict";
import test from "node:test";
import { AuditEvidenceAiService, buildEvidenceImprovementPrompt, sanitizeEvidenceSuggestion } from "./AuditEvidenceAiService";

test("preserva o conteúdo do auditor no prompt de melhoria", () => {
  const prompt = buildEvidenceImprovementPrompt({
    checklistTitle: "3.4 – USG",
    itemNumber: "3.4.1",
    itemText: "O equipamento possui registro de manutenção preventiva atualizado?",
    status: "Não conforme",
    evidenceOriginal: "última manutenção foi em janeiro e não apresentou documento novo"
  });

  assert.match(prompt, /última manutenção foi em janeiro e não apresentou documento novo/);
  assert.match(prompt, /Não conforme/);
});

test("remove HTML e espaços excedentes da sugestão", () => {
  assert.equal(
    sanitizeEvidenceSuggestion(" <p>Durante a inspeção, foi identificado um registro ausente.</p> "),
    "Durante a inspeção, foi identificado um registro ausente."
  );
});

test("rejeita sugestão vazia", () => {
  assert.throws(() => sanitizeEvidenceSuggestion("  "));
});

test("sem chave de API a auditoria pode seguir sem IA", async () => {
  const previous = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  await assert.rejects(
    new AuditEvidenceAiService().improveEvidence({
      checklistTitle: "Checklist de teste",
      itemText: "Item de teste",
      status: "Conforme",
      evidenceOriginal: "registros atualizados"
    }),
    /não está configurada/
  );
  if (previous) process.env.OPENAI_API_KEY = previous;
});
