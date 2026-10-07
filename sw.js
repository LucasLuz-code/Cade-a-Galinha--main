// ============================================================================
//  SERVICE WORKER - guarda o jogo no aparelho para abrir sem internet.
//
//  A pagina (index.html) e buscada primeiro na rede: com internet, sempre
//  chega a versao nova do jogo; sem internet, sai a copia guardada.
//  O resto (Phaser, fonte, imagens) sai direto da copia guardada, que e
//  atualizada por tras quando ha rede.
//
//  Trocou algum arquivo da lista abaixo (ou acrescentou um)? Suba o numero de
//  VERSAO: isso faz o aparelho baixar tudo de novo e jogar fora o antigo.
// ============================================================================
var VERSAO = 'galinha-v7';
var ARQUIVOS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'vendor/phaser.min.js',
  'fonts/silkscreen.woff2',
  'imgs/banner-tela.webp',
  'imgs/icone-192.png',
  'imgs/icone-512.png'
];

self.addEventListener('install', function (ev) {
  ev.waitUntil(
    caches.open(VERSAO)
      .then(function (c) { return c.addAll(ARQUIVOS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (ev) {
  ev.waitUntil(
    caches.keys().then(function (nomes) {
      return Promise.all(nomes.map(function (n) { if (n !== VERSAO) return caches.delete(n); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (ev) {
  var req = ev.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  // guarda a resposta boa na copia e devolve a resposta
  var guarda = function (resp) {
    if (resp && resp.ok) {
      var copia = resp.clone();
      caches.open(VERSAO).then(function (c) { c.put(req, copia); });
    }
    return resp;
  };

  if (req.mode === 'navigate') {
    // pagina: rede primeiro, copia guardada se estiver sem internet
    ev.respondWith(
      fetch(req).then(guarda).catch(function () {
        return caches.match(req).then(function (r) { return r || caches.match('index.html'); });
      })
    );
    return;
  }

  // o resto: copia guardada na hora e atualiza por tras
  ev.respondWith(
    caches.match(req).then(function (r) {
      var daRede = fetch(req).then(guarda).catch(function () { return r; });
      return r || daRede;
    })
  );
});
