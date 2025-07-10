import React, { createContext, useState, useContext, useEffect } from "react";
import authService from "../services/auth";

// Create context
export const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	// Check logged in status on mount
	useEffect(() => {
		const initializeAuth = async () => {
			try {
				if (authService.isAuthenticated()) {
					const userData = await authService.getCurrentUser();
					setUser(userData);
				}
			} catch (err) {
				console.error("Authentication initialization error:", err);
				setError("Failed to restore authentication state");
			} finally {
				setLoading(false);
			}
		};

		initializeAuth();
	}, []);

	// Login handler
	const login = async (username, password) => {
		setLoading(true);
		setError(null);

		try {
			const response = await authService.login(username, password);
			// Fetch user data after successful login
			const userData = await authService.getCurrentUser();
			setUser(userData);
			return { success: true };
		} catch (err) {
			const errorMessage = err.message || "Login failed. Please check your credentials.";
			setError(errorMessage);
			return { success: false, error: errorMessage };
		} finally {
			setLoading(false);
		}
	};

	// Register handler
	const register = async (userData) => {
		setLoading(true);
		setError(null);

		try {
			await authService.register(userData);
			return { success: true };
		} catch (err) {
			const errorMessage = err.message || "Registration failed. Please try again.";
			setError(errorMessage);
			return { success: false, error: errorMessage };
		} finally {
			setLoading(false);
		}
	};

	// Logout handler
	const logout = async () => {
		setLoading(true);
		try {
			await authService.logout();
			setUser(null);
		} catch (err) {
			console.error("Logout error:", err);
		} finally {
			setLoading(false);
		}
	};

	// Password reset request
	const requestPasswordReset = async (email) => {
		setLoading(true);
		setError(null);

		try {
			await authService.requestPasswordReset(email);
			return { success: true };
		} catch (err) {
			const errorMessage = err.message || "Failed to request password reset.";
			setError(errorMessage);
			return { success: false, error: errorMessage };
		} finally {
			setLoading(false);
		}
	};

	// Reset password with token
	const resetPassword = async (token, password, confirmPassword) => {
		setLoading(true);
		setError(null);

		try {
			await authService.resetPassword(token, password, confirmPassword);
			return { success: true };
		} catch (err) {
			const errorMessage = err.message || "Failed to reset password.";
			setError(errorMessage);
			return { success: false, error: errorMessage };
		} finally {
			setLoading(false);
		}
	};

	// Verify email with token
	const verifyEmail = async (token) => {
		setLoading(true);
		setError(null);

		try {
			const result = await authService.verifyEmail(token);
			return { success: true, data: result };
		} catch (err) {
			const errorMessage = err.message || "Failed to verify email.";
			setError(errorMessage);
			return { success: false, error: errorMessage };
		} finally {
			setLoading(false);
		}
	};

	// Auth state utilities
	const isAuthenticated = () => !!user;

	const hasRole = (role) => {
		if (!user) return false;

		// Handle array of roles - return true if user has any of them
		if (Array.isArray(role)) {
			return role.some((r) => hasRole(r));
		}

		// Special case for "admin" - both "admin" and "superuser" have admin privileges
		if (role === "admin") return ["admin", "superuser"].includes(user.role);

		// Superuser check
		if (role === "superuser") return user.role === "superuser";

		// Regular role check
		return user.role === role;
	};

	const value = {
		user,
		loading,
		error,
		login,
		logout,
		register,
		requestPasswordReset,
		resetPassword,
		verifyEmail,
		isAuthenticated,
		hasRole,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook for using the auth context
export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};

export default AuthContext;
