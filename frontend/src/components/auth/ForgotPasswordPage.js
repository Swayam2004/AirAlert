import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const ForgotPasswordPage = () => {
	const [email, setEmail] = useState("");
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const { requestPasswordReset } = useAuth();

	const validateEmail = (email) => {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		// Validate email
		if (!email.trim()) {
			setError("Please enter your email address");
			return;
		}

		if (!validateEmail(email)) {
			setError("Please enter a valid email address");
			return;
		}

		setIsLoading(true);
		setError("");

		try {
			const result = await requestPasswordReset(email);

			if (result.success) {
				setIsSubmitted(true);
			} else {
				setError(result.error || "Failed to send password reset email. Please try again.");
			}
		} catch (err) {
			setError("An unexpected error occurred. Please try again.");
			console.error("Password reset request error:", err);
		} finally {
			setIsLoading(false);
		}
	};

	// If the request was submitted successfully, show success message
	if (isSubmitted) {
		return (
			<div className="auth-page">
				<div className="auth-container">
					<div className="verification-icon">
						<i className="fas fa-envelope"></i>
					</div>

					<h1>Check Your Email</h1>

					<div className="verification-message">
						<p>
							We've sent password reset instructions to <strong>{email}</strong>.
						</p>
						<p>Check your email and follow the link to reset your password. The link will expire in 1 hour.</p>
						<p className="verification-note">If you don't see the email, check your spam folder or make sure you entered the correct email address.</p>
					</div>

					<div className="auth-actions">
						<Link to="/login" className="btn btn-primary">
							Back to Login
						</Link>
					</div>
				</div>
			</div>
		);
	}

	// Otherwise, show the form
	return (
		<div className="auth-page">
			<div className="auth-container">
				<h1>Reset Your Password</h1>
				<p className="auth-subtitle">Enter your email address and we'll send you a link to reset your password</p>

				{error && <div className="error-message">{error}</div>}

				<form onSubmit={handleSubmit} className="auth-form">
					<div className="form-group">
						<label htmlFor="email">Email Address</label>
						<input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" disabled={isLoading} required />
					</div>

					<div className="auth-actions">
						<button type="submit" className="btn btn-primary" disabled={isLoading}>
							{isLoading ? "Sending..." : "Send Reset Link"}
						</button>
					</div>
				</form>

				<div className="auth-links">
					<Link to="/login">Back to Login</Link>
				</div>
			</div>
		</div>
	);
};

export default ForgotPasswordPage;
