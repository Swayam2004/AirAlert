import React from "react";
import { useLocation, Link } from "react-router-dom";

const EmailVerificationSentPage = () => {
	const location = useLocation();
	const email = location.state?.email || "your email address";

	return (
		<div className="auth-page">
			<div className="auth-container">
				<div className="verification-icon">
					<i className="fas fa-envelope"></i>
				</div>

				<h1>Check Your Email</h1>

				<div className="verification-message">
					<p>
						We've sent a verification link to <strong>{email}</strong>.
					</p>
					<p>Click the link in the email to verify your account. The link will expire in 24 hours.</p>
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
};

export default EmailVerificationSentPage;
