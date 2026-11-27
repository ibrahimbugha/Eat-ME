const V='dem-v1',SHELL=['./','manifest.json','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||u.pathname.startsWith('/api/'))return;
  if(u.origin!==location.origin&&!/cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(u.host))return;
  // network first, fall back to cache (so updates arrive, but it still opens offline)
  e.respondWith(fetch(r).then(res=>{if(res.ok||res.type==='opaque'){const c=res.clone();caches.open(V).then(ch=>ch.put(r,c));}return res;}).catch(()=>caches.match(r).then(m=>m||caches.match('./'))));
});
