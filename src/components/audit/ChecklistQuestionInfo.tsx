"use client";

import { Info } from "lucide-react";

export function ChecklistQuestionInfo({ explanation }: { explanation: string }) {
  return (
    <span className="question-info">
      <button aria-label="Ver explicacao da pergunta" className="icon-button" type="button">
        <Info size={17} />
      </button>
      <span className="question-info-content" role="tooltip">
        {explanation}
      </span>
    </span>
  );
}
