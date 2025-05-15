import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const EmailVerificationPage = () => {
	const [status, setStatus] = useState("verifying"); // verifying, success, error
	const [message, setMessage] = useState("Verifying your email...");
	const { token } = useParams();
	const { verifyEmail } = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		const verify = async () => {
			try {
				// Verify token with API
				const result = await verifyEmail(token);

				if (result.success) {
					setStatus("success");
					setMessage("Your email has been successfully verified!");

					// Redirect to login after short delay
					setTimeout(() => {
						navigate("/login");
					}, 3000);
				} else {
					setStatus("error");
					setMessage(result.error || "Verification failed. Please try again.");
				}
			} catch (err) {
				setStatus("error");
				setMessage("An error occurred during verification. The link may have expired.");
				console.error("Email verification error:", err);
			}
		};

		if (token) {
			verify();
		} else {
			setStatus("error");
			setMessage("Invalid verification link. No token provided.");
		}
	}, [token, verifyEmail, navigate]);

	return (
		<div className="auth-page">
			<div className="auth-container">
				{status === "verifying" && (
					<div className="verification-icon loading">
						<i className="fas fa-spinner fa-spin"></i>
					</div>
				)}

				{status === "success" && (
					<div className="verification-icon success">
						<i className="fas fa-check-circle"></i>
					</div>
				)}

				{status === "error" && (
					<div className="verification-icon error">
						<i className="fas fa-exclamation-circle"></i>
					</div>
				)}

				<h1>
					{status === "verifying" && "Verifying Email"}
					{status === "success" && "Email Verified"}
					{status === "error" && "Verification Failed"}
				</h1>

				<div className="verification-message">
					<p>{message}</p>

					{status === "success" && <p>You will be redirected to the login page shortly.</p>}
				</div>

				<div className="auth-actions">
					{status === "success" && (
						<Link to="/login" className="btn btn-primary">
							Go to Login
						</Link>
					)}

					{status === "error" && (
						<div className="auth-links">
							<Link to="/register">Register again</Link>
							<div className="auth-separator">|</div>
							<Link to="/login">Back to Login</Link>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default EmailVerificationPage;
