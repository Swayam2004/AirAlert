import React, { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Circle, Popup } from "react-leaflet";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import API from "../services/api";

// Mini-components for the dashboard
const StatCard = ({ title, value, unit, icon, trend, className }) => (
	<div className={`stat-card ${className || ""}`}>
		<div className="stat-icon">{icon}</div>
		<div className="stat-content">
			<h3>{title}</h3>
			<div className="stat-value">
				{value} <span className="stat-unit">{unit}</span>
				{trend !== undefined && (
					<span className={`trend ${trend > 0 ? "up" : trend < 0 ? "down" : "neutral"}`}>
						{trend > 0 ? "↑" : trend < 0 ? "↓" : "–"} {Math.abs(trend)}%
					</span>
				)}
			</div>
		</div>
	</div>
);

// AQI gauge component
const AQIGauge = ({ value }) => {
	const level = getAQILevel(value);
	const percentage = Math.min(Math.max((value / 500) * 100, 0), 100);

	return (
		<div className="aqi-gauge-container">
			<div className="aqi-gauge-track">
				<div className={`aqi-gauge-progress aqi-${level}`} style={{ width: `${percentage}%` }}></div>
			</div>
			<div className="aqi-gauge-labels">
				<span>0</span>
				<span>100</span>
				<span>200</span>
				<span>300</span>
				<span>500</span>
			</div>
			<div className="aqi-gauge-value-container">
				<div className={`aqi-gauge-value aqi-${level}`}>
					<span className="aqi-value">{Math.round(value)}</span>
					<span className="aqi-label">{getLevelLabel(level)}</span>
				</div>
			</div>
		</div>
	);
};

// Weather widget component
const WeatherWidget = ({ temperature, humidity, windSpeed, pressure }) => (
	<div className="weather-widget">
		<h3>Weather Conditions</h3>

		<div className="weather-grid">
			<div className="weather-item">
				<div className="weather-icon">🌡️</div>
				<div className="weather-data">
					<div className="weather-value">{temperature !== null ? temperature.toFixed(1) : "N/A"}°C</div>
					<div className="weather-label">Temperature</div>
				</div>
			</div>

			<div className="weather-item">
				<div className="weather-icon">💧</div>
				<div className="weather-data">
					<div className="weather-value">{humidity !== null ? humidity.toFixed(0) : "N/A"}%</div>
					<div className="weather-label">Humidity</div>
				</div>
			</div>

			<div className="weather-item">
				<div className="weather-icon">🌬️</div>
				<div className="weather-data">
					<div className="weather-value">{windSpeed !== null ? windSpeed.toFixed(1) : "N/A"} m/s</div>
					<div className="weather-label">Wind Speed</div>
				</div>
			</div>

			<div className="weather-item">
				<div className="weather-icon">📊</div>
				<div className="weather-data">
					<div className="weather-value">{pressure !== null ? pressure.toFixed(0) : "N/A"} hPa</div>
					<div className="weather-label">Pressure</div>
				</div>
			</div>
		</div>
	</div>
);

