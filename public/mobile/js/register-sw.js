(function () {
  async function registerMobileServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    try {
      await navigator.serviceWorker.register("/mobile/sw-mobile.js", {
        scope: "/mobile/"
      });
    } catch (error) {
      console.warn("Service Worker mobile não registrado.", error);
    }
  }

  registerMobileServiceWorker();
})();
