import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../styles/designSystem.css";
import "../styles/index.css";

const MonitoringStations = () => {
	const [stations, setStations] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [filters, setFilters] = useState({
		search: "",
		parameter: "all",
		status: "all",
	});
	const [compareMode, setCompareMode] = useState(false);
	const [selectedStations, setSelectedStations] = useState([]);
	const [sortConfig, setSortConfig] = useState({ key: "name", direction: "ascending" });

	useEffect(() => {
		fetchStations();
	}, []);

	const fetchStations = async () => {
		try {
			setLoading(true);
			// Assuming you have an API endpoint for stations
			const response = await fetch("/api/stations");
			if (!response.ok) {
				throw new Error("Failed to fetch stations");
			}
			const data = await response.json();
			setStations(data);
			setLoading(false);
		} catch (err) {
			setError(err.message);
			setLoading(false);
		}
	};

	const getAqiClass = (aqi) => {
		if (aqi <= 50) return "aqi-level-good";
		if (aqi <= 100) return "aqi-level-moderate";
		if (aqi <= 150) return "aqi-level-sensitive";
		if (aqi <= 200) return "aqi-level-unhealthy";
		if (aqi <= 300) return "aqi-level-very-unhealthy";
		return "aqi-level-hazardous";
	};

	const getAqiLabel = (aqi) => {
		if (aqi <= 50) return "Good";
		if (aqi <= 100) return "Moderate";
		if (aqi <= 150) return "Unhealthy for Sensitive Groups";
		if (aqi <= 200) return "Unhealthy";
		if (aqi <= 300) return "Very Unhealthy";
		return "Hazardous";
	};

	const handleFilterChange = (e) => {
		const { name, value } = e.target;
		setFilters((prev) => ({ ...prev, [name]: value }));
	};

	const handleToggleCompare = () => {
		setCompareMode(!compareMode);
		if (compareMode) {
			setSelectedStations([]);
		}
	};

	const handleStationSelect = (station) => {
		if (!compareMode) return;

		setSelectedStations((prev) => {
			if (prev.some((s) => s.id === station.id)) {
				return prev.filter((s) => s.id !== station.id);
			} else if (prev.length < 3) {
				return [...prev, station];
			} else {
				alert("You can compare up to 3 stations at a time");
				return prev;
			}
		});
	};

	const handleSort = (key) => {
		let direction = "ascending";
		if (sortConfig.key === key && sortConfig.direction === "ascending") {
			direction = "descending";
		}
		setSortConfig({ key, direction });
	};

	const filteredStations = stations.filter((station) => {
		const searchMatch = station.name.toLowerCase().includes(filters.search.toLowerCase()) || station.location.toLowerCase().includes(filters.search.toLowerCase());
		const parameterMatch = filters.parameter === "all" || station.parameters.includes(filters.parameter);
		const statusMatch = filters.status === "all" || station.status === filters.status;
		return searchMatch && parameterMatch && statusMatch;
	});

	const sortedStations = React.useMemo(() => {
		const sortableStations = [...filteredStations];
		return sortableStations.sort((a, b) => {
			if (a[sortConfig.key] < b[sortConfig.key]) {
				return sortConfig.direction === "ascending" ? -1 : 1;
			}
			if (a[sortConfig.key] > b[sortConfig.key]) {
				return sortConfig.direction === "ascending" ? 1 : -1;
			}
			return 0;
		});
	}, [filteredStations, sortConfig]);

	const compareStations = () => {
		// This would typically navigate to a comparison view
		console.log("Comparing stations:", selectedStations);
		// Example: history.push('/compare', { stations: selectedStations });
	};

	if (loading) {
		return (
			<div className="monitoring-stations-container">
				<div className="loading-container">
					<div className="loading-spinner"></div>
					<p className="loading-text">Loading stations...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="monitoring-stations-container">
				<div className="error-container">
					<h3>Error</h3>
					<p>{error}</p>
					<button className="btn btn-primary" onClick={fetchStations}>
						Retry
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="monitoring-stations-container">
			<div className="stations-header">
				<h2>Air Quality Monitoring Stations</h2>
				<div className="stations-actions">
					<button className={`btn ${compareMode ? "btn-primary" : "btn-outline"}`} onClick={handleToggleCompare}>
						{compareMode ? "Cancel Comparison" : "Compare Stations"}
					</button>

					{compareMode && selectedStations.length >= 2 && (
						<button className="btn btn-primary" onClick={compareStations}>
							Compare ({selectedStations.length})
						</button>
					)}
				</div>
			</div>

			<div className="stations-filters">
				<div className="filter-group">
					<input type="text" name="search" placeholder="Search stations..." value={filters.search} onChange={handleFilterChange} className="form-control" />
				</div>

				<div className="filter-group">
					<select name="parameter" value={filters.parameter} onChange={handleFilterChange} className="form-control">
						<option value="all">All Parameters</option>
						<option value="pm25">PM2.5</option>
						<option value="pm10">PM10</option>
						<option value="o3">Ozone (O₃)</option>
						<option value="no2">Nitrogen Dioxide (NO₂)</option>
						<option value="so2">Sulfur Dioxide (SO₂)</option>
						<option value="co">Carbon Monoxide (CO)</option>
					</select>
				</div>

				<div className="filter-group">
					<select name="status" value={filters.status} onChange={handleFilterChange} className="form-control">
						<option value="all">All Statuses</option>
						<option value="active">Active</option>
						<option value="maintenance">Maintenance</option>
						<option value="offline">Offline</option>
					</select>
				</div>

				<div className="filter-group">
					<button
						className="btn btn-secondary"
						onClick={() => {
							setSortConfig({ key: "name", direction: "ascending" });
							setFilters({ search: "", parameter: "all", status: "all" });
						}}
					>
						Reset Filters
					</button>
				</div>
			</div>

			{sortedStations.length === 0 ? (
				<div className="no-stations">
					<p>No stations found matching your criteria.</p>
				</div>
			) : (
				<>
					<div className="stations-sort">
						<p>Sort by:</p>
						<button className={`sort-btn ${sortConfig.key === "name" ? "active" : ""}`} onClick={() => handleSort("name")}>
							Name {sortConfig.key === "name" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
						</button>
						<button className={`sort-btn ${sortConfig.key === "aqi" ? "active" : ""}`} onClick={() => handleSort("aqi")}>
							AQI {sortConfig.key === "aqi" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
						</button>
						<button className={`sort-btn ${sortConfig.key === "updatedAt" ? "active" : ""}`} onClick={() => handleSort("updatedAt")}>
							Last Updated {sortConfig.key === "updatedAt" && (sortConfig.direction === "ascending" ? "↑" : "↓")}
						</button>
					</div>

					<div className="stations-grid">
						{sortedStations.map((station) => (
							<div
								key={station.id}
								className={`station-card ${compareMode ? "compare-mode" : ""} ${selectedStations.some((s) => s.id === station.id) ? "selected" : ""}`}
								onClick={() => handleStationSelect(station)}
							>
								{compareMode && (
									<div className="compare-checkbox">
										<input
											type="checkbox"
											checked={selectedStations.some((s) => s.id === station.id)}
											onChange={() => {}} // The parent div's onClick handles this
											className="compare-checkbox-input"
										/>
									</div>
								)}

								<div className="station-header">
									<h3 className="station-name">{station.name}</h3>
									<div className={`station-status ${station.status}`}>
										<span className="status-dot"></span>
										{station.status}
									</div>
								</div>

								<div className="station-location">
									<i className="location-icon">📍</i> {station.location}
								</div>

								<div className={`station-aqi ${getAqiClass(station.aqi)}`}>
									<div className="aqi-value">{station.aqi}</div>
									<div className="aqi-label">AQI - {getAqiLabel(station.aqi)}</div>
								</div>

								<div className="station-parameters">
									{station.parameters.map((param) => (
										<span key={param} className="parameter-badge">
											{param}
										</span>
									))}
								</div>

								<div className="station-footer">
									<span className="updated-time">Updated: {new Date(station.updatedAt).toLocaleString()}</span>

									<Link to={`/station/${station.id}`} className="btn btn-sm btn-text">
										View Details →
									</Link>
								</div>
							</div>
						))}
					</div>
				</>
			)}
		</div>
	);
};

export default MonitoringStations;
