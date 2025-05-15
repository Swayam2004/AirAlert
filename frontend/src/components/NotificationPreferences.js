import React, { useState, useEffect } from "react";
import API from "../services/api";
import NotificationChannels from "./NotificationPreferences/NotificationChannels";
import SensitivitySettings from "./NotificationPreferences/SensitivitySettings";
import AlertSubscriptions from "./NotificationPreferences/AlertSubscriptions";
import HealthProfile from "./NotificationPreferences/HealthProfile";

/**
 * NotificationPreferences component for managing user notification settings
 * Allows users to choose notification channels, set pollutant thresholds,
 * and customize alert types
 */
const NotificationPreferences = ({ userId, onClose }) => {
	const [preferences, setPreferences] = useState({
		notification_channels: {
			email: false,
			sms: false,
			app: true,
		},
		sensitivity_level: 0,
		alert_subscriptions: [],
		is_active: true,
		health_profile: null,
	});

	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(null);
	const [successMessage, setSuccessMessage] = useState("");

	const sensitivityLevels = [
		{ value: 0, label: "Standard", description: "Receive alerts for unhealthy levels and above" },
		{ value: 1, label: "Sensitive", description: "Receive alerts at lower thresholds, suitable for sensitive individuals" },
		{ value: 2, label: "Highly Sensitive", description: "Receive alerts at lowest thresholds, for those with severe respiratory conditions" },
	];

	const pollutants = [
		{ id: "pm25", name: "PM2.5", unit: "μg/m³" },
		{ id: "pm10", name: "PM10", unit: "μg/m³" },
		{ id: "o3", name: "Ozone", unit: "ppb" },
		{ id: "no2", name: "NO2", unit: "ppb" },
		{ id: "so2", name: "SO2", unit: "ppb" },
		{ id: "co", name: "CO", unit: "ppm" },
		{ id: "aqi", name: "AQI", unit: "" },
	];

	const healthConditions = [
		{ id: "has_asthma", name: "Asthma" },
		{ id: "has_copd", name: "COPD" },
		{ id: "has_heart_disease", name: "Heart Disease" },
		{ id: "has_diabetes", name: "Diabetes" },
		{ id: "has_pregnancy", name: "Pregnancy" },
	];

	const ageCategories = [
		{ value: "child", label: "Child (0-12 years)" },
		{ value: "teen", label: "Teen (13-18 years)" },
		{ value: "adult", label: "Adult (19-64 years)" },
		{ value: "elderly", label: "Elderly (65+ years)" },
	];

	// Fetch user preferences on component mount
	useEffect(() => {
		if (!userId) return;

		const fetchPreferences = async () => {
			setLoading(true);
			try {
				const data = await API.fetchUserPreferences(userId);
				setPreferences(data);
				setError(null);
			} catch (err) {
				setError("Failed to load preferences. Please try again.");
				console.error("Error loading preferences:", err);
			} finally {
				setLoading(false);
			}
		};

		fetchPreferences();
	}, [userId]);

	// Handle channel toggle
	const handleChannelToggle = (channel) => {
		setPreferences((prev) => ({
			...prev,
			notification_channels: {
				...prev.notification_channels,
				[channel]: !prev.notification_channels[channel],
			},
		}));
	};

	// Handle sensitivity level change
	const handleSensitivityChange = (level) => {
		setPreferences((prev) => ({
			...prev,
			sensitivity_level: level,
		}));
	};

	// Handle toggle for active status
	const handleActiveToggle = () => {
		setPreferences((prev) => ({
			...prev,
			is_active: !prev.is_active,
		}));
	};

	// Handle subscription toggle for a pollutant
	const handleSubscriptionToggle = (pollutantId) => {
		const existingSubscription = preferences.alert_subscriptions.find((sub) => sub.alert_type === pollutantId);

		if (existingSubscription) {
			// Toggle active status of existing subscription
			setPreferences((prev) => ({
				...prev,
				alert_subscriptions: prev.alert_subscriptions.map((sub) => (sub.alert_type === pollutantId ? { ...sub, is_active: !sub.is_active } : sub)),
			}));
		} else {
			// Create new subscription
			setPreferences((prev) => ({
				...prev,
				alert_subscriptions: [
					...prev.alert_subscriptions,
					{
						alert_type: pollutantId,
						min_severity: 1, // Default to moderate severity
						is_active: true,
					},
				],
			}));
		}
	};

	// Handle change to minimum severity level for a subscription
	const handleMinSeverityChange = (pollutantId, severity) => {
		setPreferences((prev) => ({
			...prev,
			alert_subscriptions: prev.alert_subscriptions.map((sub) => (sub.alert_type === pollutantId ? { ...sub, min_severity: parseInt(severity) } : sub)),
		}));
	};

	// Handle health profile update
	const handleHealthConditionToggle = (conditionId) => {
		const currentHealthProfile = preferences.health_profile || {};

		setPreferences((prev) => ({
			...prev,
			health_profile: {
				...currentHealthProfile,
				[conditionId]: !currentHealthProfile[conditionId],
			},
		}));
	};

	// Handle age category change
	const handleAgeCategoryChange = (category) => {
		const currentHealthProfile = preferences.health_profile || {};

		setPreferences((prev) => ({
			...prev,
			health_profile: {
				...currentHealthProfile,
				age_category: category,
			},
		}));
	};

	// Save preferences
	const handleSave = async () => {
		setSaving(true);
		setError(null);
		setSuccessMessage("");

		try {
			await API.updateUserPreferences(userId, preferences);
			setSuccessMessage("Preferences saved successfully");

			// Hide success message after 3 seconds
			setTimeout(() => setSuccessMessage(""), 3000);
		} catch (err) {
			setError("Failed to save preferences. Please try again.");
			console.error("Error saving preferences:", err);
		} finally {
			setSaving(false);
		}
	};

	// Check if a subscription exists and is active for a pollutant
	const isSubscribed = (pollutantId) => {
		const subscription = preferences.alert_subscriptions.find((sub) => sub.alert_type === pollutantId);
		return subscription && subscription.is_active;
	};

	// Get minimum severity for a pollutant
	const getMinSeverity = (pollutantId) => {
		const subscription = preferences.alert_subscriptions.find((sub) => sub.alert_type === pollutantId);
		return subscription ? subscription.min_severity : 1; // Default to moderate
	};

	// Has health condition check
	const hasHealthCondition = (conditionId) => {
		return preferences.health_profile && preferences.health_profile[conditionId];
	};

	// Get current age category
	const getCurrentAgeCategory = () => {
		return preferences.health_profile && preferences.health_profile.age_category ? preferences.health_profile.age_category : "adult"; // Default to adult
	};

	if (loading) {
		return <div className="notification-preferences loading">Loading preferences...</div>;
	}

	return (
		<div className="notification-preferences">
			<div className="preferences-header">
				<h2>Notification Settings</h2>
				<button className="close-button" onClick={onClose}>
					&times;
				</button>
			</div>

			{error && <div className="error-message">{error}</div>}

			{successMessage && <div className="success-message">{successMessage}</div>}

			<NotificationChannels channels={preferences.notification_channels} onToggle={handleChannelToggle} />
			<SensitivitySettings sensitivityLevel={preferences.sensitivity_level} onChange={handleSensitivityChange} />
			<AlertSubscriptions subscriptions={preferences.alert_subscriptions} pollutants={pollutants} onToggle={handleSubscriptionToggle} onSeverityChange={handleMinSeverityChange} />
			<HealthProfile healthProfile={preferences.health_profile} onConditionToggle={handleHealthConditionToggle} onAgeCategoryChange={handleAgeCategoryChange} />

			<div className="preferences-section">
				<h3>Notification Status</h3>

				<label className="toggle-switch">
					<input type="checkbox" checked={preferences.is_active} onChange={handleActiveToggle} />
					<span className="toggle-slider"></span>
					<span className="toggle-label">{preferences.is_active ? "Notifications are enabled" : "Notifications are disabled"}</span>
				</label>
			</div>

			<div className="preferences-actions">
				<button className="cancel-button" onClick={onClose}>
					Cancel
				</button>
				<button className="save-button" onClick={handleSave} disabled={saving}>
					{saving ? "Saving..." : "Save Preferences"}
				</button>
			</div>

			<style jsx>{`
				.notification-preferences {
					background-color: #fff;
					border-radius: 8px;
					box-shadow: 0 2px 20px rgba(0, 0, 0, 0.15);
					width: 100%;
					max-width: 600px;
					margin: 0 auto;
					padding-bottom: 20px;
				}

				.notification-preferences.loading {
					padding: 40px;
					text-align: center;
					color: #888;
				}

				.preferences-header {
					display: flex;
					justify-content: space-between;
					align-items: center;
					padding: 15px 20px;
					border-bottom: 1px solid #eee;
				}

				.preferences-header h2 {
					margin: 0;
					font-size: 1.2rem;
				}

				.close-button {
					background: none;
					border: none;
					font-size: 1.5rem;
					cursor: pointer;
				}

				.error-message,
				.success-message {
					margin: 10px 20px;
					padding: 10px;
					border-radius: 5px;
					text-align: center;
				}

				.error-message {
					background-color: #fff2f0;
					border: 1px solid #ffccc7;
					color: #f5222d;
				}

				.success-message {
					background-color: #f6ffed;
					border: 1px solid #b7eb8f;
					color: #52c41a;
				}

				.preferences-section {
					padding: 15px 20px;
					border-bottom: 1px solid #f0f0f0;
				}

				.preferences-section h3 {
					margin-top: 0;
					margin-bottom: 10px;
					font-size: 1.1rem;
					font-weight: 500;
				}

				.section-description {
					margin-top: 0;
					margin-bottom: 15px;
					color: #888;
					font-size: 0.9rem;
				}

				.channel-options {
					display: flex;
					flex-wrap: wrap;
					gap: 15px;
				}

				.channel-option {
					display: flex;
					align-items: center;
					cursor: pointer;
				}

				.channel-option input {
					margin-right: 8px;
				}

				.channel-icon {
					margin-right: 5px;
				}

				.toggle-switch {
					position: relative;
					display: flex;
					align-items: center;
					cursor: pointer;
				}

				.toggle-switch input {
					opacity: 0;
					width: 0;
					height: 0;
				}

				.toggle-slider {
					position: relative;
					display: inline-block;
					width: 50px;
					height: 24px;
					background-color: #ccc;
					border-radius: 34px;
					margin-right: 10px;
					transition: 0.4s;
				}

				.toggle-slider:before {
					position: absolute;
					content: "";
					height: 16px;
					width: 16px;
					left: 4px;
					bottom: 4px;
					background-color: white;
					border-radius: 50%;
					transition: 0.4s;
				}

				input:checked + .toggle-slider {
					background-color: #1890ff;
				}

				input:checked + .toggle-slider:before {
					transform: translateX(26px);
				}

				.toggle-label {
					font-size: 0.9rem;
				}

				.sensitivity-options {
					display: flex;
					flex-direction: column;
					gap: 10px;
				}

				.sensitivity-option {
					display: flex;
					padding: 10px;
					border: 1px solid #f0f0f0;
					border-radius: 5px;
					cursor: pointer;
				}

				.sensitivity-option.selected {
					border-color: #1890ff;
					background-color: #e6f7ff;
				}

				.sensitivity-option input {
					margin-right: 10px;
					margin-top: 5px;
				}

				.sensitivity-content {
					flex-grow: 1;
				}

				.sensitivity-content h4 {
					margin: 0 0 5px 0;
					font-size: 0.95rem;
				}

				.sensitivity-content p {
					margin: 0;
					font-size: 0.85rem;
					color: #666;
				}

				.pollutant-subscriptions {
					display: flex;
					flex-direction: column;
					gap: 15px;
				}

				.pollutant-item {
					border: 1px solid #f0f0f0;
					border-radius: 5px;
					padding: 12px;
				}

				.pollutant-toggle {
					display: flex;
					align-items: center;
					cursor: pointer;
					margin-bottom: 8px;
				}

				.pollutant-toggle input {
					margin-right: 8px;
				}

				.pollutant-name small {
					color: #888;
					margin-left: 5px;
				}

				.severity-selector {
					padding-left: 25px;
					margin-top: 5px;
				}

				.severity-selector label {
					display: block;
					margin-bottom: 5px;
					font-size: 0.85rem;
					color: #666;
				}

				.severity-selector select {
					width: 100%;
					padding: 8px;
					border-radius: 4px;
					border: 1px solid #d9d9d9;
				}

				.health-conditions {
					display: flex;
					flex-direction: column;
					gap: 10px;
				}

				.health-condition {
					display: flex;
					align-items: center;
					cursor: pointer;
				}

				.health-condition input {
					margin-right: 8px;
				}

				.age-category {
					margin-top: 15px;
				}

				.age-category label {
					display: block;
					margin-bottom: 5px;
				}

				.age-category select {
					width: 100%;
					padding: 8px;
					border-radius: 4px;
					border: 1px solid #d9d9d9;
				}

				.preferences-actions {
					display: flex;
					justify-content: flex-end;
					padding: 15px 20px;
					gap: 10px;
					margin-top: 10px;
				}

				.cancel-button {
					padding: 8px 15px;
					background: none;
					border: 1px solid #d9d9d9;
					border-radius: 4px;
					cursor: pointer;
				}

				.save-button {
					padding: 8px 15px;
					background-color: #1890ff;
					color: white;
					border: none;
					border-radius: 4px;
					cursor: pointer;
				}

				.save-button:hover {
					background-color: #40a9ff;
				}

				.save-button:disabled {
					background-color: #91caff;
					cursor: not-allowed;
				}
			`}</style>
		</div>
	);
};

export default NotificationPreferences;
