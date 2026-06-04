(function () {
  const DB_NAME = "sistema_mobile_offline_db";
  const DB_VERSION = 1;

  let dbPromise;

  function openDB() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        createStore(db, "checklists", "id");
        createStore(db, "perguntas", "id", [{ name: "checklistId", keyPath: "checklistId" }]);
        createStore(db, "respostas_pendentes", "idLocal");
        createStore(db, "respostas_sincronizadas", "idLocal");
        createStore(db, "fila_sync", "idLocal", [{ name: "status", keyPath: "status" }]);
        createStore(db, "metadados", "key");
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return dbPromise;
  }

  function createStore(db, name, keyPath, indexes) {
    if (db.objectStoreNames.contains(name)) return;
    const store = db.createObjectStore(name, { keyPath });
    (indexes || []).forEach((index) => store.createIndex(index.name, index.keyPath, { unique: false }));
  }

  async function tx(storeName, mode, handler) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      const result = handler(store);
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function put(storeName, value) {
    await tx(storeName, "readwrite", (store) => store.put(value));
    return value;
  }

  async function get(storeName, key) {
    const db = await openDB();
    const transaction = db.transaction(storeName, "readonly");
    return requestToPromise(transaction.objectStore(storeName).get(key));
  }

  async function getAll(storeName) {
    const db = await openDB();
    const transaction = db.transaction(storeName, "readonly");
    return requestToPromise(transaction.objectStore(storeName).getAll());
  }

  async function remove(storeName, key) {
    await tx(storeName, "readwrite", (store) => store.delete(key));
  }

  async function getByIndex(storeName, indexName, value) {
    const db = await openDB();
    const transaction = db.transaction(storeName, "readonly");
    return requestToPromise(transaction.objectStore(storeName).index(indexName).getAll(value));
  }

  async function setMeta(key, value) {
    return put("metadados", { key, value, updatedAt: new Date().toISOString() });
  }

  async function getMeta(key) {
    const result = await get("metadados", key);
    return result ? result.value : null;
  }

  async function saveChecklistStructure(checklists) {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(["checklists", "perguntas"], "readwrite");
      const checklistStore = transaction.objectStore("checklists");
      const questionStore = transaction.objectStore("perguntas");

      checklists.forEach((checklist) => {
        checklistStore.put({
          id: checklist.id,
          sector: checklist.sector,
          category: checklist.category,
          sourceFile: checklist.sourceFile,
          totalQuestions: checklist.totalQuestions,
          updatedAt: new Date().toISOString()
        });

        checklist.questions.forEach((question) => {
          questionStore.put({ ...question, checklistId: checklist.id });
        });
      });

      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    await setMeta("lastChecklistRefresh", new Date().toISOString());
  }

  async function getChecklistWithQuestions(checklistId) {
    const checklist = await get("checklists", checklistId);
    if (!checklist) return null;
    const questions = await getByIndex("perguntas", "checklistId", checklistId);
    questions.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    return { ...checklist, questions };
  }

  async function saveDraft(draft) {
    const now = new Date().toISOString();
    const existing = await get("respostas_pendentes", draft.idLocal);
    const next = {
      ...existing,
      ...draft,
      status: draft.status || existing?.status || "salvo_localmente",
      criadoEm: existing?.criadoEm || draft.criadoEm || now,
      atualizadoEm: now
    };
    await put("respostas_pendentes", next);
    return next;
  }

  async function getDraftByChecklist(checklistId) {
    const drafts = await getAll("respostas_pendentes");
    return drafts
      .filter((draft) => draft.checklistId === checklistId && draft.status !== "sincronizado")
      .sort((a, b) => String(b.atualizadoEm).localeCompare(String(a.atualizadoEm)))[0];
  }

  async function queueSync(draft) {
    const queued = {
      ...draft,
      status: "pendente_sync",
      queuedAt: new Date().toISOString(),
      attempts: draft.attempts || 0
    };
    await put("respostas_pendentes", queued);
    await put("fila_sync", queued);
    return queued;
  }

  async function counts() {
    const checklists = await getAll("checklists");
    const pending = await getAll("fila_sync");
    const synced = await getAll("respostas_sincronizadas");
    return { checklists: checklists.length, pending: pending.length, synced: synced.length };
  }

  window.MobileDB = {
    openDB,
    put,
    get,
    getAll,
    remove,
    getByIndex,
    setMeta,
    getMeta,
    saveChecklistStructure,
    getChecklistWithQuestions,
    saveDraft,
    getDraftByChecklist,
    queueSync,
    counts
  };
})();
