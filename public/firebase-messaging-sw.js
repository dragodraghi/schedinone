// Firebase Cloud Messaging service worker.
// Config is passed via URL query params at registration time (see src/lib/messaging.ts)
// because Vite does not process files under public/ and the SW has no import.meta.env.

importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

const params = new URL(self.location.href).searchParams;
const config = {
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
};

if (config.apiKey && config.projectId && config.messagingSenderId && config.appId) {
  firebase.initializeApp(config);
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const title = (payload.notification && payload.notification.title) || 'Schedinone';
    const body = (payload.notification && payload.notification.body) || '';
    const data = payload.data || {};
    self.registration.showNotification(title, { body, data, icon: '/og-image.png' });
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const path = data.kind === 'chat'
    ? (data.recipientRole === 'committee' ? '/admin/messaggi' : '/messaggi')
    : '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const origin = self.location.origin;
      const targetUrl = `${origin}${path}`;
      for (const client of clients) {
        if (client.url.startsWith(origin) && 'focus' in client) {
          client.focus();
          if ('navigate' in client) return client.navigate(targetUrl);
          return undefined;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return undefined;
    })
  );
});
