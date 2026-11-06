// 電波がなくてもアプリを開けるようにするための仕組み。
// 基本はネットから最新を取り、取れないとき（圏外・電波が弱いとき）だけ前回の保存分を使う。
const CACHE_NAME = 'bonsai-techo-v1';
const CDN_HOSTS = [
  'cdn.tailwindcss.com',
  'unpkg.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];
// 保存分があるとき、これ以上待っても応答がなければ保存分を表示する
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // アプリ本体と表示用の部品だけを対象にする（スプレッドシート同期は対象外）
  if (url.origin !== self.location.origin && !CDN_HOSTS.includes(url.hostname)) return;
  e.respondWith(networkFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });

  const network = fetch(req).then((res) => {
    if (res.ok || res.type === 'opaque') {
      cache.put(req, res.clone()).catch(() => {});
    }
    return res;
  });

  if (!cached) return network;

  const timeout = new Promise((resolve) => setTimeout(() => resolve(cached), NETWORK_TIMEOUT_MS));
  return Promise.race([network.catch(() => cached), timeout]);
}
