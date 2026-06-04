(function () {
  const list = document.getElementById("checklistList");
  const searchInput = document.getElementById("searchInput");
  const connectionStatus = document.getElementById("connectionStatus");
  const lastUpdateLabel = document.getElementById("lastUpdateLabel");
  const refreshButton = document.getElementById("refreshChecklistsButton");
  const syncButton = document.getElementById("syncNowButton");
  const bottomSyncButton = document.getElementById("bottomSyncButton");
  const toast = document.getElementById("toast");

  let checklists = [];

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

  async function updateCounters() {
    const counts = await window.MobileDB.counts();
    document.getElementById("availableCount").textContent = counts.checklists;
    document.getElementById("pendingCount").textContent = counts.pending;
    document.getElementById("syncedCount").textContent = counts.synced;
  }

  async function updateLastRefresh() {
    const lastRefresh = await window.MobileDB.getMeta("lastChecklistRefresh");
    lastUpdateLabel.textContent = lastRefresh
      ? `Atualizado em ${new Date(lastRefresh).toLocaleString("pt-BR")}`
      : "Nenhuma atualização local";
  }

  async function fetchOnlineChecklists() {
    const response = await fetch("/api/mobile/checklists", { credentials: "include" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Faça login online antes de atualizar a base mobile.");
    }
    await window.MobileDB.saveChecklistStructure(data.checklists || []);
    checklists = await window.MobileDB.getAll("checklists");
    await updateLastRefresh();
    await updateCounters();
    renderList();
    showToast("Base offline atualizada com sucesso.");
  }

  async function loadLocalChecklists() {
    checklists = await window.MobileDB.getAll("checklists");
    checklists.sort((a, b) => String(a.category).localeCompare(String(b.category), "pt-BR"));
    await updateLastRefresh();
    await updateCounters();
    renderList();
  }

  function renderList() {
    const query = searchInput.value.trim().toLowerCase();
    const filtered = checklists.filter((checklist) => {
      const text = `${checklist.category} ${checklist.sector}`.toLowerCase();
      return text.includes(query);
    });

    if (!filtered.length) {
      list.innerHTML = '<article class="checklist-card"><h3>Nenhum checklist local encontrado</h3><p>Entre online e toque em "Atualizar base offline" para baixar os checklists para este aparelho.</p></article>';
      return;
    }

    list.innerHTML = filtered
      .map(
        (checklist) => `
          <article class="checklist-card">
            <div>
              <h3>${escapeHtml(checklist.category)}</h3>
              <p>${escapeHtml(checklist.sector || checklist.category)}</p>
            </div>
            <div class="badge-row">
              <span class="badge">Disponível offline</span>
              <span class="badge">${Number(checklist.totalQuestions || 0)} perguntas</span>
            </div>
            <a class="button primary" href="/mobile/checklist-preenchimento.html?checklistId=${encodeURIComponent(checklist.id)}">Abrir checklist</a>
          </article>
        `
      )
      .join("");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function syncNow() {
    if (!navigator.onLine) {
      showToast("Sem internet. Suas respostas continuam salvas neste aparelho.");
      return;
    }

    try {
      const result = await window.MobileSync.syncPendingChecklists();
      await updateCounters();
      if (result.synced === 0 && result.errors === 0) {
        showToast("Não há checklists pendentes.");
      } else if (result.errors > 0) {
        showToast("Alguns checklists não sincronizaram. Tente novamente.");
      } else {
        showToast("Checklist sincronizado com sucesso.");
      }
    } catch {
      showToast("Erro ao sincronizar. Tente novamente quando houver conexão.");
    }
  }

  refreshButton.addEventListener("click", async () => {
    if (!navigator.onLine) {
      showToast("Sem internet. Use os checklists já salvos no aparelho.");
      return;
    }

    refreshButton.disabled = true;
    try {
      await fetchOnlineChecklists();
    } catch (error) {
      showToast(error.message || "Não foi possível atualizar a base offline.");
    } finally {
      refreshButton.disabled = false;
    }
  });

  syncButton.addEventListener("click", syncNow);
  bottomSyncButton.addEventListener("click", syncNow);
  searchInput.addEventListener("input", renderList);
  window.addEventListener("online", updateConnectionStatus);
  window.addEventListener("offline", updateConnectionStatus);
  window.addEventListener("mobile-sync-status", updateCounters);

  updateConnectionStatus();
  loadLocalChecklists().then(() => {
    if (navigator.onLine && !checklists.length) {
      fetchOnlineChecklists().catch((error) => showToast(error.message || "Faça login online para baixar os checklists."));
    }
    if (navigator.onLine) {
      window.MobileSync.syncPendingChecklists().catch(() => undefined);
    }
  });
})();
