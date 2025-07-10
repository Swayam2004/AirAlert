import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import PollutionHeatmap from "./PollutionHeatmap";
import TimeSeriesChart from "./TimeSeriesChart";
import StatCard from "./StatCard";
import WeatherCorrelationPanel from "./WeatherCorrelationPanel";
import SocialSharePanel from "./SocialSharePanel";
import { EnhancedContributionCalendar, EnhancedTimeSeriesChart, EnhancedRegionalComparison } from "./enhanced";
import mockApi from "../services/mockDataService";
import "../styles/AdvancedMonitoringDashboard.css";
import "../styles/AdvancedMonitoringDashboard-additions.css";

/**
 * Advanced Monitoring Stations Dashboard Component
 * Features:
 * - Multi-parameter heatmap visualization
 * - GitHub-style contribution calendar
 * - Regional comparison tools
 * - Time-series analysis
 * - Station management features
 */
const AdvancedMonitoringDashboard = () => {
	// State management
	const [stations, setStations] = useState([]);
	const [airQualityData, setAirQualityData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [selectedPollutant, setSelectedPollutant] = useState("pm25");
	const [timeRange, setTimeRange] = useState("week");
	const [selectedRegions, setSelectedRegions] = useState([]);
	const [viewMode, setViewMode] = useState("map"); // map, calendar, comparison, timeseries
	const [useApiData, setUseApiData] = useState(true); // Toggle between real API and mock data
	const [calendarData, setCalendarData] = useState([]);
	const [activeTabIndex, setActiveTabIndex] = useState(0); // Track current tab for sharing and state persistence
	const [dateRange, setDateRange] = useState({
		start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
		end: new Date(),
	});

	// Pollutant configuration with color schemes and thresholds
	const pollutantConfig = {
		pm25: {
			label: "PM2.5",
			unit: "μg/m³",
			color: "#3498db",
			thresholds: [0, 12, 35.5, 55.5, 150.5, 250.5],
			colors: ["#00e400", "#ffff00", "#ff7e00", "#ff0000", "#8f3f97", "#7e0023"],
		},
		pm10: {
			label: "PM10",
			unit: "μg/m³",
			color: "#2ecc71",
			thresholds: [0, 55, 155, 255, 355, 425],
			colors: ["#00e400", "#ffff00", "#ff7e00", "#ff0000", "#8f3f97", "#7e0023"],
		},
		o3: {
			label: "Ozone",
			unit: "ppb",
			color: "#9b59b6",
			thresholds: [0, 54, 70, 85, 105, 200],
			colors: ["#00e400", "#ffff00", "#ff7e00", "#ff0000", "#8f3f97", "#7e0023"],
		},
		no2: {
			label: "NO₂",
			unit: "ppb",
			color: "#e74c3c",
			thresholds: [0, 53, 100, 360, 649, 1249],
			colors: ["#00e400", "#ffff00", "#ff7e00", "#ff0000", "#8f3f97", "#7e0023"],
		},
		so2: {
			label: "SO₂",
			unit: "ppb",
			color: "#f39c12",
			thresholds: [0, 35, 75, 185, 304, 604],
			colors: ["#00e400", "#ffff00", "#ff7e00", "#ff0000", "#8f3f97", "#7e0023"],
		},
		co: {
			label: "CO",
			unit: "ppm",
			color: "#34495e",
			thresholds: [0, 4.4, 9.4, 12.4, 15.4, 30.4],
			colors: ["#00e400", "#ffff00", "#ff7e00", "#ff0000", "#8f3f97", "#7e0023"],
		},
		aqi: {
			label: "AQI",
			unit: "",
			color: "#e67e22",
			thresholds: [0, 50, 100, 150, 200, 300],
			colors: ["#00e400", "#ffff00", "#ff7e00", "#ff0000", "#8f3f97", "#7e0023"],
		},
	};

	// Fetch monitoring stations
	useEffect(() => {
		const fetchStations = async () => {
			try {
				let stationsData;

				if (useApiData) {
					try {
						// Try to fetch from real API
						const response = await axios.get("/api/monitoring_stations");
						stationsData = response.data.stations;
					} catch (apiError) {
						console.warn("API request failed, using mock data:", apiError);
						// Fallback to mock data
						const mockResponse = await mockApi.getStations();
						stationsData = mockResponse.stations;
						setUseApiData(false); // Switch to mock data mode
					}
				} else {
					// Use mock data directly
					const mockResponse = await mockApi.getStations();
					stationsData = mockResponse.stations;
				}

				setStations(stationsData);

				// Set default selected regions
				if (stationsData && stationsData.length > 0) {
					setSelectedRegions(stationsData.slice(0, 3));
				}
			} catch (err) {
				console.error("Error fetching stations:", err);
				setError("Failed to fetch monitoring stations");
			}
		};

		fetchStations();
	}, [useApiData]);

	// Fetch air quality data based on selected parameters
	useEffect(() => {
		const fetchAirQualityData = async () => {
			setLoading(true);
			try {
				const stationIds = selectedRegions.length > 0 ? selectedRegions.map((r) => r.id).join(",") : "";

				const start = dateRange.start.toISOString().split("T")[0];
				const end = dateRange.end.toISOString().split("T")[0];

				let airQualityResult;

				if (useApiData) {
					try {
						// Try to fetch from real API
						const response = await axios.get("/api/air_quality", {
							params: {
								station_id: stationIds || undefined,
								pollutant: selectedPollutant !== "all" ? selectedPollutant : undefined,
								start_date: start,
								end_date: end,
							},
						});
						airQualityResult = response.data.readings;
					} catch (apiError) {
						console.warn("API request failed, using mock data:", apiError);
						// Fallback to mock data
						const params = {
							station_id: stationIds || undefined,
							start_date: start,
							end_date: end,
						};
						const mockResponse = await mockApi.getAirQuality(params);
						airQualityResult = mockResponse.readings;
						setUseApiData(false); // Switch to mock data mode
					}
				} else {
					// Use mock data directly
					const params = {
						station_id: stationIds || undefined,
						start_date: start,
						end_date: end,
					};
					const mockResponse = await mockApi.getAirQuality(params);
					airQualityResult = mockResponse.readings;
				}

				setAirQualityData(airQualityResult);

				// Process data for calendar view
				processCalendarData(airQualityResult);

				setLoading(false);
			} catch (err) {
				console.error("Error fetching air quality data:", err);
				setError("Failed to fetch air quality data");
				setLoading(false);
			}
		};

		// Only fetch if we have stations or selectedRegions
		if (stations.length > 0 || selectedRegions.length > 0) {
			fetchAirQualityData();
		}
	}, [selectedPollutant, dateRange, selectedRegions, timeRange, useApiData]);

	// Process data for the calendar view
	const processCalendarData = (data) => {
		if (!data || data.length === 0) return;

		// Transform air quality data to calendar format
		const calendar = data.map((reading) => ({
			date: reading.timestamp.split("T")[0],
			value: reading[selectedPollutant] || 0,
			pollutant: selectedPollutant,
			location: reading.station_name || reading.station_id,
		}));

		setCalendarData(calendar);
	};

	// Generate summary statistics
	const statistics = useMemo(() => {
		if (!airQualityData || airQualityData.length === 0) {
			return {
				average: 0,
				max: 0,
				min: 0,
				stationCount: 0,
			};
		}

		const values = airQualityData.map((reading) => reading[selectedPollutant]).filter((val) => val !== null && val !== undefined);

		return {
			average: values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2) : 0,
			max: values.length ? Math.max(...values).toFixed(2) : 0,
			min: values.length ? Math.min(...values).toFixed(2) : 0,
			stationCount: new Set(airQualityData.map((reading) => reading.station_id)).size,
		};
	}, [airQualityData, selectedPollutant]);

	// Render loading state
	if (loading && !stations.length) {
		return <div className="loading-container">Loading monitoring dashboard...</div>;
	}

	// Render error state
	if (error) {
		return <div className="error-container">Error: {error}</div>;
	}

	return (
		<div className="advanced-monitoring-dashboard" role="main" aria-labelledby="dashboard-title">
			<header className="dashboard-header">
				<h1 id="dashboard-title">Advanced Monitoring Stations Dashboard</h1>

				{/* Pollutant selector */}
				<div className="control-panel">
					<div className="selector-group data-source-selector">
						<label>Data Source:</label>
						<div className="toggle-switch">
							<input type="checkbox" id="data-source-toggle" checked={useApiData} onChange={() => setUseApiData(!useApiData)} />
							<label htmlFor="data-source-toggle">
								<span className="toggle-label">{useApiData ? "Live API" : "Mock Data"}</span>
							</label>
						</div>
					</div>

					<div className="selector-group pollutant-selector">
						<label>Parameter:</label>
						<select id="pollutant-selector" aria-label="Select air quality parameter" value={selectedPollutant} onChange={(e) => setSelectedPollutant(e.target.value)}>
							<option value="pm25">PM2.5</option>
							<option value="pm10">PM10</option>
							<option value="o3">Ozone (O₃)</option>
							<option value="no2">Nitrogen Dioxide (NO₂)</option>
							<option value="so2">Sulfur Dioxide (SO₂)</option>
							<option value="co">Carbon Monoxide (CO)</option>
							<option value="aqi">Air Quality Index (AQI)</option>
						</select>
					</div>

					{/* Time range selector */}
					<div className="selector-group time-range-selector">
						<label>Time Range:</label>
						<select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
							<option value="day">24 Hours</option>
							<option value="week">7 Days</option>
							<option value="month">30 Days</option>
							<option value="year">1 Year</option>
						</select>
					</div>

					{/* Date range selector */}
					<div className="date-range-controls">
						<label>From:</label>
						<input
							type="date"
							value={dateRange.start.toISOString().split("T")[0]}
							onChange={(e) =>
								setDateRange({
									...dateRange,
									start: new Date(e.target.value),
								})
							}
						/>
						<label>To:</label>
						<input
							type="date"
							value={dateRange.end.toISOString().split("T")[0]}
							onChange={(e) =>
								setDateRange({
									...dateRange,
									end: new Date(e.target.value),
								})
							}
						/>
					</div>
				</div>
			</header>

			{/* Statistics Summary Cards */}
			<div className="stat-cards-container">
				<StatCard
					title={`Average ${pollutantConfig[selectedPollutant].label}`}
					value={statistics.average}
					unit={pollutantConfig[selectedPollutant].unit}
					icon="chart-line"
					color={pollutantConfig[selectedPollutant].color}
				/>
				<StatCard title={`Max ${pollutantConfig[selectedPollutant].label}`} value={statistics.max} unit={pollutantConfig[selectedPollutant].unit} icon="arrow-up" color="#e74c3c" />
				<StatCard title={`Min ${pollutantConfig[selectedPollutant].label}`} value={statistics.min} unit={pollutantConfig[selectedPollutant].unit} icon="arrow-down" color="#2ecc71" />
				<StatCard title="Monitoring Stations" value={statistics.stationCount} unit="stations" icon="broadcast-tower" color="#9b59b6" />
			</div>

			{/* Social Sharing Panel */}
			<SocialSharePanel
				data={airQualityData}
				selectedPollutant={selectedPollutant}
				pollutantConfig={pollutantConfig}
				dashboardState={{
					timeRange,
					dateRange,
					selectedRegions,
					activeTabIndex,
					viewMode,
				}}
			/>

			{/* Main Content with Tabs */}
			<Tabs className="dashboard-tabs" selectedIndex={activeTabIndex} onSelect={(index) => setActiveTabIndex(index)}>
				<TabList>
					<Tab>Heatmap Visualization</Tab>
					<Tab>Contribution Calendar</Tab>
					<Tab>Regional Comparison</Tab>
					<Tab>Time Series Analysis</Tab>
					<Tab>Weather Correlation</Tab>
					<Tab>Station Management</Tab>
				</TabList>

				{/* Heatmap Tab */}
				<TabPanel>
					<div className="tab-content heatmap-container">
						<div className="visualization-header">
							<h2>{pollutantConfig[selectedPollutant].label} Heatmap</h2>
							<div className="legend">
								{pollutantConfig[selectedPollutant].thresholds.map((threshold, i) => {
									// Don't show last threshold in legend
									if (i === pollutantConfig[selectedPollutant].thresholds.length - 1) return null;

									const nextThreshold = pollutantConfig[selectedPollutant].thresholds[i + 1];
									return (
										<div className="legend-item" key={`legend-${i}`}>
											<div className="color-box" style={{ backgroundColor: pollutantConfig[selectedPollutant].colors[i] }}></div>
											<span>
												{threshold} - {nextThreshold} {pollutantConfig[selectedPollutant].unit}
											</span>
										</div>
									);
								})}
							</div>
						</div>
						<div className="map-container">
							<PollutionHeatmap data={airQualityData} stations={stations} selectedPollutant={selectedPollutant} height="500px" showStations={true} />
						</div>
					</div>
				</TabPanel>

				{/* Contribution Calendar Tab */}
				<TabPanel>
					<div className="tab-content calendar-container">
						<div className="visualization-header">
							<h2>{pollutantConfig[selectedPollutant].label} Historical Trends</h2>
							<div className="sub-controls">
								<button className={timeRange === "month" ? "active" : ""} onClick={() => setTimeRange("month")}>
									Month View
								</button>
								<button className={timeRange === "year" ? "active" : ""} onClick={() => setTimeRange("year")}>
									Year View
								</button>
							</div>
						</div>
						<EnhancedContributionCalendar
							data={calendarData}
							selectedPollutant={selectedPollutant}
							startDate={dateRange.start}
							endDate={dateRange.end}
							tooltipUnit={pollutantConfig[selectedPollutant].unit}
							colorRange={pollutantConfig[selectedPollutant].colors}
						/>
					</div>
				</TabPanel>

				{/* Regional Comparison Tab */}
				<TabPanel>
					<div className="tab-content comparison-container">
						<div className="visualization-header">
							<h2>Regional Comparison</h2>
							<div className="region-selector">
								<label>Select Regions to Compare:</label>
								<select
									multiple
									value={selectedRegions.map((r) => r.id)}
									onChange={(e) => {
										const selectedIds = Array.from(e.target.selectedOptions, (option) => option.value);
										const selectedStations = stations.filter((station) => selectedIds.includes(station.id.toString()));
										setSelectedRegions(selectedStations);
									}}
								>
									{stations.map((station) => (
										<option key={station.id} value={station.id}>
											{station.name || station.station_code} - {station.city}
										</option>
									))}
								</select>
							</div>
						</div>
						{selectedRegions.length >= 2 ? (
							<div className="comparison-view">
								<EnhancedRegionalComparison
									data={airQualityData}
									regions={selectedRegions.map((r) => r.id)}
									pollutant={selectedPollutant}
									chartType="bar"
									showDelta={true}
									threshold={pollutantConfig[selectedPollutant].thresholds[1]} // Safe threshold
									timeRange={timeRange}
									height={400}
									splitView={true}
								/>
							</div>
						) : (
							<div className="instructions">Please select at least two regions to compare</div>
						)}

						{/* Split-screen comparison view */}
						{selectedRegions.length === 2 && (
							<div className="split-comparison">
								<div className="split-view">
									<h3>{selectedRegions[0].name || selectedRegions[0].station_code}</h3>
									<div className="metrics">
										{airQualityData.filter((d) => d.station_id === selectedRegions[0].id).slice(-1)[0] && (
											<div className="current-value">
												Current: {airQualityData.filter((d) => d.station_id === selectedRegions[0].id).slice(-1)[0][selectedPollutant]}
												{pollutantConfig[selectedPollutant].unit}
											</div>
										)}
									</div>
								</div>
								<div className="split-view">
									<h3>{selectedRegions[1].name || selectedRegions[1].station_code}</h3>
									<div className="metrics">
										{airQualityData.filter((d) => d.station_id === selectedRegions[1].id).slice(-1)[0] && (
											<div className="current-value">
												Current: {airQualityData.filter((d) => d.station_id === selectedRegions[1].id).slice(-1)[0][selectedPollutant]}
												{pollutantConfig[selectedPollutant].unit}
											</div>
										)}
									</div>
								</div>
							</div>
						)}
					</div>
				</TabPanel>

				{/* Time Series Analysis Tab */}
				<TabPanel>
					<div className="tab-content timeseries-container">
						<div className="visualization-header">
							<h2>Time Series Analysis</h2>
							<div className="sub-controls">
								<label>
									<input type="checkbox" checked={viewMode === "advanced"} onChange={() => setViewMode(viewMode === "advanced" ? "simple" : "advanced")} />
									Show Moving Averages
								</label>
								<div className="export-dropdown" role="menu" aria-label="Export data options" tabIndex="0">
									<button className="export-btn" aria-haspopup="true" aria-expanded="false">
										Export Data
									</button>
									<div className="export-dropdown-content" role="menu">
										<button onClick={() => exportData("csv")} role="menuitem" tabIndex="-1">
											CSV
										</button>
										<button onClick={() => exportData("json")} role="menuitem" tabIndex="-1">
											JSON
										</button>
										<button onClick={() => exportData("excel")} role="menuitem" tabIndex="-1">
											Excel-compatible
										</button>
									</div>
								</div>
							</div>
						</div>
						<EnhancedTimeSeriesChart
							data={airQualityData}
							selectedPollutants={[selectedPollutant]}
							pollutantColors={{
								[selectedPollutant]: pollutantConfig[selectedPollutant].color,
							}}
							dateRange={{
								start: dateRange.start,
								end: dateRange.end,
							}}
							thresholds={{
								[selectedPollutant]: pollutantConfig[selectedPollutant].thresholds[1], // Safe threshold
							}}
							showMovingAverage={viewMode === "advanced"}
							showTrendLine={viewMode === "advanced"}
							chartType="line"
							height={500}
							annotations={[]} // Initial empty annotations
						/>
					</div>
				</TabPanel>

				{/* Weather Correlation Tab */}
				<TabPanel>
					<div className="tab-content weather-correlation-container">
						<WeatherCorrelationPanel airQualityData={airQualityData} selectedPollutant={selectedPollutant} pollutantConfig={pollutantConfig} />
					</div>
				</TabPanel>

				{/* Station Management Tab */}
				<TabPanel>
					<div className="tab-content station-management">
						<div className="visualization-header">
							<h2>Station Management</h2>
							<div className="filter-controls">
								<input
									type="text"
									placeholder="Search stations..."
									className="station-search"
									onChange={(e) => {
										// Implement station search functionality
									}}
								/>
								<select className="status-filter">
									<option value="all">All Status</option>
									<option value="active">Active</option>
									<option value="maintenance">Maintenance</option>
									<option value="offline">Offline</option>
								</select>
							</div>
						</div>
						<div className="stations-list">
							<table className="stations-table">
								<thead>
									<tr>
										<th>ID</th>
										<th>Name</th>
										<th>Location</th>
										<th>Status</th>
										<th>Last Updated</th>
										<th>Equipment Health</th>
										<th>Actions</th>
									</tr>
								</thead>
								<tbody>
									{stations.map((station) => (
										<tr key={station.id}>
											<td>{station.id}</td>
											<td>{station.name || station.station_code}</td>
											<td>
												{station.city}, {station.state}, {station.country}
											</td>
											<td>
												<span className={`status-badge ${getStatusClass(station)}`}>{getStationStatus(station)}</span>
											</td>
											<td>{formatDate(station.last_updated)}</td>
											<td>
												<div className="health-bar">
													<div className="health-indicator" style={{ width: `${getEquipmentHealth(station)}%`, backgroundColor: getHealthColor(station) }}></div>
												</div>
											</td>
											<td>
												<button className="view-btn">View Details</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</TabPanel>
			</Tabs>
		</div>
	);

	// Helper function to export data in various formats
	function exportData(format = "csv") {
		if (!airQualityData || airQualityData.length === 0) return;

		let content, mimeType, fileExtension, fileName;
		const timestamp = new Date().toISOString().split("T")[0];

		switch (format.toLowerCase()) {
			case "json":
				// Export as JSON
				content = JSON.stringify(airQualityData, null, 2);
				mimeType = "application/json;charset=utf-8";
				fileExtension = "json";
				break;

			case "excel":
				// Export as Excel (CSV that Excel can open)
				const headers = ["Timestamp", "Station", "Location", "City", "State", "Country", selectedPollutant, "Temperature", "Humidity", "Wind Speed"];
				let excelContent = headers.join(",") + "\n";

				airQualityData.forEach((reading) => {
					const row = [
						`"${reading.timestamp}"`, // Use quotes for timestamps in Excel
						reading.station_id,
						`"${reading.station_name || ""}"`,
						`"${reading.city || ""}"`,
						`"${reading.state || ""}"`,
						`"${reading.country || ""}"`,
						reading[selectedPollutant] || "",
						reading.temperature || "",
						reading.humidity || "",
						reading.wind_speed || "",
					];
					excelContent += row.join(",") + "\n";
				});

				content = excelContent;
				mimeType = "text/csv;charset=utf-8";
				fileExtension = "csv";
				break;

			case "csv":
			default:
				// Export as CSV (default)
				const csvHeaders = ["Timestamp", "Station", "Station_Name", "City", "State", "Country", selectedPollutant];
				let csvContent = csvHeaders.join(",") + "\n";

				airQualityData.forEach((reading) => {
					const row = [reading.timestamp, reading.station_id, reading.station_name || "", reading.city || "", reading.state || "", reading.country || "", reading[selectedPollutant] || ""];
					csvContent += row.join(",") + "\n";
				});

				content = csvContent;
				mimeType = "text/csv;charset=utf-8";
				fileExtension = "csv";
				break;
		}

		fileName = `air_quality_${selectedPollutant}_${timestamp}.${fileExtension}`;

		// Create download link
		const blob = new Blob([content], { type: mimeType });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute("download", fileName);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		// Clean up the URL object
		URL.revokeObjectURL(url);
	}

	// Helper function to format date
	function formatDate(dateString) {
		if (!dateString) return "N/A";
		const date = new Date(dateString);
		return date.toLocaleDateString() + " " + date.toLocaleTimeString();
	}

	// Helper function to get station status
	function getStationStatus(station) {
		if (!station.last_updated) return "Unknown";

		const lastUpdate = new Date(station.last_updated);
		const now = new Date();
		const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);

		if (hoursSinceUpdate < 2) return "Active";
		if (hoursSinceUpdate < 24) return "Maintenance";
		return "Offline";
	}

	// Helper function to get status class for CSS
	function getStatusClass(station) {
		const status = getStationStatus(station);
		return status.toLowerCase();
	}

	// Helper function to get equipment health percentage
	function getEquipmentHealth(station) {
		if (!station.last_updated) return 0;

		const lastUpdate = new Date(station.last_updated);
		const now = new Date();
		const daysSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60 * 24);

		// Simple algorithm: 100% health if updated today, decreases by 10% per day
		const health = Math.max(0, 100 - daysSinceUpdate * 10);
		return health;
	}

	// Helper function to get health color
	function getHealthColor(station) {
		const health = getEquipmentHealth(station);

		if (health > 80) return "#2ecc71"; // Green
		if (health > 60) return "#f1c40f"; // Yellow
		if (health > 40) return "#e67e22"; // Orange
		if (health > 20) return "#e74c3c"; // Red
		return "#7f8c8d"; // Gray
	}
};

export default AdvancedMonitoringDashboard;
