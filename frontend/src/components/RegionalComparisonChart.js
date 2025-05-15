import React, { useState, useMemo } from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Brush } from "recharts";
import "../styles/RegionalComparisonChart.css";

/**
 * Component for comparing air quality metrics across multiple regions or stations
 */
const RegionalComparisonChart = ({
	data = [], // Array of data points with region/station information
	regions = [], // Array of regions/stations to compare
	pollutant = "pm25", // Current pollutant to display
	chartType = "bar", // 'bar', 'line', or 'composed'
	showDelta = false, // Whether to show delta indicators
	threshold = null, // Optional threshold value
	timeRange = "week", // Time range for the data: 'day', 'week', 'month', 'year'
}) => {
	const [normalized, setNormalized] = useState(false);

	// Process data for the chart
	const processedData = useMemo(() => {
		if (!data || data.length === 0 || regions.length === 0) return [];

		// Group data by timestamp
		const groupedByTimestamp = data.reduce((acc, item) => {
			const timestamp = new Date(item.timestamp).toISOString();

			if (!acc[timestamp]) {
				acc[timestamp] = {
					timestamp,
					formattedTime: formatTimeByRange(new Date(item.timestamp), timeRange),
				};
			}

			// Add each region's value to the timestamp group
			if (regions.includes(item.station_id) || regions.includes(item.region)) {
				const regionKey = item.station_id || item.region;
				acc[timestamp][regionKey] = item[pollutant];

				// Store previous value for delta calculation if needed
				if (showDelta && item.previous_value) {
					acc[timestamp][`${regionKey}_delta`] = calculateDelta(item[pollutant], item.previous_value);
				}
			}

			return acc;
		}, {});

		// Convert to array and sort by timestamp
		let result = Object.values(groupedByTimestamp).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

		// Apply normalization if selected
		if (normalized && result.length > 0) {
			// Find baseline (first values for each region)
			const baselines = {};
			regions.forEach((region) => {
				for (let i = 0; i < result.length; i++) {
					if (result[i][region] !== undefined) {
						baselines[region] = result[i][region];
						break;
					}
				}
			});

			// Normalize values as percentage change from baseline
			result = result.map((item) => {
				const normalizedItem = { ...item };

				regions.forEach((region) => {
					if (item[region] !== undefined && baselines[region]) {
						normalizedItem[region] = (item[region] / baselines[region] - 1) * 100;
					}
				});

				return normalizedItem;
			});
		}

		return result;
	}, [data, regions, pollutant, timeRange, normalized, showDelta]);

	// Format timestamp based on the selected time range
	const formatTimeByRange = (date, range) => {
		switch (range) {
			case "day":
				return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
			case "week":
				return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
			case "month":
				return date.toLocaleDateString([], { month: "short", day: "numeric" });
			case "year":
				return date.toLocaleDateString([], { month: "short", year: "2-digit" });
			default:
				return date.toLocaleDateString();
		}
	};

	// Calculate percentage change for delta indicators
	const calculateDelta = (current, previous) => {
		if (previous === 0) return 0;
		return ((current - previous) / previous) * 100;
	};

	// Generate colors for each region
	const getRegionColor = (index) => {
		const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088fe", "#00C49F", "#FFBB28", "#FF8042", "#a4de6c", "#d0ed57"];
		return colors[index % colors.length];
	};

	// Custom tooltip to display region values
	const CustomTooltip = ({ active, payload, label }) => {
		if (!active || !payload || !payload.length) return null;

		return (
			<div className="regional-comparison-tooltip">
				<p className="tooltip-time">{label}</p>
				{payload.map((entry, index) => {
					if (entry.dataKey.endsWith("_delta")) return null; // Skip delta entries in tooltip

					const region = entry.dataKey;
					const value = entry.value;
					const deltaKey = `${region}_delta`;
					const deltaEntry = payload.find((p) => p.dataKey === deltaKey);
					const delta = deltaEntry ? deltaEntry.value : null;

					return (
						<div key={`region-${index}`} className="tooltip-region">
							<span className="region-color" style={{ backgroundColor: entry.color }}></span>
							<span className="region-name">{region}</span>
							<span className="region-value">
								{value !== undefined ? value.toFixed(2) : "N/A"}
								{normalized ? "%" : ""}
							</span>
							{delta !== null && (
								<span className={`region-delta ${delta > 0 ? "up" : delta < 0 ? "down" : ""}`}>
									{delta > 0 ? "↑" : delta < 0 ? "↓" : ""}
									{Math.abs(delta).toFixed(1)}%
								</span>
							)}
						</div>
					);
				})}
			</div>
		);
	};

	// Unit label based on pollutant and normalization
	const getYAxisLabel = () => {
		if (normalized) return "% Change";

		switch (pollutant) {
			case "pm25":
				return "PM2.5 (μg/m³)";
			case "pm10":
				return "PM10 (μg/m³)";
			case "o3":
				return "O₃ (ppb)";
			case "no2":
				return "NO₂ (ppb)";
			case "so2":
				return "SO₂ (ppb)";
			case "co":
				return "CO (ppm)";
			case "aqi":
				return "AQI";
			default:
				return "Value";
		}
	};

	// Render appropriate chart elements based on chart type
	const renderChartElements = () => {
		return regions.map((region, index) => {
			const color = getRegionColor(index);

			if (chartType === "bar") {
				return <Bar key={region} dataKey={region} name={region} fill={color} />;
			} else if (chartType === "line") {
				return <Line key={region} type="monotone" dataKey={region} name={region} stroke={color} activeDot={{ r: 8 }} dot={{ r: 4 }} />;
			} else {
				// composed
				return index % 2 === 0 ? (
					<Bar key={region} dataKey={region} name={region} fill={color} />
				) : (
					<Line key={region} type="monotone" dataKey={region} name={region} stroke={color} activeDot={{ r: 8 }} />
				);
			}
		});
	};

	return (
		<div className="regional-comparison-chart">
			<div className="chart-header">
				<h3>Regional Comparison</h3>

				<div className="chart-controls">
					<div className="chart-type-selector">
						<label htmlFor="chartTypeSelect">Chart:</label>
						<select id="chartTypeSelect" value={chartType} onChange={(e) => (chartType = e.target.value)}>
							<option value="bar">Bar</option>
							<option value="line">Line</option>
							<option value="composed">Composed</option>
						</select>
					</div>

					<div className="normalize-switch">
						<input id="normalizeToggle" type="checkbox" checked={normalized} onChange={(e) => setNormalized(e.target.checked)} />
						<label htmlFor="normalizeToggle">Normalize values</label>
					</div>
				</div>
			</div>

			<div className="chart-container">
				{processedData.length > 0 ? (
					<ResponsiveContainer width="100%" height={400}>
						<ComposedChart data={processedData} margin={{ top: 20, right: 20, bottom: 30, left: 20 }}>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis dataKey="formattedTime" angle={-45} textAnchor="end" height={60} />
							<YAxis label={{ value: getYAxisLabel(), angle: -90, position: "insideLeft" }} />
							<Tooltip content={<CustomTooltip />} />
							<Legend wrapperStyle={{ paddingTop: "10px" }} />

							{threshold !== null && <ReferenceLine y={threshold} label="Threshold" stroke="red" strokeDasharray="3 3" />}

							{renderChartElements()}

							<Brush dataKey="formattedTime" height={30} stroke="#8884d8" />
						</ComposedChart>
					</ResponsiveContainer>
				) : (
					<div className="no-data">No data available for the selected regions</div>
				)}
			</div>

			<div className="region-list">
				<h4>Selected Regions</h4>
				<div className="region-badges">
					{regions.map((region, index) => (
						<div key={region} className="region-badge" style={{ backgroundColor: getRegionColor(index) }}>
							{region}
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

export default RegionalComparisonChart;
