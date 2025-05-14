import React from "react";

/**
 * Component to toggle notification active status
 */
const NotificationStatus = ({ isActive, onToggle }) => {
	return (
		<div className="preferences-section">
			<h3>Notification Status</h3>

			<label className="toggle-switch">
				<input type="checkbox" checked={isActive} onChange={onToggle} />
				<span className="toggle-slider"></span>
				<span className="toggle-label">{isActive ? "Notifications are enabled" : "Notifications are disabled"}</span>
			</label>
		</div>
	);
};

export default NotificationStatus;
