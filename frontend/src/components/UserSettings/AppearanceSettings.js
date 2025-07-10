import React, { useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import API from "../../services/api";

const AppearanceSettings = ({ user, onSuccess, onError }) => {
	const { theme, toggleTheme, setTheme } = useTheme();
	const isDarkMode = theme === "dark";

	const [formData, setFormData] = useState({
		fontSizePreference: user?.preferences?.fontSizePreference || "medium",
		colorBlindMode: user?.preferences?.colorBlindMode || false,
		animations: user?.preferences?.animations !== false, // Default to true if not set
		compactView: user?.preferences?.compactView || false,
		language: user?.preferences?.language || "en",
	});

	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleInputChange = (e) => {
		const { name, value, type, checked } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: type === "checkbox" ? checked : value,
		}));
	};

	const handleThemeToggle = () => {
		toggleTheme();
		// We'll save the theme preference in the submit handler
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setIsSubmitting(true);

		try {
			// Use API.updateUserPreferences directly
			await API.updateUserPreferences(user.id, {
				...formData,
				theme, // Include the current theme setting
			});

			onSuccess("Appearance settings saved successfully");
		} catch (err) {
			onError(err.message || "Failed to save appearance settings");
		} finally {
			setIsSubmitting(false);
		}
	};

	// Available languages
	const languages = [
		{ value: "en", label: "English" },
		{ value: "es", label: "Español" },
		{ value: "fr", label: "Français" },
		{ value: "de", label: "Deutsch" },
		{ value: "hi", label: "हिंदी" },
		{ value: "zh", label: "中文" },
	];

	return (
		<div className="settings-section">
			<div className="settings-card">
				<h3 className="settings-section-title">Display Preferences</h3>
				<form onSubmit={handleSubmit}>
					<div className="toggle-container">
						<span className="toggle-label">Dark Mode</span>
						<label className="toggle-switch">
							<input type="checkbox" checked={isDarkMode} onChange={handleThemeToggle} />
							<span className="toggle-slider"></span>
						</label>
					</div>

					<div className="toggle-container">
						<span className="toggle-label">Color Blind Mode</span>
						<label className="toggle-switch">
							<input type="checkbox" name="colorBlindMode" checked={formData.colorBlindMode} onChange={handleInputChange} />
							<span className="toggle-slider"></span>
						</label>
					</div>

					<div className="toggle-container">
						<span className="toggle-label">Enable Animations</span>
						<label className="toggle-switch">
							<input type="checkbox" name="animations" checked={formData.animations} onChange={handleInputChange} />
							<span className="toggle-slider"></span>
						</label>
					</div>

					<div className="toggle-container">
						<span className="toggle-label">Compact View</span>
						<label className="toggle-switch">
							<input type="checkbox" name="compactView" checked={formData.compactView} onChange={handleInputChange} />
							<span className="toggle-slider"></span>
						</label>
					</div>

					<div className="settings-form-group">
						<label htmlFor="fontSizePreference" className="settings-label">
							Text Size
						</label>
						<select id="fontSizePreference" name="fontSizePreference" className="settings-input" value={formData.fontSizePreference} onChange={handleInputChange}>
							<option value="small">Small</option>
							<option value="medium">Medium</option>
							<option value="large">Large</option>
							<option value="x-large">Extra Large</option>
						</select>
					</div>

					<div className="settings-form-group">
						<label htmlFor="language" className="settings-label">
							Language
						</label>
						<select id="language" name="language" className="settings-input" value={formData.language} onChange={handleInputChange}>
							{languages.map((lang) => (
								<option key={lang.value} value={lang.value}>
									{lang.label}
								</option>
							))}
						</select>
					</div>

					<div className="settings-actions">
						<button type="submit" className="settings-button settings-button-primary" disabled={isSubmitting}>
							{isSubmitting ? "Saving..." : "Save Preferences"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default AppearanceSettings;
