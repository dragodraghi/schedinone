import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { app, db } from './firebase';

function buildSwUrl(): string {
  const env = import.meta.env;
  const qs = new URLSearchParams({
    apiKey: env.VITE_FIREBASE_API_KEY ?? '',
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: env.VITE_FIREBASE_APP_ID ?? '',
  });
  return `/firebase-messaging-sw.js?${qs.toString()}`;
}

export async function initPushForUser(uid: string): Promise<string | null> {
  try {
    if (!(await isSupported())) return null;
    if (typeof Notification === 'undefined') return null;

    let permission = Notification.permission;
    if (permission === 'default') permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const registration = await navigator.serviceWorker.register(buildSwUrl());
    const messaging = getMessaging(app);
    const vapidKey = import.meta.env.VITE_FCM_VAPID_KEY as string | undefined;
    if (!vapidKey) {
      console.warn('[messaging] VITE_FCM_VAPID_KEY not set');
      return null;
    }
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
    if (!token) return null;

    await setDoc(
      doc(db, `users/${uid}/fcmTokens/${token}`),
      { token, platform: 'web', createdAt: serverTimestamp(), lastSeenAt: serverTimestamp() },
      { merge: true }
    );

    onMessage(messaging, (payload) => {
      const title = payload.notification?.title ?? 'Schedinone';
      const body = payload.notification?.body ?? '';
      if (Notification.permission === 'granted') new Notification(title, { body });
    });

    return token;
  } catch (e) {
    console.warn('[messaging] init failed', e);
    return null;
  }
}
