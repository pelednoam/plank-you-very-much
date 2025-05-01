/// <reference lib="WebWorker"/>

// No explicit global self declaration

// Optional: Import workbox libraries if needed for more complex logic
// import { clientsClaim } from 'workbox-core';
// import { precacheAndRoute } from 'workbox-precaching';

// Check if the current scope is a ServiceWorkerGlobalScope
if (self instanceof ServiceWorkerGlobalScope) {

  // --- Event Listeners --- 

  // Install event - often used for precaching or skipWaiting
  self.addEventListener('install', (event: ExtendableEvent) => {
    console.log('Service Worker: Installing...');
    // Optional: Immediately activate the new service worker
    // self.skipWaiting();
  });

  // Activate event - often used for claiming clients or cleaning up old caches
  self.addEventListener('activate', (event: ExtendableEvent) => {
    console.log('Service Worker: Activating...');
    // Optional: Take control of all open clients immediately
    // event.waitUntil((self as ServiceWorkerGlobalScope).clients.claim());
  });

  // Push event - handles incoming push messages
  self.addEventListener('push', (event: PushEvent) => {
    console.log('Service Worker: Push Received.');

    if (!event.data) {
      console.error('Service Worker: Push event contained no data.');
      return;
    }

    let notificationData = { title: 'Plank You Very Much', body: 'You have a new notification.', icon: '/icons/icon-192.png', badge: '/icons/badge-72.png', data: { url: '/'} }; // Default data includes URL

    try {
      // Attempt to parse the data as JSON
      const payload = event.data.json();
      console.log('Service Worker: Push data parsed:', payload);
      
      // Structure assumes payload is like: { title: string, options: NotificationOptions }
      // options can include body, icon, badge, data, actions etc.
      // See: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification
      notificationData.title = payload.title || notificationData.title;
      const payloadOptions = payload.options || {};
      notificationData.body = payloadOptions.body || notificationData.body;
      notificationData.icon = payloadOptions.icon || notificationData.icon;
      notificationData.badge = payloadOptions.badge || notificationData.badge;
      notificationData.data = payloadOptions.data || notificationData.data; // Pass through any custom data

    } catch (e) {
      console.warn('Service Worker: Push data is not JSON, treating as text.');
      notificationData.body = event.data.text();
    }

    const options: NotificationOptions = {
       body: notificationData.body,
       icon: notificationData.icon,
       badge: notificationData.badge,
       data: notificationData.data, // Include custom data 
       // actions: [ // Example actions
       //   { action: 'explore', title: 'Explore' },
       //   { action: 'close', title: 'Close' },
       // ],
    };

    console.log("[SW] Push received with data:", notificationData);

    // Cast self to access registration
    const notificationPromise = (self as unknown as ServiceWorkerGlobalScope).registration.showNotification(notificationData.title, options);
    event.waitUntil(notificationPromise);
  });

  // Optional: notificationclick event - handles user clicking the notification
  self.addEventListener('notificationclick', (event: NotificationEvent) => {
    console.log('Service Worker: Notification click Received.', event.notification);

    event.notification.close(); // Close the notification

    // Example: Focus or open a window based on notification data
    const urlToOpen = event.notification.data?.url || '/'; // Default to home page

    // Cast self to access clients
    const swScope = self as unknown as ServiceWorkerGlobalScope;
    event.waitUntil(
      swScope.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      }).then((clientList) => {
        // clientList type should be inferred correctly now with WebWorker lib
        for (const client of clientList) {
          // If a window matching the URL is already open, focus it
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise, open a new window
        if (swScope.clients.openWindow) {
          return swScope.clients.openWindow(urlToOpen);
        }
      })
    );
  });

} else {
    // This block should not run in a service worker context
    console.error("This script is not running in a ServiceWorkerGlobalScope.");
}

// --- Workbox Injection Point --- 
// next-pwa should inject workbox build artifacts/logic here automatically
// when it detects this custom worker file.

// If you need to use precacheAndRoute explicitly, you might do it here.
// Example: precacheAndRoute(self.__WB_MANIFEST || []); 