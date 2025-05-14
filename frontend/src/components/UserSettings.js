import React, { useState, useEffect } from "react";
import API from "../services/api";
import AuthService from "../services/auth";
import "../styles/index.css";

function UserSettings() {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [preferences, setPreferences] = useState({
		notification_channels: {
			email: false,
			sms: false,
			app: true,
		},
		language: "en",
		sensitivity_level: 3,
	});

	useEffect(() => {
		const fetchUserData = async () => {
			try {
				const currentUser = AuthService.getCurrentUser();
				if (!currentUser) {
					setError("You must be logged in to access user settings");
					setLoading(false);
					return;
				}

				setUser(currentUser);

				// Fetch user preferences
				const preferencesResponse = await API.fetchUserPreferences(currentUser.id);
				setPreferences(preferencesResponse.data);
				setLoading(false);
			} catch (err) {
				setError(err.message || "Failed to load user settings");
				setLoading(false);
			}
		};

		fetchUserData();
	}, []);

	const handlePreferenceChange = (section, field, value) => {
		setPreferences((prev) => {
			if (section) {
				return {
					...prev,
					[section]: {
						...prev[section],
						[field]: value,
					},
				};
			} else {
				return {
					...prev,
					[field]: value,
				};
			}
		});
	};

	const handleSavePreferences = async () => {
		try {
			if (!user) return;

			await API.updateUserPreferences(user.id, preferences);
			alert("Preferences saved successfully!");
		} catch (err) {
			alert("Failed to save preferences: " + (err.response?.data?.detail || err.message));
		}
	};

	if (loading) return <div className="loading">Loading user settings...</div>;
	if (error) return <div className="error">{error}</div>;
	if (!user) return <div className="error">User not found</div>;

	return (
		<div className="settings-container">
			<h2>User Settings</h2>

			<div className="settings-section">
				<h3>Notification Preferences</h3>
				<div className="checkbox-group">
					<label>
						<input type="checkbox" checked={preferences.notification_channels.email} onChange={(e) => handlePreferenceChange("notification_channels", "email", e.target.checked)} />
						Email Notifications
					</label>
				</div>
				<div className="checkbox-group">
					<label>
						<input type="checkbox" checked={preferences.notification_channels.sms} onChange={(e) => handlePreferenceChange("notification_channels", "sms", e.target.checked)} />
						SMS Notifications
					</label>
				</div>
				<div className="checkbox-group">
					<label>
						<input type="checkbox" checked={preferences.notification_channels.app} onChange={(e) => handlePreferenceChange("notification_channels", "app", e.target.checked)} />
						In-App Notifications
					</label>
				</div>
			</div>

			<div className="settings-section">
				<h3>Display Preferences</h3>
				<div className="form-group">
					<label htmlFor="language">Language</label>
					<select id="language" value={preferences.language} onChange={(e) => handlePreferenceChange(null, "language", e.target.value)}>
						<option value="en">English</option>
						<option value="es">Spanish</option>
						<option value="fr">French</option>
						<option value="hi">Hindi</option>
					</select>
				</div>

				<div className="form-group">
					<label htmlFor="sensitivity">Sensitivity Level (1-5)</label>
					<input type="range" id="sensitivity" min="1" max="5" value={preferences.sensitivity_level} onChange={(e) => handlePreferenceChange(null, "sensitivity_level", parseInt(e.target.value))} />
					<span>{preferences.sensitivity_level}</span>
				</div>
			</div>

			<div className="button-row">
				<button className="primary-button" onClick={handleSavePreferences}>
					Save Preferences
				</button>
			</div>
		</div>
	);
}

export default UserSettings;
