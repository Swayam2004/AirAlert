import React from "react";
import { Link } from "react-router-dom";

const UnauthorizedPage = () => {
	return (
		<div className="unauthorized-page">
			<div className="unauthorized-container">
				<div className="unauthorized-icon">
					<i className="fas fa-lock"></i>
				</div>

				<h1>Access Denied</h1>

				<div className="unauthorized-message">
					<p>You don't have permission to access this page.</p>
					<p>If you believe this is an error, please contact an administrator.</p>
				</div>

				<div className="unauthorized-actions">
					<Link to="/dashboard" className="btn btn-primary">
						Go to Dashboard
					</Link>
				</div>
			</div>
		</div>
	);
};

export default UnauthorizedPage;
