export type ChecklistQuestionInfoSource = {
  explicacao?: string;
  explanation?: string;
  criterion?: string;
  pergunta?: string;
  text?: string;
};

export function checklistQuestionInfo(question: ChecklistQuestionInfoSource) {
  return (
    question.explicacao?.trim() ||
    question.explanation?.trim() ||
    question.criterion?.trim() ||
    question.pergunta?.trim() ||
    question.text?.trim() ||
    ""
  );
}
