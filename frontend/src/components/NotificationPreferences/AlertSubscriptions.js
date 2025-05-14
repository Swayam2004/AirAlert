import React from "react";

const AlertSubscriptions = ({ subscriptions, pollutants, onToggle, onSeverityChange }) => {
	const isSubscribed = (pollutantId) => subscriptions.some((sub) => sub.alert_type === pollutantId && sub.is_active);
	const getMinSeverity = (pollutantId) => {
		const subscription = subscriptions.find((sub) => sub.alert_type === pollutantId);
		return subscription ? subscription.min_severity : 1;
	};

	return (
		<div className="preferences-section">
			<h3>Alert Subscriptions</h3>
			<p className="section-description">Choose which pollutants you want to receive alerts for</p>
			<div className="pollutant-subscriptions">
				{pollutants.map((pollutant) => (
					<div key={pollutant.id} className="pollutant-item">
						<label className="pollutant-toggle">
							<input type="checkbox" checked={isSubscribed(pollutant.id)} onChange={() => onToggle(pollutant.id)} />
							<span className="pollutant-name">{pollutant.name}</span>
						</label>
						{isSubscribed(pollutant.id) && (
							<div className="severity-selector">
								<label>Alert me when level is:</label>
								<select value={getMinSeverity(pollutant.id)} onChange={(e) => onSeverityChange(pollutant.id, e.target.value)}>
									<option value="1">Moderate or worse</option>
									<option value="2">Unhealthy for Sensitive Groups or worse</option>
									<option value="3">Unhealthy or worse</option>
									<option value="4">Very Unhealthy or worse</option>
									<option value="5">Hazardous only</option>
								</select>
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
};

export default AlertSubscriptions;
