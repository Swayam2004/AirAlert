import React, { useState, useEffect } from "react";
import { fetchUserPreferences, updateUserPreferences } from "../../services/api";
import NotificationChannels from "./NotificationChannels";
import SensitivitySettings from "./SensitivitySettings";
import AlertSubscriptions from "./AlertSubscriptions";
import HealthProfile from "./HealthProfile";
import NotificationStatus from "./NotificationStatus";
import PreferenceActions from "./PreferenceActions";
import { POLLUTANTS, DEFAULT_PREFERENCES } from "./constants";
import { preferenceStyles } from "./styles";

/**
 * NotificationPreferences component for managing user notification settings
 * Allows users to choose notification channels, set pollutant thresholds,
 * and customize alert types
 */
const NotificationPreferences = ({ userId, onClose }) => {
	const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(null);
	const [successMessage, setSuccessMessage] = useState("");

	// Fetch user preferences on component mount
	useEffect(() => {
		if (!userId) return;

		const fetchPreferences = async () => {
			setLoading(true);
			try {
				const data = await fetchUserPreferences(userId);
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
			await updateUserPreferences(userId, preferences);
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

			<AlertSubscriptions subscriptions={preferences.alert_subscriptions} pollutants={POLLUTANTS} onToggle={handleSubscriptionToggle} onSeverityChange={handleMinSeverityChange} />

			<HealthProfile healthProfile={preferences.health_profile} onConditionToggle={handleHealthConditionToggle} onAgeCategoryChange={handleAgeCategoryChange} />

			<NotificationStatus isActive={preferences.is_active} onToggle={handleActiveToggle} />

			<PreferenceActions onSave={handleSave} onCancel={onClose} saving={saving} />

			<style jsx>{preferenceStyles}</style>
		</div>
	);
};

export default NotificationPreferences;
