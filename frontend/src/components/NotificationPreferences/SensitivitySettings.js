import React from "react";

const SensitivitySettings = ({ sensitivityLevel, onChange }) => {
	const sensitivityLevels = [
		{ value: 0, label: "Standard", description: "Receive alerts for unhealthy levels and above" },
		{ value: 1, label: "Sensitive", description: "Receive alerts at lower thresholds" },
		{ value: 2, label: "Highly Sensitive", description: "Receive alerts at lowest thresholds" },
	];

	return (
		<div className="preferences-section">
			<h3>Sensitivity Setting</h3>
			<p className="section-description">Choose your air quality sensitivity level</p>
			<div className="sensitivity-options">
				{sensitivityLevels.map((level) => (
					<label key={level.value} className={`sensitivity-option ${sensitivityLevel === level.value ? "selected" : ""}`}>
						<input type="radio" name="sensitivity" value={level.value} checked={sensitivityLevel === level.value} onChange={() => onChange(level.value)} />
						<div className="sensitivity-content">
							<h4>{level.label}</h4>
							<p>{level.description}</p>
						</div>
					</label>
				))}
			</div>
		</div>
	);
};

export default SensitivitySettings;
