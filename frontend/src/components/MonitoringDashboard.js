import React, { useEffect, useState } from "react";
import API from "../services/api";
import HeroSection from "./HeroSection";
import StatCard from "./StatCard";
import "../styles/index.css";

function MonitoringDashboard() {
	const [stations, setStations] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		const fetchStations = async () => {
			try {
				const response = await API.getMonitoringStations();
				setStations(response.data);
				setLoading(false);
			} catch (err) {
				setError(err.message);
				setLoading(false);
			}
		};

		fetchStations();
	}, []);

	if (loading) return <div>Loading...</div>;
	if (error) return <div>Error: {error}</div>;

	return (
		<div className="dashboard container">
			<HeroSection aqi={85} />
			<div className="stats-container">
				{stations.map((station, index) => (
					<StatCard key={index} title={station.name} value={station.aqi} unit="AQI" icon="📍" />
				))}
			</div>

			<section className="charts-container mt-5">
				<h2 className="text-primary">Air Quality Trends</h2>
				<div className="chart-placeholder">Time Series Chart Placeholder</div>
				<div className="chart-placeholder">Heatmap Placeholder</div>
			</section>

			<section className="map-container mt-5">
				<h2 className="text-primary">Monitoring Stations</h2>
				<div className="map-placeholder">Map Placeholder</div>
			</section>
		</div>
	);
}

export default MonitoringDashboard;