function Dashboard() {
	const [airQuality, setAirQuality] = useState(null);
	const [alerts, setAlerts] = useState([]);
	const [pollutantChartData, setPollutantChartData] = useState([]);
	const [trendData, setTrendData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [healthTips, setHealthTips] = useState("");
	const [selectedPollutant, setSelectedPollutant] = useState("aqi");
	const [timeRange, setTimeRange] = useState("24h"); // 24h, 7d, 30d

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
						{ name: "PM2.5", value: reading.pm25, threshold: 35 },
						{ name: "PM10", value: reading.pm10, threshold: 150 },
						{ name: "O3", value: reading.o3, threshold: 70 },
						{ name: "NO2", value: reading.no2, threshold: 100 },
						{ name: "SO2", value: reading.so2, threshold: 75 },
						{ name: "CO", value: reading.co, threshold: 9 },
					].filter((item) => item.value !== null);

					setPollutantChartData(chartData);

					// Set health tips based on AQI
					setHealthTips(getHealthTips(reading.aqi));

					// Fetch trend data based on selected time range
					const timeRangeHours = timeRange === "24h" ? 24 : timeRange === "7d" ? 168 : timeRange === "30d" ? 720 : 24;

					const trendResponse = await API.getTimeSeriesData(
						airQualityResponse.data.readings[0].station_id,
						selectedPollutant,
						new Date(Date.now() - timeRangeHours * 60 * 60 * 1000).toISOString(),
						new Date().toISOString()
					);

					if (trendResponse.data && trendResponse.data.readings) {
						// Format data for the line chart
						const trendChartData = trendResponse.data.readings.map((reading) => ({
							time: new Date(reading.timestamp).toLocaleString(),
							value: reading[selectedPollutant],
							threshold: getThresholdForPollutant(selectedPollutant),
						}));

						setTrendData(trendChartData);
					}
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
	}, [selectedPollutant, timeRange]);

	// Get threshold value for pollutant
	const getThresholdForPollutant = (pollutant) => {
		switch (pollutant) {
			case "pm25":
				return 35;
			case "pm10":
				return 150;
			case "o3":
				return 70;
			case "no2":
				return 100;
			case "so2":
				return 75;
			case "co":
				return 9;
			case "aqi":
				return 100;
			default:
				return 100;
		}
	};

	// Calculate trend percentage compared to previous day average
	const calculateTrend = (current, pollutant, trendData) => {
		if (!trendData || trendData.length < 24) return null;

		// Get data from 24-48 hours ago for comparison
		const previousDayData = trendData.slice(-48, -24);
		if (previousDayData.length === 0) return null;

		const previousAvg = previousDayData.reduce((sum, item) => sum + item.value, 0) / previousDayData.length;

		// Return percentage difference
		if (previousAvg === 0) return 0;
		return Math.round(((current - previousAvg) / previousAvg) * 100);
	};

	// Trends for each main pollutant
	const trends = useMemo(() => {
		if (!airQuality || !trendData || trendData.length === 0) return {};

		return {
			aqi: calculateTrend(airQuality.aqi, "aqi", trendData),
			pm25: calculateTrend(airQuality.pm25, "pm25", trendData),
			pm10: calculateTrend(airQuality.pm10, "pm10", trendData),
		};
	}, [airQuality, trendData]);

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
			<section className="dashboard-header">
				<h2>Air Quality Dashboard</h2>
				<div className="last-updated">Last updated: {airQuality ? new Date(airQuality.timestamp).toLocaleString() : "N/A"}</div>
			</section>

			<section className="dashboard-summary">
				<div className="aqi-overview">
					<h3>Current Air Quality</h3>

					<div className="aqi-container">{airQuality && <AQIGauge value={airQuality.aqi} />}</div>

					<div className="health-tips">
						<h4>Health Recommendations</h4>
						<p>{healthTips}</p>
					</div>
				</div>

				<div className="stats-container">
					{airQuality ? (
						<>
							<StatCard title="PM2.5" value={airQuality.pm25 !== null ? airQuality.pm25.toFixed(2) : "N/A"} unit="μg/m³" icon="🔬" trend={trends.pm25} />
							<StatCard title="PM10" value={airQuality.pm10 !== null ? airQuality.pm10.toFixed(2) : "N/A"} unit="μg/m³" icon="💨" trend={trends.pm10} />
							<StatCard title="Temperature" value={airQuality.temperature !== null ? airQuality.temperature.toFixed(2) : "N/A"} unit="°C" icon="🌡️" />
							<StatCard title="Humidity" value={airQuality.humidity !== null ? airQuality.humidity.toFixed(2) : "N/A"} unit="%" icon="💧" />
						</>
					) : (
						<p className="no-data">No recent air quality data available.</p>
					)}
				</div>
			</section>

			<div className="dashboard-content">
				<section className="dashboard-chart">
					<div className="chart-header">
						<h3>Pollutant Trends</h3>
						<div className="chart-controls">
							<div className="pollutant-select">
								<select value={selectedPollutant} onChange={(e) => setSelectedPollutant(e.target.value)} className="select-input">
									<option value="aqi">AQI</option>
									<option value="pm25">PM2.5</option>
									<option value="pm10">PM10</option>
									<option value="o3">O3 (Ozone)</option>
									<option value="no2">NO2</option>
									<option value="so2">SO2</option>
									<option value="co">CO</option>
								</select>
							</div>

							<div className="time-range-buttons">
								<button className={`time-button ${timeRange === "24h" ? "active" : ""}`} onClick={() => setTimeRange("24h")}>
									24h
								</button>
								<button className={`time-button ${timeRange === "7d" ? "active" : ""}`} onClick={() => setTimeRange("7d")}>
									7d
								</button>
								<button className={`time-button ${timeRange === "30d" ? "active" : ""}`} onClick={() => setTimeRange("30d")}>
									30d
								</button>
							</div>
						</div>
					</div>

					{trendData.length > 0 ? (
						<div className="trend-chart-container">
							<ResponsiveContainer width="100%" height={300}>
								<AreaChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
									<defs>
										<linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
											<stop offset="5%" stopColor="var(--primary-500)" stopOpacity={0.8} />
											<stop offset="95%" stopColor="var(--primary-500)" stopOpacity={0.1} />
										</linearGradient>
									</defs>
									<CartesianGrid strokeDasharray="3 3" vertical={false} />
									<XAxis dataKey="time" angle={-45} textAnchor="end" tick={{ fontSize: 10 }} height={70} interval={Math.ceil(trendData.length / 10)} />
									<YAxis />
									<Tooltip
										formatter={(value) => [
											`${value}${selectedPollutant === "aqi" ? "" : selectedPollutant === "co" ? " ppm" : " μg/m³"}`,
											selectedPollutant === "aqi" ? "AQI" : selectedPollutant.toUpperCase(),
										]}
										labelFormatter={(label) => `Time: ${label}`}
									/>
									<Legend verticalAlign="top" height={36} />
									<Area
										type="monotone"
										dataKey="value"
										name={selectedPollutant === "aqi" ? "AQI" : selectedPollutant.toUpperCase()}
										stroke="var(--primary-600)"
										fillOpacity={1}
										fill="url(#colorValue)"
									/>
									{/* Add threshold reference line */}
									<Line type="monotone" dataKey="threshold" name="Threshold" stroke="var(--error-500)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
								</AreaChart>
							</ResponsiveContainer>
						</div>
					) : (
						<p className="no-data">No trend data available for chart.</p>
					)}
				</section>

				<section className="dashboard-alerts">
					<h3>Critical Alerts</h3>
					{alerts.length > 0 ? (
						<div className="alerts-summary">
							<p className="alert-count">
								There are <strong>{alerts.length}</strong> active critical alerts.
							</p>

							<div className="alert-map-container">
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
												<div className="alert-popup">
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
													<p>
														<strong>Location:</strong> {alert.location || "Unknown"}
													</p>
												</div>
											</Popup>
										</Circle>
									))}
								</MapContainer>
							</div>

							<div className="alerts-list">
								{alerts.slice(0, 3).map((alert) => (
									<div key={alert.id} className={`alert-item severity-${alert.severity_level}`}>
										<div className="alert-pollutant">{alert.pollutant.toUpperCase()}</div>
										<div className="alert-details">
											<div className="alert-value">Current: {alert.current_value.toFixed(2)}</div>
											<div className="alert-location">{alert.location || "Unknown location"}</div>
										</div>
										<div className="alert-severity">Level {alert.severity_level}</div>
									</div>
								))}
								{alerts.length > 3 && (
									<div className="more-alerts">
										<span>+{alerts.length - 3} more alerts</span>
									</div>
								)}
							</div>
						</div>
					) : (
						<p className="no-alerts">No critical alerts at this time.</p>
					)}

					{airQuality && <WeatherWidget temperature={airQuality.temperature} humidity={airQuality.humidity} windSpeed={airQuality.wind_speed} pressure={airQuality.pressure} />}
				</section>
			</div>

			<style jsx>{`
				.dashboard {
					width: 100%;
				}

				.dashboard-header {
					display: flex;
					justify-content: space-between;
					align-items: center;
					margin-bottom: var(--space-4);
				}

				.dashboard-header h2 {
					margin-bottom: 0;
				}

				.last-updated {
					color: var(--text-tertiary);
					font-size: var(--font-size-sm);
					font-style: italic;
				}

				.dashboard-summary {
					display: grid;
					grid-template-columns: 1fr;
					gap: var(--space-5);
					margin-bottom: var(--space-6);
				}

				.aqi-overview {
					background-color: var(--bg-secondary);
					padding: var(--space-4);
					border-radius: var(--radius-md);
					box-shadow: var(--elevation-1);
				}

				.aqi-container {
					margin: var(--space-4) 0;
				}

				.aqi-gauge-container {
					position: relative;
					padding: var(--space-4) 0;
				}

				.aqi-gauge-track {
					height: 16px;
					background: linear-gradient(
						to right,
						var(--aqi-good) 0%,
						var(--aqi-good) 20%,
						var(--aqi-moderate) 20%,
						var(--aqi-moderate) 40%,
						var(--aqi-sensitive) 40%,
						var(--aqi-sensitive) 60%,
						var(--aqi-unhealthy) 60%,
						var(--aqi-unhealthy) 80%,
						var(--aqi-very-unhealthy) 80%,
						var(--aqi-very-unhealthy) 90%,
						var(--aqi-hazardous) 90%,
						var(--aqi-hazardous) 100%
					);
					border-radius: var(--radius-full);
					width: 100%;
					position: relative;
				}

				.aqi-gauge-progress {
					position: absolute;
					top: 0;
					left: 0;
					height: 100%;
					border-radius: var(--radius-full);
				}

				.aqi-gauge-labels {
					display: flex;
					justify-content: space-between;
					margin-top: var(--space-1);
					font-size: var(--font-size-xs);
					color: var(--text-tertiary);
				}

				.aqi-gauge-value-container {
					display: flex;
					justify-content: center;
					margin-top: var(--space-3);
				}

				.aqi-gauge-value {
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: center;
					padding: var(--space-2) var(--space-4);
					border-radius: var(--radius-md);
					min-width: 100px;
					text-align: center;
				}

				.aqi-value {
					font-size: var(--font-size-2xl);
					font-weight: var(--font-weight-bold);
				}

				.aqi-label {
					font-size: var(--font-size-sm);
				}

				.aqi-gauge-value.aqi-good {
					background-color: var(--aqi-good);
					color: var(--text-primary);
				}

				.aqi-gauge-value.aqi-moderate {
					background-color: var(--aqi-moderate);
					color: var(--text-primary);
				}

				.aqi-gauge-value.aqi-unhealthy-sensitive {
					background-color: var(--aqi-sensitive);
					color: white;
				}

				.aqi-gauge-value.aqi-unhealthy {
					background-color: var(--aqi-unhealthy);
					color: white;
				}

				.aqi-gauge-value.aqi-very-unhealthy {
					background-color: var(--aqi-very-unhealthy);
					color: white;
				}

				.aqi-gauge-value.aqi-hazardous {
					background-color: var(--aqi-hazardous);
					color: white;
				}

				.health-tips {
					margin-top: var(--space-4);
					padding: var(--space-3);
					background-color: var(--neutral-50);
					border-radius: var(--radius-md);
					border-left: 4px solid var(--info-500);
				}

				.health-tips h4 {
					margin-bottom: var(--space-2);
					color: var(--text-secondary);
					font-weight: var(--font-weight-medium);
				}

				.health-tips p {
					margin-bottom: 0;
					font-size: var(--font-size-sm);
					line-height: var(--line-height-normal);
				}

				.stats-container {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
					gap: var(--space-3);
				}

				.stat-card {
					background-color: var(--bg-secondary);
					padding: var(--space-3);
					border-radius: var(--radius-md);
					box-shadow: var(--elevation-1);
					display: flex;
					align-items: center;
					transition: var(--transition);
				}

				.stat-card:hover {
					transform: translateY(-3px);
					box-shadow: var(--elevation-2);
				}

				.stat-icon {
					font-size: var(--font-size-2xl);
					margin-right: var(--space-3);
				}

				.stat-content {
					flex: 1;
				}

				.stat-content h3 {
					margin: 0;
					font-size: var(--font-size-sm);
					font-weight: var(--font-weight-medium);
					color: var(--text-tertiary);
				}

				.stat-value {
					font-size: var(--font-size-lg);
					font-weight: var(--font-weight-bold);
					color: var(--text-primary);
					display: flex;
					align-items: baseline;
					flex-wrap: wrap;
				}

				.stat-unit {
					font-size: var(--font-size-sm);
					color: var(--text-tertiary);
					margin-left: var(--space-1);
					font-weight: var(--font-weight-regular);
				}

				.trend {
					margin-left: var(--space-2);
					font-size: var(--font-size-sm);
					font-weight: var(--font-weight-medium);
				}

				.trend.up {
					color: var(--error-500);
				}

				.trend.down {
					color: var(--success-500);
				}

				.trend.neutral {
					color: var(--neutral-500);
				}

				.dashboard-content {
					display: grid;
					grid-template-columns: 1fr;
					gap: var(--space-5);
				}

				.dashboard-chart,
				.dashboard-alerts {
					background-color: var(--bg-secondary);
					padding: var(--space-4);
					border-radius: var(--radius-md);
					box-shadow: var(--elevation-1);
				}

				.chart-header {
					display: flex;
					justify-content: space-between;
					align-items: center;
					flex-wrap: wrap;
					margin-bottom: var(--space-3);
					gap: var(--space-3);
				}

				.chart-header h3 {
					margin: 0;
				}

				.chart-controls {
					display: flex;
					gap: var(--space-3);
					align-items: center;
					flex-wrap: wrap;
				}

				.select-input {
					padding: var(--space-1) var(--space-2);
					border-radius: var(--radius-md);
					border: 1px solid var(--neutral-300);
					background-color: var(--bg-secondary);
					font-size: var(--font-size-sm);
					min-width: 120px;
				}

				.time-range-buttons {
					display: flex;
				}

				.time-button {
					background: var(--neutral-100);
					border: 1px solid var(--neutral-300);
					color: var(--text-secondary);
					font-size: var(--font-size-xs);
					padding: var(--space-1) var(--space-2);
					margin: 0;
					border-radius: 0;
				}

				.time-button:first-child {
					border-top-left-radius: var (--radius-md);
					border-bottom-left-radius: var(--radius-md);
				}

				.time-button:last-child {
					border-top-right-radius: var(--radius-md);
					border-bottom-right-radius: var(--radius-md);
				}

				.time-button.active {
					background-color: var(--primary-600);
					border-color: var(--primary-600);
					color: white;
					font-weight: var(--font-weight-medium);
				}

				.trend-chart-container {
					margin-top: var(--space-4);
				}

				.alerts-summary {
					margin-bottom: var(--space-4);
				}

				.alert-count {
					margin-bottom: var(--space-3);
				}

				.alert-map-container {
					margin-bottom: var(--space-4);
					border-radius: var(--radius-md);
					overflow: hidden;
				}

				.alert-popup {
					min-width: 200px;
				}

				.alert-popup h4 {
					margin-bottom: var(--space-2);
					font-size: var(--font-size-md);
				}

				.alert-popup p {
					margin-bottom: var(--space-1);
					font-size: var(--font-size-sm);
				}

				.alerts-list {
					margin-top: var(--space-3);
				}

				.alert-item {
					display: flex;
					align-items: center;
					padding: var(--space-2) var(--space-3);
					background-color: var(--neutral-50);
					border-radius: var(--radius-md);
					margin-bottom: var(--space-2);
					border-left: 4px solid transparent;
				}

				.alert-item.severity-3 {
					border-left-color: var(--aqi-unhealthy);
				}

				.alert-item.severity-4 {
					border-left-color: var(--aqi-very-unhealthy);
				}

				.alert-item.severity-5 {
					border-left-color: var(--aqi-hazardous);
				}

				.alert-pollutant {
					font-weight: var(--font-weight-bold);
					min-width: 60px;
				}

				.alert-details {
					flex: 1;
					font-size: var(--font-size-sm);
				}

				.alert-value {
					font-family: var(--font-family-mono);
					font-size: var(--font-size-xs);
				}

				.alert-location {
					color: var(--text-tertiary);
					font-size: var(--font-size-xs);
				}

				.alert-severity {
					background-color: var(--error-500);
					color: white;
					font-size: var(--font-size-xs);
					padding: var(--space-1) var(--space-2);
					border-radius: var(--radius-full);
					font-weight: var(--font-weight-medium);
				}

				.more-alerts {
					text-align: center;
					color: var(--text-tertiary);
					font-size: var(--font-size-sm);
					margin-top: var(--space-2);
				}

				.no-data,
				.no-alerts {
					padding: var(--space-4);
					text-align: center;
					background-color: var(--neutral-50);
					border-radius: var(--radius-md);
					color: var(--text-tertiary);
				}

				.weather-widget {
					margin-top: var(--space-4);
					padding-top: var(--space-4);
					border-top: 1px solid var(--neutral-200);
				}

				.weather-widget h3 {
					margin-bottom: var(--space-3);
					color: var(--text-secondary);
					font-size: var(--font-size-md);
				}

				.weather-grid {
					display: grid;
					grid-template-columns: repeat(2, 1fr);
					gap: var(--space-3);
				}

				.weather-item {
					display: flex;
					align-items: center;
					background-color: var(--neutral-50);
					border-radius: var(--radius-md);
					padding: var(--space-2) var(--space-3);
				}

				.weather-icon {
					font-size: var(--font-size-xl);
					margin-right: var(--space-3);
				}

				.weather-data {
					display: flex;
					flex-direction: column;
				}

				.weather-value {
					font-weight: var(--font-weight-semibold);
				}

				.weather-label {
					font-size: var(--font-size-xs);
					color: var(--text-tertiary);
				}

				/* Responsive styles */
				@media (min-width: 768px) {
					.dashboard-summary {
						grid-template-columns: 1fr 1fr;
					}
				}

				@media (min-width: 992px) {
					.dashboard-content {
						grid-template-columns: 3fr 2fr;
					}
				}
			`}</style>
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

function getLevelLabel(level) {
	switch (level) {
		case "good":
			return "Good";
		case "moderate":
			return "Moderate";
		case "unhealthy-sensitive":
			return "Unhealthy for Sensitive Groups";
		case "unhealthy":
			return "Unhealthy";
		case "very-unhealthy":
			return "Very Unhealthy";
		case "hazardous":
			return "Hazardous";
		default:
			return "Unknown";
	}
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
