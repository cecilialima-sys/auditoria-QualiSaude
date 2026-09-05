"use client";

import { useId, useState } from "react";
import { Info } from "lucide-react";

export function ChecklistQuestionInfo({ explanation }: { explanation: string }) {
  const [open, setOpen] = useState(false);
  const explanationId = useId();
  return (
    <span className={`question-info ${open ? "open" : ""}`}>
      <button
        aria-controls={explanationId}
        aria-expanded={open}
        aria-label="Ver explicação deste item"
        className="icon-button"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <Info size={17} />
      </button>
      <span className="question-info-content" id={explanationId} role="tooltip">
        {explanation}
      </span>
    </span>
  );
}
