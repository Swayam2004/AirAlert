import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Circle, Popup } from "react-leaflet";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import API from "../services/api";

// Mini-components for the dashboard
const StatCard = ({ title, value, unit, icon, trend, className }) => (
	<div className={`stat-card ${className || ""}`}>
		<div className="stat-icon">{icon}</div>
		<div className="stat-content">
			<h3>{title}</h3>
			<div className="stat-value">
				{value} <span className="stat-unit">{unit}</span>
				{trend && (
					<span className={`trend ${trend > 0 ? "up" : "down"}`}>
						{trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
					</span>
				)}
			</div>
		</div>
	</div>
);

function Dashboard() {
	const [airQuality, setAirQuality] = useState(null);
	const [alerts, setAlerts] = useState([]);
	const [pollutantChartData, setPollutantChartData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [healthTips, setHealthTips] = useState("");

	useEffect(() => {
		const fetchDashboardData = async () => {
			try {
				setLoading(true);

				// Fetch latest air quality data
				const airQualityResponse = await API.getAirQuality({
					limit: 1, // Just get the most recent reading
				});

				if (airQualityResponse.data && airQualityResponse.data.readings && airQualityResponse.data.readings.length > 0) {
					setAirQuality(airQualityResponse.data.readings[0]);

					// Generate chart data from the latest reading
					const reading = airQualityResponse.data.readings[0];
					const chartData = [
						{ name: "PM2.5", value: reading.pm25 },
						{ name: "PM10", value: reading.pm10 },
						{ name: "O3", value: reading.o3 },
						{ name: "NO2", value: reading.no2 },
						{ name: "SO2", value: reading.so2 },
						{ name: "CO", value: reading.co },
					].filter((item) => item.value !== null);

					setPollutantChartData(chartData);

					// Set health tips based on AQI
					setHealthTips(getHealthTips(reading.aqi));
				}

				// Fetch active alerts
				const alertsResponse = await API.getAlerts({
					active_only: true,
					severity_min: 3, // Only show critical alerts on dashboard
				});

				if (alertsResponse.data && alertsResponse.data.alerts) {
					setAlerts(alertsResponse.data.alerts);
				}

				setError(null);
			} catch (err) {
				console.error("Error fetching dashboard data:", err);
				setError("Failed to load dashboard data. Please try again later.");
			} finally {
				setLoading(false);
			}
		};

		fetchDashboardData();

		// Refresh data every 5 minutes
		const intervalId = setInterval(fetchDashboardData, 5 * 60 * 1000);
		return () => clearInterval(intervalId);
	}, []);

	// Function to get health tips based on AQI level
	const getHealthTips = (aqi) => {
		if (!aqi) return "No air quality data available.";

		if (aqi <= 50) {
			return "Air quality is good. Enjoy outdoor activities.";
		} else if (aqi <= 100) {
			return "Air quality is moderate. Unusually sensitive people should consider reducing prolonged outdoor exertion.";
		} else if (aqi <= 150) {
			return "Air quality is unhealthy for sensitive groups. People with respiratory or heart conditions, the elderly and children should limit prolonged outdoor exertion.";
		} else if (aqi <= 200) {
			return "Air quality is unhealthy. Everyone should limit prolonged outdoor exertion. People with respiratory or heart conditions, the elderly and children should avoid outdoor activity.";
		} else if (aqi <= 300) {
			return "Air quality is very unhealthy. Everyone should avoid outdoor activity. People with respiratory or heart conditions, the elderly and children should remain indoors.";
		} else {
			return "Air quality is hazardous. Everyone should avoid all outdoor activities. Consider wearing a mask if you must go outside.";
		}
	};

	if (loading) return <div className="loading">Loading dashboard data...</div>;
	if (error) return <div className="error-message">{error}</div>;

	return (
		<div className="dashboard">
			<section className="dashboard-summary">
				<h2>Air Quality Dashboard</h2>

				<div className="stats-container">
					{airQuality ? (
						<>
							<StatCard title="Current AQI" value={airQuality.aqi.toFixed(2) || "N/A"} unit="" icon="🌬️" className={`aqi-${getAQILevel(airQuality.aqi)}`} />
							<StatCard title="PM2.5" value={airQuality.pm25.toFixed(2) || "N/A"} unit="μg/m³" icon="🔬" />
							<StatCard title="Temperature" value={airQuality.temperature.toFixed(2) || "N/A"} unit="°C" icon="🌡️" />
							<StatCard title="Humidity" value={airQuality.humidity.toFixed(2) || "N/A"} unit="%" icon="💧" />
						</>
					) : (
						<p className="no-data">No recent air quality data available.</p>
					)}
				</div>

				<div className="health-tips">
					<h3>Health Recommendations</h3>
					<p>{healthTips}</p>
				</div>
			</section>

			<div className="dashboard-content">
				<section className="dashboard-chart">
					<h3>Current Pollutant Levels</h3>
					{pollutantChartData.length > 0 ? (
						<ResponsiveContainer width="100%" height={300}>
							<BarChart data={pollutantChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis dataKey="name" />
								<YAxis />
								<Tooltip />
								<Legend />
								<Bar dataKey="value" name="Level" fill="#8884d8" />
							</BarChart>
						</ResponsiveContainer>
					) : (
						<p className="no-data">No pollutant data available for chart.</p>
					)}
				</section>

				<section className="dashboard-alerts">
					<h3>Critical Alerts</h3>
					{alerts.length > 0 ? (
						<div className="alerts-summary">
							<p>
								There are <strong>{alerts.length}</strong> active critical alerts.
							</p>
							<MapContainer center={[20.5937, 78.9629]} zoom={4} style={{ height: "300px", width: "100%" }}>
								<TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors" />
								{alerts.map((alert) => (
									<Circle
										key={alert.id}
										center={[alert.latitude, alert.longitude]}
										radius={alert.severity_level * 1500}
										pathOptions={{
											color: getSeverityColor(alert.severity_level),
											fillColor: getSeverityColor(alert.severity_level),
											fillOpacity: 0.4,
										}}
									>
										<Popup>
											<div>
												<h4>Alert #{alert.id}</h4>
												<p>
													<strong>Pollutant:</strong> {alert.pollutant.toUpperCase()}
												</p>
												<p>
													<strong>Severity:</strong> {alert.severity_level}/5
												</p>
												<p>
													<strong>Value:</strong> {alert.current_value} (Threshold: {alert.threshold_value})
												</p>
											</div>
										</Popup>
									</Circle>
								))}
							</MapContainer>
						</div>
					) : (
						<p className="no-alerts">No critical alerts at this time.</p>
					)}
				</section>
			</div>
		</div>
	);
}

// Helper functions
function getAQILevel(aqi) {
	if (!aqi) return "unknown";
	if (aqi <= 50) return "good";
	if (aqi <= 100) return "moderate";
	if (aqi <= 150) return "unhealthy-sensitive";
	if (aqi <= 200) return "unhealthy";
	if (aqi <= 300) return "very-unhealthy";
	return "hazardous";
}

function getSeverityColor(level) {
	const colors = {
		1: "#89CFF0", // Light blue
		2: "#FFD700", // Gold
		3: "#FFA500", // Orange
		4: "#FF4500", // Red-Orange
		5: "#FF0000", // Red
	};
	return colors[level] || "#808080"; // Default to gray if level is undefined
}

export default Dashboard;
