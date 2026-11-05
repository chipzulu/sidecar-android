const CACHE='sidecar-reader-0.1.0';
const FILES=['./','./index.html','./style.css','./app.js','./api.js','./model.js','./storage.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./shared/structure.js','./shared/clock-names.js','./shared/html-format.js','./shared/keep-together.js','./shared/manuscript-format.js','./shared/italic-markers.js','./shared/file-text.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||!FILES.some(path=>new URL(path,self.registration.scope).href===event.request.url))return;event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));});
