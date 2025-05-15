import axios from "axios";

// Base URL for API requests
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

// Helper function to set auth header
const authHeader = () => {
	const token = localStorage.getItem("accessToken");
	return token ? { Authorization: `Bearer ${token}` } : {};
};

class AuthService {
	// Register a new user
	async register(userData) {
		try {
			const response = await axios.post(`${API_URL}/api/auth/register`, userData);
			return response.data;
		} catch (error) {
			throw this._handleError(error);
		}
	}

	// Login user
	async login(username, password) {
		try {
			// Using URLSearchParams to match OAuth2 form data format
			const formData = new URLSearchParams();
			formData.append("username", username);
			formData.append("password", password);

			const response = await axios.post(`${API_URL}/api/auth/login`, formData, {
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
			});

			if (response.data.access_token) {
				this._storeTokens(response.data);

				// Get user data immediately after successful login
				try {
					const userResponse = await axios.get(`${API_URL}/api/auth/me`, {
						headers: { Authorization: `Bearer ${response.data.access_token}` },
					});
					this._storeUser(userResponse.data);
				} catch (err) {
					console.error("Failed to get user data after login:", err);
				}
			}
			return response.data;
		} catch (error) {
			throw this._handleError(error);
		}
	}

	// Logout user
	async logout() {
		try {
			// Call logout endpoint to invalidate tokens on backend
			await axios.post(`${API_URL}/api/auth/logout`, {}, { headers: authHeader() });
		} catch (error) {
			console.error("Logout error:", error);
		} finally {
			// Always clear local storage regardless of API response
			this._clearTokens();
		}
	}

	// Get current user info
	async getCurrentUser() {
		try {
			// First check if we have the user stored locally
			const storedUser = this._getUser();
			if (storedUser && this.isAuthenticated() && !this._isTokenExpired()) {
				return storedUser;
			}

			// If no stored user or token expired, check if we need to refresh
			if (this._isTokenExpired()) {
				const refreshSuccess = await this._refreshToken();
				if (!refreshSuccess) {
					this._clearTokens();
					return null;
				}
			}

			// Get fresh user data from API
			if (this.isAuthenticated()) {
				try {
					const response = await axios.get(`${API_URL}/api/auth/me`, {
						headers: authHeader(),
					});
					// Store user data for future use
					this._storeUser(response.data);
					return response.data;
				} catch (error) {
					console.error("Failed to get user data:", error);
					// If unauthorized and refresh token is available, try refreshing
					if (error.response?.status === 401 && localStorage.getItem("refreshToken")) {
						// Try to refresh token
						const refreshSuccess = await this._refreshToken();
						if (refreshSuccess) {
							// Try again with new token
							const response = await axios.get(`${API_URL}/api/auth/me`, {
								headers: authHeader(),
							});
							this._storeUser(response.data);
							return response.data;
						}
						this._clearTokens();
					}
					return null;
				}
			}
			return null;
		} catch (error) {
			console.error("Error in getCurrentUser:", error);
			return null;
		}
	}

	// Verify email with token
	async verifyEmail(token) {
		try {
			const response = await axios.get(`${API_URL}/api/auth/verify-email/${token}`);
			return response.data;
		} catch (error) {
			throw this._handleError(error);
		}
	}

	// Request password reset
	async requestPasswordReset(email) {
		try {
			const response = await axios.post(`${API_URL}/api/auth/reset-password-request`, { email });
			return response.data;
		} catch (error) {
			throw this._handleError(error);
		}
	}

	// Reset password with token
	async resetPassword(token, password, confirmPassword) {
		try {
			const response = await axios.post(`${API_URL}/api/auth/reset-password/${token}`, { password, confirm_password: confirmPassword });
			return response.data;
		} catch (error) {
			throw this._handleError(error);
		}
	}

	// Check if user is authenticated
	isAuthenticated() {
		return !!localStorage.getItem("accessToken");
	}

	// Get user role
	getUserRole() {
		const user = this._getUser();
		return user ? user.role : null;
	}

	// Check if user has admin role
	isAdmin() {
		const role = this.getUserRole();
		return role === "admin" || role === "superuser";
	}

	// Check if user has superuser role
	isSuperuser() {
		return this.getUserRole() === "superuser";
	}

	// Private: Store tokens in localStorage
	_storeTokens(data) {
		localStorage.setItem("accessToken", data.access_token);
		localStorage.setItem("tokenType", data.token_type);
		localStorage.setItem("refreshToken", data.refresh_token);

		// Store expiration time (current time + expires_in seconds)
		const expiresAt = new Date().getTime() + data.expires_in * 1000;
		localStorage.setItem("expiresAt", expiresAt.toString());
	}

	// Private: Clear tokens from localStorage
	_clearTokens() {
		localStorage.removeItem("accessToken");
		localStorage.removeItem("tokenType");
		localStorage.removeItem("refreshToken");
		localStorage.removeItem("expiresAt");
		localStorage.removeItem("user");
	}

	// Private: Get stored user
	_getUser() {
		const userStr = localStorage.getItem("user");
		return userStr ? JSON.parse(userStr) : null;
	}

	// Private: Store user data
	_storeUser(user) {
		localStorage.setItem("user", JSON.stringify(user));
	}

	// Private: Check if token is expired
	_isTokenExpired() {
		const expiresAt = localStorage.getItem("expiresAt");
		if (!expiresAt) return true;

		return new Date().getTime() > parseInt(expiresAt);
	}

	// Private: Refresh token
	async _refreshToken() {
		try {
			const refreshToken = localStorage.getItem("refreshToken");
			if (!refreshToken) return false;

			// Using the refresh token directly as the payload since that's what the API expects
			const response = await axios.post(`${API_URL}/api/auth/refresh-token`, refreshToken, {
				headers: {
					"Content-Type": "text/plain",
				},
			});

			if (response.data.access_token) {
				this._storeTokens(response.data);
				return true;
			}
			return false;
		} catch (error) {
			console.error("Token refresh failed:", error);
			this._clearTokens();
			return false;
		}
	}

	// Private: Error handler
	_handleError(error) {
		if (error.response) {
			// Server responded with an error status
			return {
				status: error.response.status,
				message: error.response.data.detail || "An error occurred",
			};
		} else if (error.request) {
			// Request was made but no response received
			return { status: 0, message: "No response from server" };
		} else {
			// Error setting up the request
			return { status: 0, message: error.message };
		}
	}
}

// Create a single instance
const authService = new AuthService();

// Set up interceptor for automatic token refresh
axios.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config;

		// If error is 401 and not a retry and we have a refresh token
		if (error.response?.status === 401 && !originalRequest._retry && localStorage.getItem("refreshToken")) {
			originalRequest._retry = true;

			try {
				// Try to refresh the token
				const refreshed = await authService._refreshToken();

				if (refreshed) {
					// Update the auth header with new token
					originalRequest.headers.Authorization = `Bearer ${localStorage.getItem("accessToken")}`;
					// Retry the original request
					return axios(originalRequest);
				}
			} catch (refreshError) {
				console.error("Token refresh failed in interceptor:", refreshError);
			}

			// If refresh failed, redirect to login
			authService._clearTokens();
			window.location = "/login";
		}

		return Promise.reject(error);
	}
);

export default authService;
