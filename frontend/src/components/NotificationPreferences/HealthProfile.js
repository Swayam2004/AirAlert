import React from "react";

const HealthProfile = ({ healthProfile, onConditionToggle, onAgeCategoryChange }) => {
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

	return (
		<div className="preferences-section">
			<h3>Health Profile</h3>
			<p className="section-description">Tell us about your health conditions</p>
			<div className="health-conditions">
				{healthConditions.map((condition) => (
					<label key={condition.id} className="health-condition">
						<input type="checkbox" checked={healthProfile?.[condition.id] || false} onChange={() => onConditionToggle(condition.id)} />
						<span>{condition.name}</span>
					</label>
				))}
				<div className="age-category">
					<label>Age Category:</label>
					<select value={healthProfile?.age_category || "adult"} onChange={(e) => onAgeCategoryChange(e.target.value)}>
						{ageCategories.map((category) => (
							<option key={category.value} value={category.value}>
								{category.label}
							</option>
						))}
					</select>
				</div>
			</div>
		</div>
	);
};

export default HealthProfile;
