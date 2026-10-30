// Drafta's service worker: reminder notifications only (specs/25_reminders.md, 2.3). It has no fetch
// handler and caches nothing, so pages load exactly as without it.
const BODY = {
  en: 'Drafta reminder', ja: 'Draftaのリマインダー', 'zh-CN': 'Drafta 提醒', ko: 'Drafta 리마인더', es: 'Recordatorio de Drafta',
  fr: 'Rappel Drafta', 'pt-BR': 'Lembrete do Drafta', hi: 'Drafta रिमाइंडर', ar: 'تذكير من Drafta', ru: 'Напоминание Drafta', id: 'Pengingat Drafta',
};

self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const noteId = typeof data.noteId === 'string' ? data.noteId : null;
  // Every push shows a notification (browsers require it), even one that cannot be read.
  event.waitUntil(self.registration.showNotification(typeof data.title === 'string' && data.title ? data.title : 'Drafta', {
    body: BODY[data.lang] ?? BODY.en,
    icon: '/brand/feather.png',
    tag: noteId ? `reminder-${noteId}` : 'reminder',
    data: { noteId },
  }));
});

// Opens the memo: in the app if it is open, otherwise in a new window.
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const noteId = event.notification.data?.noteId ?? null;
  const url = new URL('/app/', self.location.origin);
  if (noteId) url.searchParams.set('note', noteId);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const app = windows.find(client => new URL(client.url).pathname.startsWith('/app'));
    if (app) {
      if (noteId) app.postMessage({ type: 'open-note', noteId });
      return app.focus();
    }
    return self.clients.openWindow(url.href);
  })());
});
