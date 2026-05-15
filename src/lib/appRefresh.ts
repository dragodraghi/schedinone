export async function hardRefreshApp() {
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch (err) {
    console.warn("[app-refresh] cleanup failed", err);
  } finally {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("refresh", Date.now().toString());
    window.location.replace(nextUrl.toString());
  }
}
