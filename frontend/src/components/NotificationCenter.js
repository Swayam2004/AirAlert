import React, { useState, useEffect } from "react";
import { fetchUserNotifications, markNotificationRead } from "../services/api";

/**
 * NotificationCenter component that displays user notifications
 * and provides options to manage notification preferences
 */
const NotificationCenter = ({ userId, onSettingsClick }) => {
	const [notifications, setNotifications] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [filter, setFilter] = useState("all"); // all, unread, pm25, pm10, etc.

	// Fetch notifications on component mount and when userId changes
	useEffect(() => {
		if (!userId) return;

		const loadNotifications = async () => {
			setLoading(true);
			try {
				const response = await fetchUserNotifications(userId);
				setNotifications(response.notifications || []);
				setError(null);
			} catch (err) {
				setError("Failed to load notifications. Please try again later.");
				console.error("Error loading notifications:", err);
			} finally {
				setLoading(false);
			}
		};

		loadNotifications();

		// Set up polling for new notifications
		const intervalId = setInterval(loadNotifications, 60000); // Check every minute

		return () => clearInterval(intervalId);
	}, [userId]);

	// Mark a notification as read
	const handleMarkAsRead = async (notificationId) => {
		try {
			await markNotificationRead(notificationId);

			// Update local state to reflect the change
			setNotifications(notifications.map((notification) => (notification.id === notificationId ? { ...notification, read_at: new Date().toISOString() } : notification)));
		} catch (err) {
			console.error("Error marking notification as read:", err);
		}
	};

	// Filter notifications based on current filter
	const filteredNotifications = notifications.filter((notification) => {
		if (filter === "all") return true;
		if (filter === "unread") return !notification.read_at;

		// Filter by pollutant
		return notification.alert && notification.alert.pollutant === filter;
	});

	// Get severity class for styling
	const getSeverityClass = (level) => {
		const classes = ["severity-good", "severity-moderate", "severity-sensitive", "severity-unhealthy", "severity-very-unhealthy", "severity-hazardous"];

		return classes[level] || classes[0];
	};

	// Format relative time (e.g., "2 hours ago")
	const formatRelativeTime = (timestamp) => {
		if (!timestamp) return "Never";

		const now = new Date();
		const time = new Date(timestamp);
		const diffMs = now - time;

		// Convert to appropriate unit
		const diffSeconds = Math.floor(diffMs / 1000);
		if (diffSeconds < 60) return "Just now";

		const diffMinutes = Math.floor(diffSeconds / 60);
		if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;

		const diffHours = Math.floor(diffMinutes / 60);
		if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;

		const diffDays = Math.floor(diffHours / 24);
		if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;

		// For older notifications, just show the date
		return time.toLocaleDateString();
	};

	// Get icon for notification channel
	const getChannelIcon = (channel) => {
		switch (channel) {
			case "email":
				return "✉️";
			case "sms":
				return "📱";
			case "web":
				return "🔔";
			default:
				return "📢";
		}
	};

	return (
		<div className="notification-center">
			<div className="notification-header">
				<h2>Notifications</h2>
				<div className="notification-actions">
					<button className="settings-button" onClick={onSettingsClick} title="Notification Settings">
						⚙️ Settings
					</button>
				</div>
			</div>

			<div className="notification-filters">
				<button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>
					All
				</button>
				<button className={filter === "unread" ? "active" : ""} onClick={() => setFilter("unread")}>
					Unread
				</button>
				<button className={filter === "pm25" ? "active" : ""} onClick={() => setFilter("pm25")}>
					PM2.5
				</button>
				<button className={filter === "pm10" ? "active" : ""} onClick={() => setFilter("pm10")}>
					PM10
				</button>
				<button className={filter === "aqi" ? "active" : ""} onClick={() => setFilter("aqi")}>
					AQI
				</button>
			</div>

			{loading ? (
				<div className="notification-loading">Loading notifications...</div>
			) : error ? (
				<div className="notification-error">{error}</div>
			) : (
				<div className="notification-list">
					{filteredNotifications.length === 0 ? (
						<div className="no-notifications">No {filter !== "all" ? filter : ""} notifications to display</div>
					) : (
						filteredNotifications.map((notification) => {
							const isUnread = !notification.read_at;
							const severityClass = notification.alert ? getSeverityClass(notification.alert.severity_level) : "";

							return (
								<div key={notification.id} className={`notification-item ${isUnread ? "unread" : ""} ${severityClass}`}>
									<div className="notification-badge">{getChannelIcon(notification.delivery_channel)}</div>

									<div className="notification-content">
										<div className="notification-message">{notification.message}</div>

										{notification.alert && (
											<div className="notification-details">
												<span className="notification-pollutant">{notification.alert.pollutant.toUpperCase()}</span>
												<span className="notification-value">
													Current: {notification.alert.current_value.toFixed(2)}
													(Threshold: {notification.alert.threshold_value.toFixed(2)})
												</span>
											</div>
										)}

										<div className="notification-meta">
											<span className="notification-time">{formatRelativeTime(notification.sent_at)}</span>

											{isUnread && (
												<button className="mark-read-button" onClick={() => handleMarkAsRead(notification.id)}>
													Mark as read
												</button>
											)}
										</div>
									</div>
								</div>
							);
						})
					)}
				</div>
			)}

			<style jsx>{`
				.notification-center {
					background-color: #fff;
					border-radius: 8px;
					box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
					width: 100%;
					max-width: 600px;
					margin: 0 auto;
				}

				.notification-header {
					display: flex;
					justify-content: space-between;
					align-items: center;
					padding: 15px 20px;
					border-bottom: 1px solid #eee;
				}

				.notification-header h2 {
					margin: 0;
					font-size: 1.2rem;
				}

				.notification-filters {
					display: flex;
					padding: 10px;
					border-bottom: 1px solid #eee;
					overflow-x: auto;
				}

				.notification-filters button {
					background: none;
					border: none;
					padding: 5px 10px;
					margin-right: 5px;
					border-radius: 15px;
					cursor: pointer;
					white-space: nowrap;
				}

				.notification-filters button.active {
					background-color: #e6f7ff;
					color: #1890ff;
					font-weight: bold;
				}

				.notification-list {
					max-height: 400px;
					overflow-y: auto;
					padding: 0;
				}

				.notification-item {
					display: flex;
					padding: 12px 20px;
					border-bottom: 1px solid #f0f0f0;
					position: relative;
				}

				.notification-item.unread {
					background-color: #f6f8fa;
				}

				.notification-item.unread::before {
					content: "";
					position: absolute;
					left: 0;
					top: 0;
					bottom: 0;
					width: 4px;
					background-color: #1890ff;
				}

				.notification-badge {
					margin-right: 12px;
					font-size: 1.2rem;
					display: flex;
					align-items: center;
				}

				.notification-content {
					flex-grow: 1;
				}

				.notification-message {
					font-size: 0.9rem;
					margin-bottom: 5px;
					color: #333;
				}

				.notification-details {
					font-size: 0.8rem;
					margin-bottom: 5px;
				}

				.notification-pollutant {
					font-weight: bold;
					margin-right: 10px;
				}

				.notification-meta {
					display: flex;
					justify-content: space-between;
					align-items: center;
					font-size: 0.75rem;
					color: #888;
				}

				.mark-read-button {
					background: none;
					border: none;
					color: #1890ff;
					cursor: pointer;
					font-size: 0.75rem;
				}

				.no-notifications {
					padding: 20px;
					text-align: center;
					color: #888;
				}

				.notification-loading,
				.notification-error {
					padding: 20px;
					text-align: center;
				}

				.notification-error {
					color: #f5222d;
				}

				/* Severity classes for color coding */
				.severity-good {
					border-left: 4px solid #00e400;
				}
				.severity-moderate {
					border-left: 4px solid #ffff00;
				}
				.severity-sensitive {
					border-left: 4px solid #ff7e00;
				}
				.severity-unhealthy {
					border-left: 4px solid #ff0000;
				}
				.severity-very-unhealthy {
					border-left: 4px solid #8f3f97;
				}
				.severity-hazardous {
					border-left: 4px solid #7e0023;
				}
			`}</style>
		</div>
	);
};

export default NotificationCenter;
