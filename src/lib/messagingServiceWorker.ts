export const FCM_SW_SCOPE = "/firebase-cloud-messaging-push-scope/";

type ServiceWorkerRegistrationLike = {
  scope: string;
  active?: { scriptURL: string } | null;
  waiting?: { scriptURL: string } | null;
  installing?: { scriptURL: string } | null;
};

function getScriptUrl(registration: ServiceWorkerRegistrationLike): string {
  return (
    registration.active?.scriptURL ??
    registration.waiting?.scriptURL ??
    registration.installing?.scriptURL ??
    ""
  );
}

export function isStaleRootMessagingRegistration(
  registration: ServiceWorkerRegistrationLike,
  origin: string
): boolean {
  const rootScope = `${origin.replace(/\/$/, "")}/`;
  return registration.scope === rootScope && getScriptUrl(registration).includes("/firebase-messaging-sw.js");
}

export function buildFirebaseMessagingSwUrl(env: Record<string, string | undefined> = import.meta.env): string {
  const qs = new URLSearchParams({
    apiKey: env.VITE_FIREBASE_API_KEY ?? "",
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: env.VITE_FIREBASE_PROJECT_ID ?? "",
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: env.VITE_FIREBASE_APP_ID ?? "",
  });
  return `/firebase-messaging-sw.js?${qs.toString()}`;
}

export async function registerFirebaseMessagingServiceWorker(): Promise<ServiceWorkerRegistration> {
  const registrations =
    typeof navigator.serviceWorker.getRegistrations === "function"
      ? await navigator.serviceWorker.getRegistrations()
      : [];

  await Promise.all(
    registrations
      .filter((registration) => isStaleRootMessagingRegistration(registration, window.location.origin))
      .map((registration) => registration.unregister())
  );

  return navigator.serviceWorker.register(buildFirebaseMessagingSwUrl(), { scope: FCM_SW_SCOPE });
}
