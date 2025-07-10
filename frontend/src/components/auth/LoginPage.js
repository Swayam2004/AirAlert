import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const LoginPage = () => {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const { login } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();

	// Get the page to redirect to after login (or default to dashboard)
	const from = location.state?.from?.pathname || "/dashboard";

	const handleSubmit = async (e) => {
		e.preventDefault();

		// Form validation
		if (!username.trim() || !password.trim()) {
			setError("Please enter both username and password");
			return;
		}

		setIsLoading(true);
		setError("");

		try {
			const result = await login(username, password);
			if (result.success) {
				// Redirect to the page the user was trying to access
				navigate(from, { replace: true });
			} else {
				setError(result.error || "Login failed. Please try again.");
			}
		} catch (err) {
			setError("An unexpected error occurred. Please try again.");
			console.error("Login error:", err);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="auth-page">
			<div className="auth-container">
				<h1>Log In to AirAlert</h1>
				<p className="auth-subtitle">Monitor air quality and receive alerts in real-time</p>

				{error && <div className="error-message">{error}</div>}

				<form onSubmit={handleSubmit} className="auth-form">
					<div className="form-group">
						<label htmlFor="username">Username</label>
						<input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter your username" disabled={isLoading} required />
					</div>

					<div className="form-group">
						<label htmlFor="password">Password</label>
						<input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" disabled={isLoading} required />
					</div>

					<div className="auth-actions">
						<button type="submit" className="btn btn-primary" disabled={isLoading}>
							{isLoading ? "Logging in..." : "Log In"}
						</button>
					</div>
				</form>

				<div className="auth-links">
					<Link to="/forgot-password">Forgot password?</Link>
					<div className="auth-separator">|</div>
					<Link to="/register">Create an account</Link>
				</div>
			</div>
		</div>
	);
};

export default LoginPage;
