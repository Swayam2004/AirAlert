import React, { useEffect, useState } from "react";
import API from "../services/api";
import "../styles/index.css";

function AlertsPage() {
	const [alerts, setAlerts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		const fetchAlerts = async () => {
			try {
				const response = await API.getAlerts();
				setAlerts(response.data);
				setLoading(false);
			} catch (err) {
				setError(err.message);
				setLoading(false);
			}
		};

		fetchAlerts();
	}, []);

	const handleCreateAlert = async (event) => {
		event.preventDefault();
		const threshold = event.target.threshold.value;

		try {
			// Use the API object to create an alert
			await API.createAlertSubscription(1, { alert_type: "air_quality", min_severity: threshold });
			alert("Alert created successfully!");
		} catch (err) {
			alert("Failed to create alert: " + err.message);
		}
	};

	if (loading) return <div>Loading...</div>;
	if (error) return <div>Error: {error}</div>;

	return (
		<div className="container">
			<header className="mb-5">
				<h1 className="text-primary">Alerts</h1>
				<p className="text-secondary">Configure and view your air quality alerts.</p>
			</header>

			<section className="alert-config">
				<h2 className="text-primary">Configure Alerts</h2>
				<form className="alert-form" onSubmit={handleCreateAlert}>
					<label htmlFor="threshold">Alert Threshold (AQI):</label>
					<input type="number" id="threshold" name="threshold" className="form-control" placeholder="e.g., 150" />
					<button type="submit" className="btn btn-primary mt-3">
						Save
					</button>
				</form>
			</section>

			<section className="received-alerts mt-5">
				<h2 className="text-primary">Received Alerts</h2>
				<ul>
					{alerts.map((alert, index) => (
						<li key={index}>{`AQI exceeded ${alert.threshold} on ${alert.timestamp}`}</li>
					))}
				</ul>
			</section>
		</div>
	);
}

export default AlertsPage;
