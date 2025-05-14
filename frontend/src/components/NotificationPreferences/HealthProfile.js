import React from "react";
import { HEALTH_CONDITIONS, AGE_CATEGORIES } from "./constants";

const HealthProfile = ({ healthProfile, onConditionToggle, onAgeCategoryChange }) => {
	return (
		<div className="preferences-section">
			<h3>Health Profile</h3>
			<p className="section-description">Tell us about your health conditions to receive personalized air quality recommendations</p>

			<div className="health-conditions">
				<h4>Medical Conditions</h4>
				<div className="conditions-grid">
					{HEALTH_CONDITIONS.map((condition) => (
						<label key={condition.id} className={`health-condition-card ${healthProfile?.[condition.id] ? "selected" : ""}`}>
							<input type="checkbox" checked={healthProfile?.[condition.id] || false} onChange={() => onConditionToggle(condition.id)} />
							<span className="condition-icon">{getConditionIcon(condition.id)}</span>
							<span className="condition-name">{condition.name}</span>
						</label>
					))}
				</div>

				<div className="age-category">
					<h4>Age Category</h4>
					<div className="age-selector">
						{AGE_CATEGORIES.map((category) => (
							<button key={category.value} type="button" className={`age-button ${healthProfile?.age_category === category.value ? "active" : ""}`} onClick={() => onAgeCategoryChange(category.value)}>
								{category.label}
							</button>
						))}
					</div>
				</div>
			</div>
		</div>
	);
};

// Helper function to get appropriate icon for each condition
const getConditionIcon = (conditionId) => {
	const icons = {
		has_asthma: "🫁",
		has_copd: "🫁",
		has_heart_disease: "❤️",
		has_diabetes: "💉",
		has_pregnancy: "🤰",
	};

	return icons[conditionId] || "🏥";
};

export default HealthProfile;
