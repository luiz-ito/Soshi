// Soshi — Service Worker
// Estratégia: "stale-while-revalidate" para tudo do mesmo domínio.
// Serve do cache instantaneamente (funciona offline) e atualiza o cache
// em segundo plano sempre que há internet disponível.

const CACHE_NAME = "soshi-cache-v3"; // suba este número quando quiser forçar a limpeza do cache antigo

// Arquivos essenciais para pré-carregar assim que o Service Worker instalar.
// Ajuste os nomes se o seu arquivo principal não se chamar "index.html".
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch(() => {
            // ignora silenciosamente arquivos que não existirem nesse caminho
          })
        )
      )
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // só lida com GET do mesmo domínio; deixa o resto passar direto
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached); // sem internet: usa o cache

      // responde com o cache imediatamente se existir (rápido + funciona offline),
      // e atualiza o cache por trás dos panos quando a rede responder
      return cached || network;
    })
  );
});