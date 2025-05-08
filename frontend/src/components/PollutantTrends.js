import React, { useState, useEffect } from "react";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import API from "../services/api";

const POLLUTANTS = [
	{ id: "pm25", name: "PM2.5", color: "#8884d8" },
	{ id: "pm10", name: "PM10", color: "#82ca9d" },
	{ id: "o3", name: "Ozone", color: "#ffc658" },
	{ id: "no2", name: "NO2", color: "#ff8042" },
	{ id: "so2", name: "SO2", color: "#0088fe" },
	{ id: "co", name: "CO", color: "#ff0000" },
	{ id: "aqi", name: "AQI", color: "#8b4513" },
];

function PollutantTrends() {
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [selectedPollutants, setSelectedPollutants] = useState(["pm25"]);
	const [timeRange, setTimeRange] = useState("day"); // day, week, month
	const [stationId, setStationId] = useState("");
	const [stations, setStations] = useState([]);

	useEffect(() => {
		// Fetch stations for dropdown
		const fetchStations = async () => {
			try {
				const response = await API.getMonitoringStations();
				setStations(response.data.stations || []);
			} catch (err) {
				console.error("Error fetching stations:", err);
			}
		};

		fetchStations();
	}, []);

	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoading(true);

				// Calculate date range based on timeRange
				const endDate = new Date().toISOString();
				let startDate;

				switch (timeRange) {
					case "week":
						startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
						break;
					case "month":
						startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
						break;
					default: // day
						startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
				}

				const params = {
					start_date: startDate,
					end_date: endDate,
				};

				if (stationId) {
					params.station_id = stationId;
				}

				const response = await API.getAirQuality(params);

				if (response.data && response.data.readings) {
					// Process the data for the chart
					const chartData = response.data.readings.map((reading) => {
						const dateObj = new Date(reading.timestamp);
						return {
							timestamp: dateObj.toLocaleString(),
							date: dateObj,
							...POLLUTANTS.reduce((acc, pollutant) => {
								acc[pollutant.id] = reading[pollutant.id];
								return acc;
							}, {}),
						};
					});

					// Sort by date
					chartData.sort((a, b) => a.date - b.date);

					setData(chartData);
					setError(null);
				}
			} catch (err) {
				console.error("Error fetching pollutant data:", err);
				setError("Failed to load air quality data. Please try again later.");
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [timeRange, stationId]);

	const handlePollutantToggle = (pollutantId) => {
		setSelectedPollutants((prev) => {
			if (prev.includes(pollutantId)) {
				return prev.filter((id) => id !== pollutantId);
			} else {
				return [...prev, pollutantId];
			}
		});
	};

	const handleFetchLatestData = async () => {
		try {
			await API.fetchData();
			alert("Data fetch task started. New data will be available shortly.");
		} catch (err) {
			console.error("Error triggering data fetch:", err);
			alert("Failed to trigger data fetch. Please try again later.");
		}
	};

	if (loading) return <div className="loading">Loading air quality data...</div>;
	if (error) return <div className="error-message">{error}</div>;

	return (
		<section className="pollutant-trends">
			<h2>Air Quality Trends</h2>

			<div className="controls">
				<div className="control-group">
					<label>
						Station:
						<select value={stationId} onChange={(e) => setStationId(e.target.value)}>
							<option value="">All Stations</option>
							{stations.map((station) => (
								<option key={station.id} value={station.id}>
									{station.name}
								</option>
							))}
						</select>
					</label>

					<label>
						Time Range:
						<select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
							<option value="day">Last 24 Hours</option>
							<option value="week">Last Week</option>
							<option value="month">Last Month</option>
						</select>
					</label>

					<button onClick={handleFetchLatestData} className="fetch-button">
						Fetch Latest Data
					</button>
				</div>

				<div className="pollutant-toggles">
					{POLLUTANTS.map((pollutant) => (
						<label key={pollutant.id}>
							<input type="checkbox" checked={selectedPollutants.includes(pollutant.id)} onChange={() => handlePollutantToggle(pollutant.id)} />
							<span style={{ color: pollutant.color }}>{pollutant.name}</span>
						</label>
					))}
				</div>
			</div>

			{data.length > 0 ? (
				<ResponsiveContainer width="100%" height={400}>
					<LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
						<CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
						<XAxis dataKey="timestamp" angle={-30} textAnchor="end" height={60} />
						<YAxis />
						<Tooltip />
						<Legend />
						{POLLUTANTS.filter((p) => selectedPollutants.includes(p.id)).map((pollutant) => (
							<Line key={pollutant.id} type="monotone" dataKey={pollutant.id} stroke={pollutant.color} name={pollutant.name} dot={false} activeDot={{ r: 8 }} />
						))}
					</LineChart>
				</ResponsiveContainer>
			) : (
				<div className="no-data-message">No air quality data available for the selected criteria.</div>
			)}
		</section>
	);
}

export default PollutantTrends;
