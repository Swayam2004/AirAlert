import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * ProtectedRoute component that checks authentication and roles before rendering
 *
 * @param {Object} props - Component props
 * @param {JSX.Element} props.children - The component to render if authentication passes
 * @param {string} [props.requiredRole] - Optional role required to access this route
 * @returns {JSX.Element} Either the protected component or a redirect to login
 */
const ProtectedRoute = ({ children, requiredRole }) => {
	const { isAuthenticated, hasRole, loading } = useAuth();
	const location = useLocation();

	// While checking authentication status, show nothing or a loader
	if (loading) {
		return <div className="loading-spinner">Loading...</div>;
	}

	// If not authenticated, redirect to login
	if (!isAuthenticated()) {
		// Save the current location to redirect back after login
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	// If a specific role is required, check it
	if (requiredRole && !hasRole(requiredRole)) {
		// Redirect to unauthorized page or dashboard
		return <Navigate to="/unauthorized" replace />;
	}

	// If all checks pass, render the protected content
	return children;
};

export default ProtectedRoute;
