import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Circle, Popup, LayersControl, FeatureGroup } from "react-leaflet";
import API from "../services/api";

const { BaseLayer, Overlay } = LayersControl;

// Severity color mapping
const getSeverityColor = (level) => {
	const colors = {
		1: "#89CFF0", // Light blue
		2: "#FFD700", // Gold
		3: "#FFA500", // Orange
		4: "#FF4500", // Red-Orange
		5: "#FF0000", // Red
	};
	return colors[level] || "#808080"; // Default to gray if level is undefined
};

// Severity radius mapping (in meters)
const getSeverityRadius = (level) => {
	return level * 1500; // Scale radius by severity level
};

function AlertVisualization() {
	const [alerts, setAlerts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [severityFilter, setSeverityFilter] = useState(0); // 0 means show all
	const [pollutantFilter, setPollutantFilter] = useState("all");
	const [pollutants, setPollutants] = useState([]);
	const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // Default to center of India
	const [mapZoom, setMapZoom] = useState(4);

	useEffect(() => {
		const fetchAlerts = async () => {
			try {
				setLoading(true);
				const response = await API.getAlerts({
					active_only: true,
					severity_min: severityFilter,
				});

				if (response.data && response.data.alerts) {
					setAlerts(response.data.alerts);

					// Extract unique pollutants from alerts
					const uniquePollutants = [...new Set(response.data.alerts.map((alert) => alert.pollutant))];
					setPollutants(uniquePollutants);

					// If we have alerts, center the map on the first alert
					if (response.data.alerts.length > 0 && navigator.geolocation) {
						// Try to get user's location first
						navigator.geolocation.getCurrentPosition(
							(position) => {
								setMapCenter([position.coords.latitude, position.coords.longitude]);
								setMapZoom(10); // Zoom in closer when we have user location
							},
							() => {
								// Fallback to first alert location if geolocation fails
								const firstAlert = response.data.alerts[0];
								if (firstAlert.latitude && firstAlert.longitude) {
									setMapCenter([firstAlert.latitude, firstAlert.longitude]);
									setMapZoom(8);
								}
							}
						);
					}
				}
				setError(null);
			} catch (err) {
				console.error("Error fetching alerts:", err);
				setError("Failed to load alerts. Please try again later.");
			} finally {
				setLoading(false);
			}
		};

		fetchAlerts();
		// Set up periodic refresh every 5 minutes
		const intervalId = setInterval(fetchAlerts, 5 * 60 * 1000);

		return () => clearInterval(intervalId);
	}, [severityFilter]);

	const filteredAlerts = alerts.filter((alert) => {
		if (pollutantFilter !== "all" && alert.pollutant !== pollutantFilter) {
			return false;
		}
		return true;
	});

	const handlePollutantFilterChange = (e) => {
		setPollutantFilter(e.target.value);
	};

	const handleSeverityFilterChange = (e) => {
		setSeverityFilter(Number(e.target.value));
	};

	const handleCheckAlerts = async () => {
		try {
			// Show a prompt to select a pollutant
			const selectedPollutant = prompt("Enter pollutant to check (pm25, pm10, o3, no2, so2, co, aqi):", "pm25");

			if (selectedPollutant) {
				await API.checkAlerts(selectedPollutant);
				alert("Alert check started. New alerts will be available shortly.");
				// Refresh alerts after a short delay
				setTimeout(async () => {
					const response = await API.getAlerts({ active_only: true });
					if (response.data && response.data.alerts) {
						setAlerts(response.data.alerts);
					}
				}, 3000);
			}
		} catch (err) {
			console.error("Error checking alerts:", err);
			alert("Failed to trigger alert check. Please try again later.");
		}
	};

	if (loading) return <div className="loading">Loading alerts...</div>;
	if (error) return <div className="error-message">{error}</div>;

	return (
		<section className="alert-visualization">
			<h2>Active Alerts</h2>

			<div className="alert-controls">
				<div>
					<label>
						Filter by Pollutant:
						<select value={pollutantFilter} onChange={handlePollutantFilterChange}>
							<option value="all">All Pollutants</option>
							{pollutants.map((pollutant) => (
								<option key={pollutant} value={pollutant}>
									{pollutant.toUpperCase()}
								</option>
							))}
						</select>
					</label>

					<label>
						Minimum Severity:
						<select value={severityFilter} onChange={handleSeverityFilterChange}>
							<option value="0">All Severities</option>
							<option value="1">1+</option>
							<option value="2">2+</option>
							<option value="3">3+</option>
							<option value="4">4+</option>
							<option value="5">5 (Critical)</option>
						</select>
					</label>

					<button onClick={handleCheckAlerts} className="check-alerts-button">
						Check for New Alerts
					</button>
				</div>

				<div className="alert-stats">
					<div className="stat">
						<span className="stat-label">Total Alerts:</span>
						<span className="stat-value">{filteredAlerts.length}</span>
					</div>
					<div className="stat">
						<span className="stat-label">Critical Alerts:</span>
						<span className="stat-value">{filteredAlerts.filter((alert) => alert.severity_level >= 4).length}</span>
					</div>
				</div>
			</div>

			{filteredAlerts.length === 0 ? (
				<p className="no-alerts-message">No active alerts match your criteria. Good news!</p>
			) : (
				<div className="alerts-container">
					<MapContainer center={mapCenter} zoom={mapZoom} style={{ height: "500px", width: "100%" }}>
						<LayersControl position="topright">
							<BaseLayer checked name="OpenStreetMap">
								<TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors" />
							</BaseLayer>
							<BaseLayer name="Satellite">
								<TileLayer
									url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
									attribution="&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
								/>
							</BaseLayer>

							<Overlay checked name="Alert Zones">
								<FeatureGroup>
									{filteredAlerts.map((alert) => (
										<Circle
											key={alert.id}
											center={[alert.latitude, alert.longitude]}
											radius={getSeverityRadius(alert.severity_level)}
											pathOptions={{
												color: getSeverityColor(alert.severity_level),
												fillColor: getSeverityColor(alert.severity_level),
												fillOpacity: 0.4,
											}}
										>
											<Popup>
												<div className="alert-popup">
													<h3>Alert #{alert.id}</h3>
													<table>
														<tbody>
															<tr>
																<td>Type:</td>
																<td>
																	<strong>{alert.alert_type || "Threshold Exceeded"}</strong>
																</td>
															</tr>
															<tr>
																<td>Pollutant:</td>
																<td>
																	<strong>{alert.pollutant.toUpperCase()}</strong>
																</td>
															</tr>
															<tr>
																<td>Severity:</td>
																<td>
																	<strong>{alert.severity_level} / 5</strong>
																</td>
															</tr>
															<tr>
																<td>Current Value:</td>
																<td>
																	<strong>{alert.current_value}</strong>
																</td>
															</tr>
															<tr>
																<td>Threshold:</td>
																<td>
																	<strong>{alert.threshold_value}</strong>
																</td>
															</tr>
															<tr>
																<td>Location:</td>
																<td>
																	<a href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`} target="_blank" rel="noopener noreferrer">
																		View on Google Maps
																	</a>
																</td>
															</tr>
															{alert.created_at && (
																<tr>
																	<td>Created:</td>
																	<td>{new Date(alert.created_at).toLocaleString()}</td>
																</tr>
															)}
														</tbody>
													</table>
												</div>
											</Popup>
										</Circle>
									))}
								</FeatureGroup>
							</Overlay>
						</LayersControl>
					</MapContainer>

					<div className="alerts-list">
						<h3>Alert Details</h3>
						<table>
							<thead>
								<tr>
									<th>ID</th>
									<th>Pollutant</th>
									<th>Severity</th>
									<th>Value</th>
									<th>Threshold</th>
									<th>Created</th>
								</tr>
							</thead>
							<tbody>
								{filteredAlerts.map((alert) => (
									<tr key={alert.id} className={`severity-${alert.severity_level}`}>
										<td>{alert.id}</td>
										<td>{alert.pollutant.toUpperCase()}</td>
										<td>{alert.severity_level}</td>
										<td>{alert.current_value}</td>
										<td>{alert.threshold_value}</td>
										<td>{alert.created_at ? new Date(alert.created_at).toLocaleString() : "Unknown"}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</section>
	);
}

export default AlertVisualization;
