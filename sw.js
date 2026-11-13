const CACHE='sidecar-reader-0.1.29';
const FILES=['./','./index.html','./style.css','./app.js','./writing.js','./writing-position.js','./inline-notes.js','./highlights.js','./note-palette.js','./annotation-gestures.js','./ink-pad.js','./ink-eraser.js','./ink-input.js','./ink-native.js','./shared/annotation-ink.js','./shared/annotation-brush.js','./shared/annotation-inbox.js','./shared/annotation-brush.css','./api.js','./model.js','./storage.js','./pages.js','./layout.js','./cards.js','./token-vault.js','./credentials-ui.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./shared/structure.js','./shared/clock-names.js','./shared/html-format.js','./shared/keep-together.js','./shared/manuscript-format.js','./shared/italic-markers.js','./shared/file-text.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES.map(file=>new Request(new URL(file,self.registration.scope),{cache:'reload'}))))));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||!FILES.some(path=>new URL(path,self.registration.scope).href===event.request.url))return;event.respondWith(caches.open(CACHE).then(cache=>cache.match(event.request)).then(cached=>cached||fetch(event.request)));});
self.addEventListener('message',event=>{
  if(event.data==='activate-reader-update')event.waitUntil(self.skipWaiting());
  if(event.data==='reader-version')event.ports[0]?.postMessage(CACHE.replace('sidecar-reader-',''));
});
