import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const ResetPasswordPage = () => {
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [validToken, setValidToken] = useState(true);
	const [errors, setErrors] = useState({});
	const [isLoading, setIsLoading] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);

	const { token } = useParams();
	const { resetPassword } = useAuth();
	const navigate = useNavigate();

	// Validate the token format - basic check
	useEffect(() => {
		if (!token || token.length < 16) {
			setValidToken(false);
		}
	}, [token]);

	const validatePassword = () => {
		const newErrors = {};

		// Validate password
		if (!password) {
			newErrors.password = "Password is required";
		} else if (password.length < 8) {
			newErrors.password = "Password must be at least 8 characters";
		} else if (!/[A-Z]/.test(password)) {
			newErrors.password = "Password must contain an uppercase letter";
		} else if (!/[a-z]/.test(password)) {
			newErrors.password = "Password must contain a lowercase letter";
		} else if (!/[0-9]/.test(password)) {
			newErrors.password = "Password must contain a number";
		} else if (!/[^A-Za-z0-9]/.test(password)) {
			newErrors.password = "Password must contain a special character";
		}

		// Validate password confirmation
		if (password !== confirmPassword) {
			newErrors.confirmPassword = "Passwords do not match";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!validatePassword()) {
			return;
		}

		setIsLoading(true);

		try {
			const result = await resetPassword(token, password, confirmPassword);

			if (result.success) {
				setIsSuccess(true);

				// Redirect to login after a delay
				setTimeout(() => {
					navigate("/login");
				}, 3000);
			} else {
				setErrors({
					api: result.error || "Failed to reset password. Please try again.",
				});
			}
		} catch (err) {
			setErrors({
				api: "An unexpected error occurred. Please try again.",
			});
			console.error("Password reset error:", err);
		} finally {
			setIsLoading(false);
		}
	};

	// Show error if token is invalid
	if (!validToken) {
		return (
			<div className="auth-page">
				<div className="auth-container">
					<div className="verification-icon error">
						<i className="fas fa-exclamation-circle"></i>
					</div>

					<h1>Invalid Reset Link</h1>

					<div className="verification-message">
						<p>The password reset link is invalid or has expired.</p>
						<p>Please request a new password reset link.</p>
					</div>

					<div className="auth-actions">
						<Link to="/forgot-password" className="btn btn-primary">
							Request New Reset Link
						</Link>
					</div>
				</div>
			</div>
		);
	}

	// Show success message
	if (isSuccess) {
		return (
			<div className="auth-page">
				<div className="auth-container">
					<div className="verification-icon success">
						<i className="fas fa-check-circle"></i>
					</div>

					<h1>Password Reset Successful</h1>

					<div className="verification-message">
						<p>Your password has been reset successfully.</p>
						<p>You will be redirected to the login page shortly.</p>
					</div>

					<div className="auth-actions">
						<Link to="/login" className="btn btn-primary">
							Go to Login
						</Link>
					</div>
				</div>
			</div>
		);
	}

	// Show the reset password form
	return (
		<div className="auth-page">
			<div className="auth-container">
				<h1>Reset Your Password</h1>
				<p className="auth-subtitle">Please enter your new password below</p>

				{errors.api && <div className="error-message">{errors.api}</div>}

				<form onSubmit={handleSubmit} className="auth-form">
					<div className="form-group">
						<label htmlFor="password">New Password</label>
						<input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter new password" disabled={isLoading} required />
						{errors.password && <div className="field-error">{errors.password}</div>}
						<div className="password-requirements">Password must be at least 8 characters with uppercase, lowercase, number, and special character.</div>
					</div>

					<div className="form-group">
						<label htmlFor="confirmPassword">Confirm New Password</label>
						<input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" disabled={isLoading} required />
						{errors.confirmPassword && <div className="field-error">{errors.confirmPassword}</div>}
					</div>

					<div className="auth-actions">
						<button type="submit" className="btn btn-primary" disabled={isLoading}>
							{isLoading ? "Resetting..." : "Reset Password"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default ResetPasswordPage;
