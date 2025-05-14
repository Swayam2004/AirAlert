import React, { useState, useEffect } from "react";
import API from "../services/api";
// Using dynamic imports to avoid build errors if packages aren't available
import "../styles/index.css";

function DataExplorer() {
	const [stationList, setStationList] = useState([]);
	const [selectedStation, setSelectedStation] = useState("");
	const [pollutantType, setPollutantType] = useState("PM25");
	const [dateRange, setDateRange] = useState({
		start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
		end: new Date().toISOString().split("T")[0],
	});
	const [chartData, setChartData] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	// Fetch list of stations when component loads
	useEffect(() => {
		const fetchStations = async () => {
			try {
				const response = await API.getMonitoringStations();
				setStationList(response.data.stations || []);
			} catch (err) {
				setError("Failed to fetch monitoring stations");
				console.error(err);
			}
		};

		fetchStations();
	}, []);

	const fetchData = async () => {
		if (!selectedStation) {
			setError("Please select a monitoring station");
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const response = await API.getTimeSeriesData(selectedStation, pollutantType, dateRange.start, dateRange.end);

			const data = response.data;

			const chartData = {
				labels: data.map((item) => new Date(item.timestamp).toLocaleString()),
				datasets: [
					{
						label: `${pollutantType} Levels`,
						data: data.map((item) => item.value),
						borderColor: "rgba(75, 192, 192, 1)",
						backgroundColor: "rgba(75, 192, 192, 0.2)",
					},
				],
			};

			setChartData(chartData);
			setLoading(false);
		} catch (err) {
			setError("Failed to fetch data");
			setLoading(false);
			console.error(err);
		}
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		fetchData();
	};

	return (
		<div className="explorer-container">
			<h2>Air Quality Data Explorer</h2>

			<form onSubmit={handleSubmit} className="explorer-form">
				<div className="form-group">
					<label htmlFor="station">Monitoring Station</label>
					<select id="station" value={selectedStation} onChange={(e) => setSelectedStation(e.target.value)} required>
						<option value="">Select a station</option>
						{stationList.map((station) => (
							<option key={station.id} value={station.id}>
								{station.name}
							</option>
						))}
					</select>
				</div>

				<div className="form-group">
					<label htmlFor="pollutant">Pollutant Type</label>
					<select id="pollutant" value={pollutantType} onChange={(e) => setPollutantType(e.target.value)}>
						<option value="PM25">PM2.5</option>
						<option value="PM10">PM10</option>
						<option value="O3">Ozone (O₃)</option>
						<option value="NO2">Nitrogen Dioxide (NO₂)</option>
						<option value="SO2">Sulfur Dioxide (SO₂)</option>
						<option value="CO">Carbon Monoxide (CO)</option>
					</select>
				</div>

				<div className="date-range">
					<div className="form-group">
						<label htmlFor="start-date">Start Date</label>
						<input type="date" id="start-date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} required />
					</div>

					<div className="form-group">
						<label htmlFor="end-date">End Date</label>
						<input type="date" id="end-date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} required />
					</div>
				</div>

				<button type="submit" className="primary-button" disabled={loading}>
					{loading ? "Loading Data..." : "Fetch Data"}
				</button>
			</form>

			{error && <div className="error-message">{error}</div>}

			<div className="chart-container">
				{loading && <div className="loading">Loading data...</div>}{" "}
				{chartData && !loading && (
					<div className="chart-placeholder">
						<h3>Data loaded successfully</h3>
						<p>Data visualization would be displayed here.</p>
						<p>Install chart.js and react-chartjs-2 packages to enable interactive charts.</p>
						<pre>{JSON.stringify(chartData.datasets[0].data.slice(0, 5), null, 2)}...</pre>
					</div>
				)}
				{!chartData && !loading && !error && <div className="no-data">Select parameters and fetch data to display chart</div>}
			</div>

			<div className="data-explanation">
				<h3>Understanding the Data</h3>
				<p>Different pollutants have different health implications and are measured in different units:</p>
				<ul>
					<li>
						<strong>PM2.5 & PM10:</strong> Particulate matter measured in micrograms per cubic meter (μg/m³)
					</li>
					<li>
						<strong>Ozone, NO₂, SO₂, CO:</strong> Gases measured in parts per million (ppm)
					</li>
				</ul>
				<p>The EPA has established different thresholds for each pollutant that indicate various levels of health concern.</p>
			</div>
		</div>
	);
}

export default DataExplorer;
