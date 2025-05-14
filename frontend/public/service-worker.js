/**
 * AirAlert Service Worker for push notifications
 * Handles receiving push notifications and displaying them to the user
 */

// Cache name for offline support
const CACHE_NAME = "airalert-cache-v1";

// Listen for push events
self.addEventListener("push", (event) => {
	console.log("Push received:", event);

	let notification = {};

	try {
		// Try to parse the notification data
		if (event.data) {
			notification = event.data.json();
		}
	} catch (error) {
		console.error("Error parsing push notification data:", error);
		notification = {
			title: "AirAlert Notification",
			body: "New air quality alert. Click to view details.",
		};
	}

	// Ensure we have minimum notification content
	const title = notification.title || "AirAlert Notification";
	const options = {
		body: notification.body || "New air quality alert. Click to view details.",
		icon: "/logo192.png",
		badge: "/logo192.png",
		tag: notification.tag || "air-quality-alert",
		data: notification.data || {},
		// Add vibration pattern for mobile devices
		vibrate: [100, 50, 100],
		// Add notification actions if provided
		actions: notification.actions || [
			{ action: "view", title: "View Details" },
			{ action: "dismiss", title: "Dismiss" },
		],
		// Ensure notification is shown with high priority
		requireInteraction: true,
		renotify: true,
	};

	// Extract notification color based on severity if available
	if (notification.data && notification.data.severityLevel !== undefined) {
		const severityColors = [
			"#00e400", // Good
			"#ffff00", // Moderate
			"#ff7e00", // Unhealthy for sensitive groups
			"#ff0000", // Unhealthy
			"#8f3f97", // Very unhealthy
			"#7e0023", // Hazardous
		];
		options.icon = `/alert-${notification.data.severityLevel}.png`;
		options.badge = `/alert-${notification.data.severityLevel}.png`;
	}

	// Show the notification
	const showNotificationPromise = self.registration.showNotification(title, options);

	// Wait until notification is shown before resolving the event
	event.waitUntil(showNotificationPromise);
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
	console.log("Notification click received:", event);

	// Close the notification
	event.notification.close();

	// Handle different actions
	const action = event.action;
	const notification = event.notification;
	const data = notification.data || {};

	// Default URL to open
	let targetUrl = "/";

	// Customize URL based on action and alert data
	if (action === "view" && data.alertId) {
		targetUrl = `/alert/${data.alertId}`;
	} else if (data.pollutant) {
		targetUrl = `/map?pollutant=${data.pollutant}`;
	}

	// Focus or open a new window
	const urlToOpen = new URL(targetUrl, self.location.origin).href;

	const promiseChain = clients
		.matchAll({
			type: "window",
			includeUncontrolled: true,
		})
		.then((windowClients) => {
			// Check if there is already a window open with the target URL
			for (let i = 0; i < windowClients.length; i++) {
				const client = windowClients[i];
				if (client.url === urlToOpen && "focus" in client) {
					return client.focus();
				}
			}

			// If no matching client found, open a new window
			if (clients.openWindow) {
				return clients.openWindow(urlToOpen);
			}
		});

	event.waitUntil(promiseChain);
});

// Handle notification close
self.addEventListener("notificationclose", (event) => {
	console.log("Notification closed:", event);

	// Can track notification dismissals here
	const notification = event.notification;
	const data = notification.data || {};

	// Could send analytics or record the dismissal if needed
});

// Install event - cache app shell for offline use
self.addEventListener("install", (event) => {
	console.log("Service Worker installing");

	// Skip waiting to make new service worker activate immediately
	self.skipWaiting();

	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.addAll([
				"/",
				"/index.html",
				"/static/js/main.bundle.js", // Update with actual bundle paths
				"/static/css/main.css",
				"/manifest.json",
				"/logo192.png",
				"/logo512.png",
				"/favicon.ico",
			]);
		})
	);
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
	console.log("Service Worker activating");

	// Claim clients to control previously loaded pages
	event.waitUntil(self.clients.claim());

	// Clean up old caches
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames.map((cache) => {
					if (cache !== CACHE_NAME) {
						console.log("Service Worker: clearing old cache:", cache);
						return caches.delete(cache);
					}
				})
			);
		})
	);
});

// Fetch event - serve from cache when offline
self.addEventListener("fetch", (event) => {
	event.respondWith(
		caches.match(event.request).then((response) => {
			// Return cached response if found
			if (response) {
				return response;
			}

			// Clone the request since it can only be used once
			const fetchRequest = event.request.clone();

			return fetch(fetchRequest)
				.then((response) => {
					// Check for valid response
					if (!response || response.status !== 200 || response.type !== "basic") {
						return response;
					}

					// Clone the response since it can only be used once
					const responseToCache = response.clone();

					// Cache the fetched resource
					caches.open(CACHE_NAME).then((cache) => {
						cache.put(event.request, responseToCache);
					});

					return response;
				})
				.catch((error) => {
					console.log("Fetch failed; returning offline page instead.", error);
					// Could return a custom offline page here
				});
		})
	);
});
