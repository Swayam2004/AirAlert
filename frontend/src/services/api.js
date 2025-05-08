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

	// User Management
	registerUser: (userData) => axios.post("/api/register", userData),

	login: (credentials) => axios.post("/api/token", credentials),

	getCurrentUser: () => axios.get("/api/users/me"),

	saveUserPreferences: (preferences) => axios.post("/api/user/preferences", preferences),
};

export default API;
