// Service worker minimal : permet l'installation de l'application. Rien n'est mis en cache,
// le site reste toujours à jour et le contenu chiffré n'est jamais copié sur l'appareil.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
