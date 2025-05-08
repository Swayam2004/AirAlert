import React, { useState, useEffect } from "react";
import API from "../services/api";

function UserProfile() {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [isLogin, setIsLogin] = useState(true);
	const [notifications, setNotifications] = useState([]);

	// Form states
	const [formData, setFormData] = useState({
		username: "",
		password: "",
		email: "",
		name: "",
	});

	// User preferences
	const [preferences, setPreferences] = useState({
		location: "",
		sensitivity: 3,
		notifications: {
			email: true,
			sms: false,
			web: true,
		},
	});

	useEffect(() => {
		const fetchUserData = async () => {
			try {
				setLoading(true);
				const response = await API.getCurrentUser();
				setUser(response.data);

				// If the user is logged in, fetch notifications and preferences
				if (response.data && response.data.id) {
					// Fetch notifications
					const notifResponse = await API.getUserNotifications(response.data.id);
					if (notifResponse.data && notifResponse.data.notifications) {
						setNotifications(notifResponse.data.notifications);
					}

					// Set preferences based on user data if available
					if (response.data.preferences) {
						setPreferences(response.data.preferences);
					}
				}

				setError(null);
			} catch (err) {
				console.log("Not logged in or error fetching user data:", err);
				setUser(null);
			} finally {
				setLoading(false);
			}
		};

		fetchUserData();
	}, []);

	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handlePreferenceChange = (e) => {
		const { name, value } = e.target;
		setPreferences((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handleCheckboxChange = (e) => {
		const { name, checked } = e.target;
		setPreferences((prev) => ({
			...prev,
			notifications: {
				...prev.notifications,
				[name]: checked,
			},
		}));
	};

	const handleAuth = async (e) => {
		e.preventDefault();
		setLoading(true);

		try {
			let response;

			if (isLogin) {
				// Login
				response = await API.login({
					username: formData.username,
					password: formData.password,
				});

				// Set the token in localStorage or a context
				if (response.data && response.data.access_token) {
					localStorage.setItem("token", response.data.access_token);

					// Fetch user data
					const userResponse = await API.getCurrentUser();
					setUser(userResponse.data);
				}
			} else {
				// Register
				response = await API.registerUser({
					username: formData.username,
					password: formData.password,
					email: formData.email,
					name: formData.name,
				});

				// Switch to login mode after successful registration
				if (response.status === 201) {
					setIsLogin(true);
					alert("Registration successful! Please log in.");
					setFormData({
						...formData,
						password: "",
					});
				}
			}

			setError(null);
		} catch (err) {
			console.error("Authentication error:", err);
			setError(isLogin ? "Login failed. Please check your credentials." : "Registration failed. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleLogout = () => {
		localStorage.removeItem("token");
		setUser(null);
		setNotifications([]);
	};

	const savePreferences = async () => {
		if (!user) return;

		try {
			await API.saveUserPreferences(preferences);
			alert("Preferences saved successfully!");
		} catch (err) {
			console.error("Error saving preferences:", err);
			alert("Failed to save preferences. Please try again.");
		}
	};

	const markNotificationRead = async (notificationId) => {
		if (!user) return;

		try {
			// Add API call to mark notification as read when implemented
			// For now, update the UI optimistically
			setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n)));
		} catch (err) {
			console.error("Error marking notification as read:", err);
		}
	};

	// If loading user data
	if (loading && !user) return <div className="loading">Loading user data...</div>;

	// If the user is logged in, show their profile information
	if (user) {
		return (
			<section className="user-profile">
				<div className="profile-header">
					<h2>Welcome, {user.name || user.username}</h2>
					<button onClick={handleLogout} className="logout-button">
						Logout
					</button>
				</div>

				<div className="profile-content">
					<div className="profile-info">
						<h3>Your Profile</h3>
						<p>
							<strong>Username:</strong> {user.username}
						</p>
						<p>
							<strong>Email:</strong> {user.email}
						</p>
						{user.location && (
							<p>
								<strong>Location:</strong> {user.location}
							</p>
						)}
					</div>

					<div className="user-preferences">
						<h3>Notification Preferences</h3>
						<form>
							<div className="form-group">
								<label>
									Location:
									<input type="text" name="location" value={preferences.location} onChange={handlePreferenceChange} placeholder="City, State or Coordinates" />
								</label>
							</div>

							<div className="form-group">
								<label>
									Sensitivity Level:
									<span className="sensitivity-value">{preferences.sensitivity}</span>
									<input type="range" name="sensitivity" min="1" max="5" value={preferences.sensitivity} onChange={handlePreferenceChange} />
									<div className="sensitivity-labels">
										<span>Low</span>
										<span>High</span>
									</div>
								</label>
							</div>

							<div className="form-group">
								<fieldset>
									<legend>Notification Channels:</legend>
									<label>
										<input type="checkbox" name="email" checked={preferences.notifications.email} onChange={handleCheckboxChange} />
										Email
									</label>

									<label>
										<input type="checkbox" name="sms" checked={preferences.notifications.sms} onChange={handleCheckboxChange} />
										SMS
									</label>

									<label>
										<input type="checkbox" name="web" checked={preferences.notifications.web} onChange={handleCheckboxChange} />
										Web
									</label>
								</fieldset>
							</div>

							<button type="button" onClick={savePreferences} className="save-preferences-button">
								Save Preferences
							</button>
						</form>
					</div>
				</div>

				<div className="notifications">
					<h3>Your Notifications</h3>
					{notifications.length === 0 ? (
						<p className="no-notifications">No notifications to display.</p>
					) : (
						<div className="notifications-list">
							{notifications.map((notification) => (
								<div key={notification.id} className={`notification-item ${notification.read_at ? "read" : "unread"}`} onClick={() => markNotificationRead(notification.id)}>
									<div className="notification-header">
										<span className="notification-time">{new Date(notification.sent_at).toLocaleString()}</span>
										{!notification.read_at && <span className="unread-badge">New</span>}
									</div>
									<div className="notification-body">
										<p>{notification.message}</p>
									</div>
									{notification.alert && (
										<div className="notification-alert">
											<p>
												<strong>Alert Details:</strong> {notification.alert.pollutant.toUpperCase()} - Level {notification.alert.severity_level}
											</p>
											<p>
												Current Value: {notification.alert.current_value} (Threshold: {notification.alert.threshold_value})
											</p>
										</div>
									)}
								</div>
							))}
						</div>
					)}
				</div>
			</section>
		);
	}

	// If the user is not logged in, show login/register form
	return (
		<section className="auth-section">
			<h2>{isLogin ? "Login" : "Register"}</h2>

			{error && <div className="error-message">{error}</div>}

			<form onSubmit={handleAuth} className="auth-form">
				<div className="form-group">
					<label htmlFor="username">Username:</label>
					<input type="text" id="username" name="username" value={formData.username} onChange={handleInputChange} required />
				</div>

				<div className="form-group">
					<label htmlFor="password">Password:</label>
					<input type="password" id="password" name="password" value={formData.password} onChange={handleInputChange} required />
				</div>

				{!isLogin && (
					<>
						<div className="form-group">
							<label htmlFor="email">Email:</label>
							<input type="email" id="email" name="email" value={formData.email} onChange={handleInputChange} required />
						</div>

						<div className="form-group">
							<label htmlFor="name">Full Name:</label>
							<input type="text" id="name" name="name" value={formData.name} onChange={handleInputChange} />
						</div>
					</>
				)}

				<button type="submit" disabled={loading} className="auth-button">
					{loading ? "Processing..." : isLogin ? "Login" : "Register"}
				</button>

				<p className="toggle-auth-mode">
					{isLogin ? "Don't have an account? " : "Already have an account? "}
					<button type="button" onClick={() => setIsLogin(!isLogin)} className="toggle-button">
						{isLogin ? "Register" : "Login"}
					</button>
				</p>
			</form>
		</section>
	);
}

export default UserProfile;
