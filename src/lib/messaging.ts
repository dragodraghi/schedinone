import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { app, db } from './firebase';
import { registerFirebaseMessagingServiceWorker } from './messagingServiceWorker';

export async function initPushForUser(uid: string): Promise<string | null> {
  try {
    if (!(await isSupported())) return null;
    if (typeof Notification === 'undefined') return null;

    let permission = Notification.permission;
    if (permission === 'default') permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const registration = await registerFirebaseMessagingServiceWorker();
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
      if (Notification.permission !== 'granted') return;
      const options: NotificationOptions = {
        body,
        data: payload.data ?? {},
        icon: '/og-image.png',
        tag: payload.data?.threadUid ? `chat-${payload.data.threadUid}` : undefined,
      };
      if (typeof registration.showNotification === 'function') {
        registration.showNotification(title, options).catch(() => {
          new Notification(title, options);
        });
      } else {
        new Notification(title, options);
      }
    });

    return token;
  } catch (e) {
    console.warn('[messaging] init failed', e);
    return null;
  }
}
