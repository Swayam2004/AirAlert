import React, { useState } from "react";
import ProfileSettings from "./UserSettings/ProfileSettings";
import AppearanceSettings from "./UserSettings/AppearanceSettings";
import SecuritySettings from "./UserSettings/SecuritySettings";
import LocationSettings from "./UserSettings/LocationSettings";
import NotificationPreferences from "./NotificationPreferences";
import { useAuth } from "../context/AuthContext";
import "./UserSettings.css";

const UserSettings = ({ user, onClose }) => {
	const { user: authUser } = useAuth();
	const [activeTab, setActiveTab] = useState("profile");
	const [feedback, setFeedback] = useState({ type: null, message: "" });

	// Use the user prop if provided, otherwise use the user from AuthContext
	const currentUser = user || authUser;

	const handleSuccess = (message) => {
		setFeedback({ type: "success", message });
		// Clear feedback after 5 seconds
		setTimeout(() => {
			setFeedback({ type: null, message: "" });
		}, 5000);
	};

	const handleError = (message) => {
		setFeedback({ type: "error", message });
		// Clear feedback after 5 seconds
		setTimeout(() => {
			setFeedback({ type: null, message: "" });
		}, 5000);
	};

	// Available tabs with their labels
	const tabs = [
		{ id: "profile", label: "Profile" },
		{ id: "appearance", label: "Appearance" },
		{ id: "notifications", label: "Notifications" },
		{ id: "locations", label: "Locations" },
		{ id: "security", label: "Security & Privacy" },
	];

	// Render the active tab content
	const renderTabContent = () => {
		switch (activeTab) {
			case "profile":
				return <ProfileSettings user={currentUser} onSuccess={handleSuccess} onError={handleError} />;
			case "appearance":
				return <AppearanceSettings user={currentUser} onSuccess={handleSuccess} onError={handleError} />;
			case "notifications":
				return <NotificationPreferences userId={currentUser.id} onClose={() => {}} />;
			case "locations":
				return <LocationSettings user={currentUser} onSuccess={handleSuccess} onError={handleError} />;
			case "security":
				return <SecuritySettings user={currentUser} onSuccess={handleSuccess} onError={handleError} />;
			default:
				return <div>Select a tab to view settings</div>;
		}
	};

	return (
		<div className="user-settings">
			{/* Feedback messages */}
			{feedback.type && (
				<div className={`settings-feedback ${feedback.type}`}>
					<span className="settings-feedback-icon">{feedback.type === "success" ? "✓" : "⚠"}</span>
					{feedback.message}
				</div>
			)}

			{/* Navigation Tabs */}
			<div className="user-settings-tabs">
				{tabs.map((tab) => (
					<button key={tab.id} className={`user-settings-tab ${activeTab === tab.id ? "active" : ""}`} onClick={() => setActiveTab(tab.id)}>
						{tab.label}
					</button>
				))}
			</div>

			{/* Tab Content */}
			<div className="user-settings-content">{renderTabContent()}</div>
		</div>
	);
};

export default UserSettings;
