import axios from "axios";

const API = {
	// Health check
	healthCheck: () => axios.get("/health"),

	// Air Quality Data Endpoints
	getMonitoringStations: (limit = 100, offset = 0) => axios.get(`/api/monitoring_stations?limit=${limit}&offset=${offset}`),

	getAirQuality: (params = {}) => axios.get("/api/air_quality", { params }),

	fetchData: () => axios.post("/api/fetch_data"),

	// Alert Management Endpoints
	checkAlerts: (pollutant) => axios.post("/api/check_alerts", { pollutant }),

	getAlerts: (params = {}) => axios.get("/api/alerts", { params }),

	getUserNotifications: (userId, unreadOnly = false) => axios.get(`/api/notifications/${userId}`, { params: { unread_only: unreadOnly } }),

	// Map Data
	getInteractiveMap: () => axios.get("/api/map"),

	generateMap: (pollutant) => axios.post(`/api/generate_map?pollutant=${pollutant}`),

	// User Management
	registerUser: (userData) => axios.post("/api/register", userData),

	login: (credentials) => axios.post("/api/token", credentials),

	getCurrentUser: () => axios.get("/api/users/me"),

	saveUserPreferences: (preferences) => axios.post("/api/user/preferences", preferences),

	// New Notification APIs

	// Process notifications (for admin or testing)
	processNotifications: (alertId = null) => {
		const params = alertId ? { alert_id: alertId } : {};
		return axios.post("/api/notifications/process", params);
	},

	// Mark a notification as read
	markNotificationRead: (notificationId) => axios.post(`/api/notifications/${notificationId}/read`),

	// Mark all notifications as read
	markAllNotificationsRead: (userId) => axios.post(`/api/notifications/${userId}/read-all`),

	// Send verification email
	sendVerificationEmail: (email) => axios.post("/api/verify_email", { email }),

	// Verify email with token
	verifyEmail: (token) => axios.get(`/api/verify_email/${token}`),

	// Web Push Subscription
	subscribeWebPush: (subscription) => axios.post("/api/web-push/subscribe", subscription),

	unsubscribeWebPush: (subscription) => axios.post("/api/web-push/unsubscribe", subscription),

	getVapidPublicKey: () => axios.get("/api/web-push/vapid-public-key"),

	// User Preferences Management
	fetchUserPreferences: (userId) => axios.get(`/api/users/${userId}/preferences`),

	updateUserPreferences: (userId, preferences) => axios.put(`/api/users/${userId}/preferences`, preferences),

	createAlertSubscription: (userId, subscription) => axios.post(`/api/users/${userId}/alert_subscriptions`, subscription),

	deleteAlertSubscription: (userId, subscriptionId) => axios.delete(`/api/users/${userId}/alert_subscriptions/${subscriptionId}`),

	verifyUserEmail: (userId, token) => axios.post(`/api/users/${userId}/verify-email?token=${token}`),

	// Data Visualization
	getTimeSeriesData: (stationId, pollutant, startDate, endDate) =>
		axios.get("/api/air_quality", {
			params: {
				station_id: stationId,
				pollutant,
				start_date: startDate,
				end_date: endDate,
			},
		}),

	getHeatmapData: (pollutant, timestamp) =>
		axios.get("/api/air_quality", {
			params: {
				pollutant,
				timestamp,
			},
		}),

	// Authentication Endpoints
	login: (email, password) => axios.post("/api/token", { email, password }),

	register: (name, email, password) => axios.post("/api/register", { name, email, password }),

	// User Management
	getUserProfile: (userId) => axios.get(`/api/users/${userId}`),

	updateUserProfile: (userId, data) => axios.put(`/api/users/${userId}`, data),
};

// Helper functions for working with the API

/**
 * Converts a service worker subscription object to the format expected by the backend
 * @param {PushSubscription} subscription - The Push API subscription object
 * @returns {Object} Formatted subscription object
 */
export const formatPushSubscription = (subscription) => {
	return {
		endpoint: subscription.endpoint,
		keys: {
			p256dh: subscription.getKey ? btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey("p256dh")))) : "",
			auth: subscription.getKey ? btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey("auth")))) : "",
		},
	};
};

/**
 * Registers the service worker and sets up push notifications
 * @returns {Promise<PushSubscription>} The push subscription object
 */
export const registerForPushNotifications = async () => {
	if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
		throw new Error("Push notifications not supported by your browser");
	}

	try {
		// Register service worker
		const registration = await navigator.serviceWorker.register("/service-worker.js");
		console.log("Service Worker registered with scope:", registration.scope);

		// Get VAPID public key from server
		const vapidResponse = await API.getVapidPublicKey();
		const vapidPublicKey = vapidResponse.data.vapidPublicKey;

		if (!vapidPublicKey) {
			throw new Error("VAPID public key not available");
		}

		// Convert VAPID key to Uint8Array
		const publicKey = urlBase64ToUint8Array(vapidPublicKey);

		// Subscribe to push notifications
		const subscription = await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: publicKey,
		});

		// Send subscription to server
		await API.subscribeWebPush(subscription);

		return subscription;
	} catch (error) {
		console.error("Error registering for push notifications:", error);
		throw error;
	}
};

/**
 * Unregisters push notifications
 * @param {PushSubscription} subscription - The subscription to unregister
 * @returns {Promise<boolean>} Success indicator
 */
export const unregisterPushNotifications = async (subscription) => {
	if (!subscription) return false;

	try {
		// Unsubscribe from push service
		const success = await subscription.unsubscribe();

		if (success) {
			// Notify server
			await API.unsubscribeWebPush(subscription);
		}

		return success;
	} catch (error) {
		console.error("Error unregistering push notifications:", error);
		throw error;
	}
};

/**
 * Converts URL base64 to Uint8Array for web push
 * @param {string} base64String - Base64 string to convert
 * @returns {Uint8Array} Converted array
 */
const urlBase64ToUint8Array = (base64String) => {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);

	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
};

export default API;
