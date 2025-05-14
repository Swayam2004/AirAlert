import React, { useState, useEffect } from "react";
import API from "../services/api";

/**
 * NotificationCenter component that displays user notifications
 * and provides options to manage notification preferences
 */
const NotificationCenter = ({ userId, onSettingsClick }) => {
	const [notifications, setNotifications] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [filter, setFilter] = useState("all"); // all, unread, pm25, pm10, etc.
	const [isOpen, setIsOpen] = useState(false);
	const [unreadCount, setUnreadCount] = useState(0);

	// Fetch notifications on component mount and when userId changes
	useEffect(() => {
		if (!userId) return;

		const loadNotifications = async () => {
			setLoading(true);
			try {
				const response = await API.getUserNotifications(userId);
				const notificationData = response.data.notifications || [];
				setNotifications(notificationData);

				// Count unread notifications
				setUnreadCount(notificationData.filter((n) => !n.read_at).length);

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
			await API.markNotificationRead(notificationId);

			// Update local state to reflect the change
			setNotifications(
				notifications.map((notification) => {
					if (notification.id === notificationId) {
						const updated = { ...notification, read_at: new Date().toISOString() };
						return updated;
					}
					return notification;
				})
			);

			// Update unread count
			setUnreadCount((prev) => Math.max(0, prev - 1));
		} catch (err) {
			console.error("Error marking notification as read:", err);
		}
	};

	// Mark all notifications as read
	const handleMarkAllAsRead = async () => {
		try {
			if (!userId || notifications.length === 0) return;

			// Get list of unread notification IDs
			const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);

			if (unreadIds.length === 0) return;

			// Mark each as read
			await Promise.all(unreadIds.map((id) => API.markNotificationRead(id)));

			// Update all notifications in state
			setNotifications(
				notifications.map((n) => ({
					...n,
					read_at: n.read_at || new Date().toISOString(),
				}))
			);

			// Reset unread count
			setUnreadCount(0);
		} catch (err) {
			console.error("Error marking all notifications as read:", err);
		}
	};

	// Filter notifications based on current filter
	const filteredNotifications = notifications.filter((notification) => {
		if (filter === "all") return true;
		if (filter === "unread") return !notification.read_at;

		// Filter by pollutant
		return notification.alert && notification.alert.pollutant === filter;
	});

	// Group notifications by day
	const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
		const date = new Date(notification.sent_at).toLocaleDateString();
		if (!groups[date]) {
			groups[date] = [];
		}
		groups[date].push(notification);
		return groups;
	}, {});

	// Get severity class for styling
	const getSeverityClass = (level) => {
		const classes = ["severity-good", "severity-moderate", "severity-sensitive", "severity-unhealthy", "severity-very-unhealthy", "severity-hazardous"];

		// Map severity level (0-5) to corresponding class
		if (level >= 0 && level <= 5) {
			return classes[level];
		}

		// Default class if level is not in expected range
		return "severity-moderate";
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

	// Get pollutant icon
	const getPollutantIcon = (pollutant) => {
		switch (pollutant) {
			case "pm25":
				return "🔬";
			case "pm10":
				return "💨";
			case "o3":
				return "🌫️";
			case "no2":
				return "🏭";
			case "so2":
				return "⚠️";
			case "co":
				return "🚗";
			case "aqi":
				return "📊";
			default:
				return "🌡️";
		}
	};

	// Toggle notification center visibility
	const toggleNotificationCenter = () => {
		setIsOpen((prev) => !prev);
	};

	return (
		<div className="notification-center-container">
			{/* Notification Bell Icon */}
			<button className="notification-bell" onClick={toggleNotificationCenter} aria-label="Notifications">
				<div className="bell-icon">🔔</div>
				{unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
			</button>

			{isOpen && (
				<div className="notification-center">
					<div className="notification-header">
						<h2>Notifications</h2>
						<div className="notification-actions">
							<button onClick={handleMarkAllAsRead} className="action-button" disabled={unreadCount === 0}>
								Mark all as read
							</button>
							<button className="settings-button action-button" onClick={onSettingsClick} title="Notification Settings">
								<span className="settings-icon">⚙️</span>
							</button>
							<button className="close-button" onClick={toggleNotificationCenter}>
								&times;
							</button>
						</div>
					</div>

					<div className="notification-filters">
						<button className={`filter-button ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
							All
						</button>
						<button className={`filter-button ${filter === "unread" ? "active" : ""}`} onClick={() => setFilter("unread")}>
							Unread
						</button>
						<button className={`filter-button ${filter === "pm25" ? "active" : ""}`} onClick={() => setFilter("pm25")}>
							PM2.5
						</button>
						<button className={`filter-button ${filter === "pm10" ? "active" : ""}`} onClick={() => setFilter("pm10")}>
							PM10
						</button>
						<button className={`filter-button ${filter === "aqi" ? "active" : ""}`} onClick={() => setFilter("aqi")}>
							AQI
						</button>
						<button className={`filter-button ${filter === "o3" ? "active" : ""}`} onClick={() => setFilter("o3")}>
							Ozone
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
								Object.keys(groupedNotifications).map((date) => (
									<div key={date} className="notification-group">
										<div className="notification-date">{date}</div>

										{groupedNotifications[date].map((notification) => {
											const isUnread = !notification.read_at;
											const severityClass = notification.alert ? getSeverityClass(notification.alert.severity_level) : "";

											return (
												<div key={notification.id} className={`notification-item ${isUnread ? "unread" : ""} ${severityClass}`}>
													<div className="notification-badge">{notification.alert ? getPollutantIcon(notification.alert.pollutant) : getChannelIcon(notification.delivery_channel)}</div>

													<div className="notification-content">
														<div className="notification-message">{notification.message}</div>

														{notification.alert && (
															<div className="notification-details">
																<span className="notification-pollutant">{notification.alert.pollutant.toUpperCase()}</span>
																<span className="notification-value">
																	Current: {notification.alert.current_value.toFixed(2)}
																	&nbsp;(Threshold: {notification.alert.threshold_value.toFixed(2)})
																</span>
															</div>
														)}

														<div className="notification-meta">
															<div className="notification-info">
																<span className="notification-time">{formatRelativeTime(notification.sent_at)}</span>
																<span className="notification-channel">{getChannelIcon(notification.delivery_channel)}</span>
															</div>

															{isUnread && (
																<button className="mark-read-button" onClick={() => handleMarkAsRead(notification.id)}>
																	Mark as read
																</button>
															)}
														</div>
													</div>
												</div>
											);
										})}
									</div>
								))
							)}
						</div>
					)}
				</div>
			)}

			<style jsx>{`
				.notification-center-container {
					position: relative;
				}

				.notification-bell {
					background: none;
					border: none;
					padding: 0.5rem;
					cursor: pointer;
					position: relative;
					color: var(--text-primary);
					display: flex;
					align-items: center;
					justify-content: center;
				}

				.bell-icon {
					font-size: 1.5rem;
				}

				.notification-count {
					position: absolute;
					top: 0;
					right: 0;
					background-color: var(--error-500);
					color: white;
					border-radius: var(--radius-full);
					font-size: 0.7rem;
					min-width: 18px;
					height: 18px;
					display: flex;
					align-items: center;
					justify-content: center;
					font-weight: var(--font-weight-bold);
				}

				.notification-center {
					position: absolute;
					right: 0;
					width: 380px;
					max-height: 500px;
					display: flex;
					flex-direction: column;
					background-color: var(--bg-secondary);
					border-radius: var(--radius-md);
					box-shadow: var(--elevation-3);
					z-index: var(--z-index-dropdown);
					overflow: hidden;
				}

				.notification-header {
					display: flex;
					justify-content: space-between;
					align-items: center;
					padding: var(--space-3) var(--space-4);
					border-bottom: 1px solid var(--neutral-200);
				}

				.notification-header h2 {
					margin: 0;
					font-size: var(--font-size-lg);
				}

				.notification-actions {
					display: flex;
					align-items: center;
					gap: var(--space-2);
				}

				.action-button {
					background: none;
					border: none;
					color: var(--primary-600);
					padding: var(--space-1) var(--space-2);
					font-size: var(--font-size-sm);
					cursor: pointer;
					border-radius: var(--radius-md);
					transition: background-color var(--transition-fast) var(--easing-standard);
				}

				.action-button:hover:not(:disabled) {
					background-color: var(--primary-50);
					box-shadow: none;
				}

				.action-button:disabled {
					color: var(--neutral-400);
					background: none;
					cursor: not-allowed;
				}

				.settings-icon {
					font-size: var(--font-size-md);
				}

				.close-button {
					background: none;
					border: none;
					color: var(--neutral-600);
					font-size: 1.5rem;
					line-height: 1;
					padding: 0 var(--space-2);
					cursor: pointer;
					margin-left: var(--space-2);
				}

				.close-button:hover {
					color: var(--neutral-900);
					background: none;
					box-shadow: none;
				}

				.notification-filters {
					display: flex;
					padding: var(--space-2) var(--space-4);
					border-bottom: 1px solid var(--neutral-200);
					overflow-x: auto;
					gap: var(--space-2);
					background-color: var(--neutral-50);
				}

				.filter-button {
					background: none;
					border: none;
					padding: var(--space-1) var(--space-2);
					border-radius: var(--radius-full);
					cursor: pointer;
					white-space: nowrap;
					font-size: var(--font-size-sm);
					color: var(--neutral-700);
					transition: all var(--transition-fast) var(--easing-standard);
				}

				.filter-button.active {
					background-color: var(--primary-100);
					color: var(--primary-900);
					font-weight: var(--font-weight-medium);
				}

				.filter-button:hover:not(.active) {
					background-color: var(--neutral-200);
					box-shadow: none;
				}

				.notification-list {
					flex: 1;
					overflow-y: auto;
					padding: 0;
					max-height: 400px;
				}

				.notification-group {
					margin-bottom: var(--space-2);
				}

				.notification-date {
					padding: var(--space-2) var(--space-4);
					font-size: var(--font-size-sm);
					font-weight: var(--font-weight-medium);
					color: var(--neutral-600);
					background-color: var(--neutral-100);
					position: sticky;
					top: 0;
					z-index: 1;
				}

				.notification-item {
					display: flex;
					padding: var(--space-3) var(--space-4);
					border-bottom: 1px solid var(--neutral-200);
					position: relative;
					transition: background-color var(--transition-fast) var(--easing-standard);
				}

				.notification-item:last-child {
					border-bottom: none;
				}

				.notification-item:hover {
					background-color: var(--neutral-50);
				}

				.notification-item.unread {
					background-color: var(--primary-50);
				}

				.notification-item.unread:hover {
					background-color: var(--primary-100);
				}

				.notification-badge {
					margin-right: var(--space-3);
					font-size: var(--font-size-xl);
					display: flex;
					align-items: flex-start;
				}

				.notification-content {
					flex-grow: 1;
					display: flex;
					flex-direction: column;
					gap: var(--space-1);
				}

				.notification-message {
					font-size: var(--font-size-sm);
					color: var(--text-primary);
					line-height: var(--line-height-snug);
					display: -webkit-box;
					-webkit-line-clamp: 2;
					-webkit-box-orient: vertical;
					overflow: hidden;
				}

				.notification-details {
					font-size: var(--font-size-sm);
					margin-bottom: var(--space-1);
					display: flex;
					flex-direction: column;
					gap: var(--space-1);
				}

				.notification-pollutant {
					font-weight: var(--font-weight-medium);
					display: inline-block;
					margin-right: var(--space-2);
					color: var(--primary-700);
				}

				.notification-value {
					font-family: var(--font-family-mono);
					font-size: var(--font-size-xs);
					color: var(--neutral-700);
				}

				.notification-meta {
					display: flex;
					justify-content: space-between;
					align-items: center;
					font-size: var(--font-size-xs);
					color: var(--neutral-600);
					margin-top: var(--space-1);
				}

				.notification-info {
					display: flex;
					align-items: center;
					gap: var(--space-2);
				}

				.notification-time {
					font-style: italic;
				}

				.notification-channel {
					opacity: 0.7;
					font-size: var(--font-size-sm);
				}

				.mark-read-button {
					background: none;
					border: none;
					color: var(--primary-600);
					cursor: pointer;
					font-size: var(--font-size-xs);
					padding: var(--space-1) var(--space-2);
					border-radius: var(--radius-sm);
				}

				.mark-read-button:hover {
					background-color: var(--primary-100);
					color: var(--primary-900);
					box-shadow: none;
				}

				.no-notifications {
					padding: var(--space-6);
					text-align: center;
					color: var(--neutral-600);
					font-style: italic;
				}

				.notification-loading,
				.notification-error {
					padding: var(--space-6);
					text-align: center;
				}

				.notification-error {
					color: var(--error-500);
				}

				/* Severity classes for color coding */
				.severity-good {
					border-left: 4px solid var(--aqi-good);
				}

				.severity-moderate {
					border-left: 4px solid var(--aqi-moderate);
				}

				.severity-sensitive {
					border-left: 4px solid var(--aqi-sensitive);
				}

				.severity-unhealthy {
					border-left: 4px solid var(--aqi-unhealthy);
				}

				.severity-very-unhealthy {
					border-left: 4px solid var(--aqi-very-unhealthy);
				}

				.severity-hazardous {
					border-left: 4px solid var(--aqi-hazardous);
				}

				/* Responsive adjustments */
				@media (max-width: 480px) {
					.notification-center {
						position: fixed;
						top: 60px;
						right: 0;
						left: 0;
						width: 100%;
						height: calc(100vh - 60px);
						max-height: none;
						border-radius: 0;
					}

					.notification-list {
						max-height: none;
					}
				}
			`}</style>
		</div>
	);
};

export default NotificationCenter;
