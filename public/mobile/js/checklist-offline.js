(function () {
  const params = new URLSearchParams(window.location.search);
  const checklistId = params.get("checklistId");
  const connectionStatus = document.getElementById("connectionStatus");
  const title = document.getElementById("checklistTitle");
  const sector = document.getElementById("checklistSector");
  const draftStatus = document.getElementById("draftStatus");
  const form = document.getElementById("checklistForm");
  const questionsContainer = document.getElementById("questionsContainer");
  const completionLabel = document.getElementById("completionLabel");
  const saveDraftButton = document.getElementById("saveDraftButton");
  const syncButton = document.getElementById("syncNowButton");
  const toast = document.getElementById("toast");
  const auditorInput = document.getElementById("auditorInput");
  const unitInput = document.getElementById("unitInput");
  const auditDateInput = document.getElementById("auditDateInput");

  let checklist;
  let currentDraft;
  let autosaveTimer;
  let dirty = false;

  function showToast(message) {
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      toast.hidden = true;
    }, 3600);
  }

  function updateConnectionStatus() {
    const online = navigator.onLine;
    connectionStatus.textContent = online ? "Online" : "Offline";
    connectionStatus.classList.toggle("online", online);
    connectionStatus.classList.toggle("offline", !online);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function defaultDateTimeLocal() {
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  }

  function renderQuestions() {
    questionsContainer.innerHTML = checklist.questions
      .map(
        (question) => `
          <article class="question-card" data-question-id="${escapeHtml(question.id)}">
            <div class="question-heading">
              <strong>${question.ordem}. ${escapeHtml(question.pergunta)}</strong>
              <button class="info-button" type="button" aria-label="Ver explicação da pergunta" aria-expanded="false">i</button>
            </div>
            <p class="explanation">${escapeHtml(question.explicacao)}</p>
            <div class="answer-grid" role="radiogroup" aria-label="${escapeHtml(question.pergunta)}">
              ${answerOption(question.id, "Conforme")}
              ${answerOption(question.id, "Não conforme")}
              ${answerOption(question.id, "Não se aplica")}
            </div>
            <label for="obs-${escapeHtml(question.id)}">Observação</label>
            <textarea id="obs-${escapeHtml(question.id)}" data-observation="${escapeHtml(question.id)}" placeholder="Observação do auditor"></textarea>
            <label for="risk-${escapeHtml(question.id)}">Grau de risco</label>
            <select id="risk-${escapeHtml(question.id)}" data-risk="${escapeHtml(question.id)}">
              <option value="">Sem risco aplicável</option>
              <option value="Baixo">Baixo</option>
              <option value="Moderado">Moderado</option>
              <option value="Alto">Alto</option>
              <option value="Crítico">Crítico</option>
            </select>
          </article>
        `
      )
      .join("");

    questionsContainer.querySelectorAll(".info-button").forEach((button) => {
      button.addEventListener("click", () => {
        const explanation = button.closest(".question-card").querySelector(".explanation");
        const nextVisible = !explanation.classList.contains("visible");
        explanation.classList.toggle("visible", nextVisible);
        button.setAttribute("aria-expanded", String(nextVisible));
      });
    });
  }

  function answerOption(questionId, value) {
    return `
      <label class="answer-option">
        <input type="radio" name="answer-${escapeHtml(questionId)}" value="${escapeHtml(value)}" />
        <span>${escapeHtml(value)}</span>
      </label>
    `;
  }

  function collectDraft(status) {
    const respostas = checklist.questions.map((question) => {
      const checked = form.querySelector(`input[name="answer-${CSS.escape(question.id)}"]:checked`);
      return {
        perguntaId: question.id,
        resposta: checked ? checked.value : "",
        observacao: form.querySelector(`[data-observation="${CSS.escape(question.id)}"]`)?.value || "",
        risco: form.querySelector(`[data-risk="${CSS.escape(question.id)}"]`)?.value || ""
      };
    });

    return {
      idLocal: currentDraft?.idLocal || crypto.randomUUID(),
      checklistId: checklist.id,
      setor: checklist.sector || checklist.category,
      leito: unitInput.value,
      auditor: auditorInput.value,
      dataAuditoria: auditDateInput.value,
      respostas,
      status
    };
  }

  function applyDraft(draft) {
    if (!draft) return;
    currentDraft = draft;
    auditorInput.value = draft.auditor || "";
    unitInput.value = draft.leito || "";
    auditDateInput.value = draft.dataAuditoria || defaultDateTimeLocal();

    (draft.respostas || []).forEach((answer) => {
      const radio = form.querySelector(`input[name="answer-${CSS.escape(answer.perguntaId)}"][value="${CSS.escape(answer.resposta)}"]`);
      if (radio) radio.checked = true;
      const observation = form.querySelector(`[data-observation="${CSS.escape(answer.perguntaId)}"]`);
      const risk = form.querySelector(`[data-risk="${CSS.escape(answer.perguntaId)}"]`);
      if (observation) observation.value = answer.observacao || "";
      if (risk) risk.value = answer.risco || "";
    });
  }

  function updateCompletion() {
    const answers = checklist.questions.filter((question) => {
      return form.querySelector(`input[name="answer-${CSS.escape(question.id)}"]:checked`);
    }).length;
    const percent = checklist.questions.length ? Math.round((answers / checklist.questions.length) * 100) : 0;
    completionLabel.textContent = `${percent}% preenchido`;
  }

  async function saveDraft(status = "salvo_localmente", silent = false) {
    if (!checklist) return null;
    currentDraft = await window.MobileDB.saveDraft(collectDraft(status));
    dirty = false;
    draftStatus.textContent = status === "pendente_sync" ? "Checklist pendente de sincronização." : "Checklist salvo localmente.";
    if (!silent) showToast("Checklist salvo localmente.");
    return currentDraft;
  }

  function scheduleAutosave() {
    dirty = true;
    updateCompletion();
    window.clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(() => saveDraft("salvo_localmente", true), 700);
  }

  async function finishChecklist() {
    const missing = checklist.questions.filter((question) => {
      return !form.querySelector(`input[name="answer-${CSS.escape(question.id)}"]:checked`);
    });

    if (missing.length) {
      showToast("Responda todas as perguntas antes de finalizar.");
      return;
    }

    const draft = await saveDraft("pendente_sync", true);
    const queued = await window.MobileDB.queueSync(draft);
    currentDraft = queued;
    draftStatus.textContent = navigator.onLine ? "Pendente de sincronização." : "Salvo no aparelho e pendente de sincronização.";
    showToast("Checklist finalizado e pendente de sincronização.");

    if ("serviceWorker" in navigator && "SyncManager" in window) {
      window.MobileSync.registerBackgroundSync().catch(() => undefined);
    }

    if (navigator.onLine) {
      window.MobileSync.syncPendingChecklists().catch(() => showToast("Erro ao sincronizar. Tente novamente."));
    }
  }

  async function syncNow() {
    if (!navigator.onLine) {
      showToast("Sem internet. Suas respostas serão salvas neste aparelho.");
      return;
    }
    const result = await window.MobileSync.syncPendingChecklists();
    showToast(result.errors ? "Erro ao sincronizar. Tente novamente." : "Checklist sincronizado com sucesso.");
  }

  async function init() {
    updateConnectionStatus();

    if (!checklistId) {
      title.textContent = "Checklist não informado";
      draftStatus.textContent = "Volte para a lista e escolha um checklist.";
      form.hidden = true;
      return;
    }

    checklist = await window.MobileDB.getChecklistWithQuestions(checklistId);
    if (!checklist) {
      title.textContent = "Checklist não disponível offline";
      draftStatus.textContent = "Entre online, atualize a base offline e tente novamente.";
      form.hidden = true;
      return;
    }

    title.textContent = checklist.category;
    sector.textContent = checklist.sector || checklist.category;
    auditDateInput.value = defaultDateTimeLocal();
    renderQuestions();

    const existingDraft = await window.MobileDB.getDraftByChecklist(checklist.id);
    applyDraft(existingDraft);
    updateCompletion();
    draftStatus.textContent = existingDraft ? "Rascunho local recuperado." : "Sem internet, o checklist será salvo neste aparelho.";
  }

  form.addEventListener("input", scheduleAutosave);
  form.addEventListener("change", scheduleAutosave);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    finishChecklist();
  });
  saveDraftButton.addEventListener("click", () => saveDraft("salvo_localmente"));
  syncButton.addEventListener("click", syncNow);
  window.addEventListener("online", updateConnectionStatus);
  window.addEventListener("offline", updateConnectionStatus);
  window.addEventListener("beforeunload", (event) => {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = "";
  });

  init();
})();
