(function () {
  const SYNC_STATUS = {
    pending: "pendente_sync",
    syncing: "sincronizando",
    synced: "sincronizado",
    error: "erro_sync"
  };

  function emitSyncStatus(detail) {
    window.dispatchEvent(new CustomEvent("mobile-sync-status", { detail }));
  }

  async function registerBackgroundSync() {
    if (!("serviceWorker" in navigator) || !("SyncManager" in window)) return false;
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register("sync-checklists");
    return true;
  }

  function buildPayload(item) {
    return {
      idLocal: item.idLocal,
      checklistId: item.checklistId,
      setor: item.setor,
      leito: item.leito,
      respostas: item.respostas || [],
      criadoEm: item.criadoEm,
      atualizadoEm: item.atualizadoEm
    };
  }

  async function syncOne(item) {
    const currentAttempt = Number(item.attempts || 0) + 1;
    await window.MobileDB.put("fila_sync", { ...item, status: SYNC_STATUS.syncing, attempts: currentAttempt });

    try {
      const response = await fetch("/api/checklists/sync", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(item))
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Erro ao sincronizar.");
      }

      const synced = {
        ...item,
        ...data,
        status: SYNC_STATUS.synced,
        sincronizadoEm: new Date().toISOString()
      };

      await window.MobileDB.put("respostas_sincronizadas", synced);
      await window.MobileDB.put("respostas_pendentes", synced);
      await window.MobileDB.remove("fila_sync", item.idLocal);
      emitSyncStatus({ type: "success", item: synced });
      return synced;
    } catch (error) {
      const failed = {
        ...item,
        status: SYNC_STATUS.error,
        attempts: currentAttempt,
        lastError: error.message || "Erro ao sincronizar.",
        updatedAt: new Date().toISOString()
      };
      await window.MobileDB.put("fila_sync", failed);
      await window.MobileDB.put("respostas_pendentes", failed);
      emitSyncStatus({ type: "error", item: failed, error });
      throw error;
    }
  }

  async function syncPendingChecklists() {
    if (!navigator.onLine) {
      emitSyncStatus({ type: "offline" });
      return { ok: false, synced: 0, errors: 0 };
    }

    const queue = await window.MobileDB.getAll("fila_sync");
    let synced = 0;
    let errors = 0;

    emitSyncStatus({ type: "start", total: queue.length });

    for (const item of queue) {
      try {
        await syncOne(item);
        synced += 1;
      } catch {
        errors += 1;
      }
    }

    emitSyncStatus({ type: "finish", synced, errors });
    return { ok: errors === 0, synced, errors };
  }

  window.addEventListener("online", () => {
    syncPendingChecklists().catch(() => undefined);
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "SYNC_CHECKLISTS") {
        syncPendingChecklists().catch(() => undefined);
      }
    });
  }

  window.MobileSync = {
    SYNC_STATUS,
    registerBackgroundSync,
    syncPendingChecklists
  };
})();
