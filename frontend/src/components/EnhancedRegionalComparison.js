import React, { useState, useMemo, useEffect } from "react";
import { ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Brush, Cell, Scatter, LabelList } from "recharts";
import moment from "moment";
import "../styles/EnhancedRegionalComparison.css";

/**
 * Enhanced Regional Comparison Chart Component
 * Features:
 * - Split-screen views for comparing parameters across regions
 * - Visual indicators for regions exceeding safety thresholds
 * - Delta indicators showing improvement/deterioration over time
 * - Multiple visualization types (bars, lines, composed)
 * - Custom tooltips with detailed information
 */
const EnhancedRegionalComparison = ({
	data = [], // Array of data points with region/station information
	regions = [], // Array of regions/stations to compare
	pollutant = "pm25", // Current pollutant to display
	chartType: propChartType = "bar", // 'bar', 'line', 'area', 'composed', 'scatter'
	showDelta: propShowDelta = false, // Whether to show delta indicators
	threshold = null, // Optional threshold value
	timeRange = "week", // Time range for the data: 'day', 'week', 'month', 'year'
	height = 400,
	splitView: propSplitView = false, // Enable split view for detailed comparison
}) => {
	const [normalized, setNormalized] = useState(false);
	const [selectedRegions, setSelectedRegions] = useState([]);
	const [processedData, setProcessedData] = useState([]);
	const [comparisons, setComparisons] = useState({});
	const [activeRegion, setActiveRegion] = useState(null);
	const [viewMode, setViewMode] = useState("chart"); // 'chart', 'table', 'map'
	const [chartType, setChartType] = useState(propChartType);
	const [showDelta, setShowDelta] = useState(propShowDelta);
	const [splitView, setSplitView] = useState(propSplitView);

	// Process data for the chart when inputs change
	useEffect(() => {
		if (!data || data.length === 0 || regions.length === 0) {
			setProcessedData([]);
			return;
		}

		// Set initial selected regions if none selected
		if (selectedRegions.length === 0 && regions.length > 0) {
			setSelectedRegions(regions.slice(0, Math.min(5, regions.length)));
		}

		// Group data by timestamp
		const groupedByTimestamp = data.reduce((acc, item) => {
			const timestamp = new Date(item.timestamp);
			const formattedTime = formatTimeByRange(timestamp, timeRange);

			if (!acc[formattedTime]) {
				acc[formattedTime] = {
					timestamp: item.timestamp,
					formattedTime,
				};
			}

			// Add each region's value to the timestamp group
			if (regions.includes(item.station_id) || regions.includes(item.region)) {
				const regionKey = item.station_id || item.region;
				acc[formattedTime][regionKey] = item[pollutant];

				// Store previous value for delta calculation if needed
				if (showDelta && item.previous_value) {
					acc[formattedTime][`${regionKey}_delta`] = calculateDelta(item[pollutant], item.previous_value);
					acc[formattedTime][`${regionKey}_previous`] = item.previous_value;
				}
			}

			return acc;
		}, {});

		// Convert to array and sort by timestamp
		let processedData = Object.values(groupedByTimestamp).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

		// Normalize data if requested
		if (normalized && processedData.length > 0) {
			// Find maximum value across all regions to use as baseline for normalization
			const maxValues = {};
			regions.forEach((region) => {
				maxValues[region] = Math.max(...processedData.map((entry) => entry[region]).filter((val) => val !== undefined && val !== null));
			});

			// Normalize values between 0-100
			processedData = processedData.map((entry) => {
				const normalizedEntry = { ...entry };

				regions.forEach((region) => {
					if (entry[region] !== undefined && entry[region] !== null && maxValues[region] > 0) {
						normalizedEntry[region] = (entry[region] / maxValues[region]) * 100;
					}
				});

				return normalizedEntry;
			});
		}

		// Calculate comparison metrics
		calculateComparisons(processedData);

		setProcessedData(processedData);
	}, [data, regions, pollutant, timeRange, normalized, showDelta, selectedRegions]);

	// Calculate comparison metrics between regions
	const calculateComparisons = (data) => {
		if (!data || data.length === 0 || regions.length < 2) return;

		const comparisons = {};

		// For each pair of regions, calculate metrics
		for (let i = 0; i < regions.length; i++) {
			for (let j = i + 1; j < regions.length; j++) {
				const region1 = regions[i];
				const region2 = regions[j];

				// Get valid paired data points for these two regions
				const validPairs = data.filter((entry) => entry[region1] !== undefined && entry[region1] !== null && entry[region2] !== undefined && entry[region2] !== null);

				if (validPairs.length === 0) continue;

				// Calculate average difference
				const avgDiff = validPairs.reduce((sum, entry) => sum + (entry[region1] - entry[region2]), 0) / validPairs.length;

				// Calculate correlation coefficient
				const region1Values = validPairs.map((entry) => entry[region1]);
				const region2Values = validPairs.map((entry) => entry[region2]);
				const correlation = calculateCorrelation(region1Values, region2Values);

				// Store results
				const key = `${region1}-${region2}`;
				comparisons[key] = {
					avgDiff,
					correlation,
					count: validPairs.length,
				};
			}
		}

		setComparisons(comparisons);
	};

	// Calculate Pearson correlation coefficient
	const calculateCorrelation = (x, y) => {
		const n = x.length;
		if (n === 0) return 0;

		// Calculate means
		const meanX = x.reduce((a, b) => a + b, 0) / n;
		const meanY = y.reduce((a, b) => a + b, 0) / n;

		// Calculate variances and covariance
		let varX = 0,
			varY = 0,
			covXY = 0;

		for (let i = 0; i < n; i++) {
			const diffX = x[i] - meanX;
			const diffY = y[i] - meanY;

			varX += diffX * diffX;
			varY += diffY * diffY;
			covXY += diffX * diffY;
		}

		// Return correlation coefficient
		return covXY / Math.sqrt(varX * varY) || 0;
	};

	// Format time based on range
	const formatTimeByRange = (timestamp, range) => {
		const date = new Date(timestamp);

		switch (range) {
			case "day":
				return moment(date).format("HH:mm");
			case "week":
				return moment(date).format("ddd HH:mm");
			case "month":
				return moment(date).format("MMM DD");
			case "year":
				return moment(date).format("MMM YYYY");
			default:
				return moment(date).format("YYYY-MM-DD HH:mm");
		}
	};

	// Calculate delta value and arrow direction
	const calculateDelta = (current, previous) => {
		if (previous === 0) return 0;
		return ((current - previous) / previous) * 100;
	};

	// Get color based on delta value
	const getDeltaColor = (delta) => {
		if (delta > 10) return "#e74c3c"; // Red for significant increase
		if (delta > 0) return "#e67e22"; // Orange for increase
		if (delta < -10) return "#27ae60"; // Green for significant decrease
		if (delta < 0) return "#2ecc71"; // Light green for decrease
		return "#7f8c8d"; // Gray for no change
	};

	// Custom tooltip for the chart
	const renderCustomTooltip = ({ active, payload, label }) => {
		if (!active || !payload || payload.length === 0) return null;

		return (
			<div className="regional-chart-tooltip">
				<p className="tooltip-label">{label}</p>
				{payload.map((entry, index) => {
					// Skip delta and previous entries
					if (entry && entry.dataKey && typeof entry.dataKey === "string" && (entry.dataKey.includes("_delta") || entry.dataKey.includes("_previous"))) return null;

					// Get delta value if available
					const deltaKey = entry && entry.dataKey && typeof entry.dataKey === "string" ? `${entry.dataKey}_delta` : "";
					const delta = payload.find((p) => p.dataKey === deltaKey)?.value;

					return (
						<div className="tooltip-item" key={`tooltip-${index}`}>
							<div className="tooltip-color" style={{ backgroundColor: entry.color }}></div>
							<span className="tooltip-name">{entry.dataKey}</span>
							<span className="tooltip-value">{typeof entry.value === "number" ? entry.value.toFixed(2) : entry.value}</span>

							{delta !== undefined && typeof delta === "number" && (
								<div className="tooltip-delta" style={{ color: getDeltaColor(delta) }}>
									{delta > 0 ? "▲" : delta < 0 ? "▼" : "●"} {Math.abs(delta).toFixed(1)}%
								</div>
							)}
						</div>
					);
				})}

				{threshold !== null && <div className="tooltip-threshold">Threshold: {threshold}</div>}
			</div>
		);
	};

	// Render the regional comparison chart
	const renderChart = () => {
		if (!processedData || processedData.length === 0) {
			return <div className="empty-chart">No data available for the selected regions</div>;
		}

		const chartColors = ["#3498db", "#2ecc71", "#e74c3c", "#f39c12", "#9b59b6", "#1abc9c", "#d35400", "#2c3e50", "#27ae60", "#c0392b"];

		// Filter for only selected regions
		const regionsToShow = selectedRegions.length > 0 ? selectedRegions : regions.slice(0, 5);

		return (
			<div className="chart-container" style={{ height }}>
				<ResponsiveContainer width="100%" height="100%">
					{chartType === "bar" && (
						<ComposedChart data={processedData}>
							<CartesianGrid strokeDasharray="3 3" opacity={0.6} />
							<XAxis dataKey="formattedTime" />
							<YAxis label={{ value: normalized ? "Normalized (%)" : pollutant, angle: -90, position: "insideLeft" }} />
							<Tooltip content={renderCustomTooltip} />
							<Legend />
							{threshold !== null && <ReferenceLine y={threshold} stroke="red" strokeDasharray="3 3" />}
							{regionsToShow.map((region, index) => (
								<Bar
									key={region}
									dataKey={region}
									name={`Region ${region}`}
									fill={chartColors[index % chartColors.length]}
									onMouseEnter={() => setActiveRegion(region)}
									isAnimationActive={true}
									animationDuration={500}
								>
									{showDelta &&
										processedData.map((entry, i) => {
											const deltaKey = `${region}_delta`;
											if (entry[deltaKey] === undefined) return null;

											return <Cell key={`cell-${i}`} fill={getDeltaColor(entry[deltaKey])} opacity={activeRegion === region ? 1 : 0.7} />;
										})}
								</Bar>
							))}
							<Brush dataKey="formattedTime" height={30} stroke="#8884d8" />
						</ComposedChart>
					)}

					{chartType === "line" && (
						<ComposedChart data={processedData}>
							<CartesianGrid strokeDasharray="3 3" opacity={0.6} />
							<XAxis dataKey="formattedTime" />
							<YAxis label={{ value: normalized ? "Normalized (%)" : pollutant, angle: -90, position: "insideLeft" }} />
							<Tooltip content={renderCustomTooltip} />
							<Legend />
							{threshold !== null && <ReferenceLine y={threshold} stroke="red" strokeDasharray="3 3" />}
							{regionsToShow.map((region, index) => (
								<Line
									key={region}
									type="monotone"
									dataKey={region}
									name={`Region ${region}`}
									stroke={chartColors[index % chartColors.length]}
									activeDot={{ r: 8 }}
									strokeWidth={2}
									dot={{ r: 4 }}
									isAnimationActive={true}
									animationDuration={500}
								/>
							))}
							<Brush dataKey="formattedTime" height={30} stroke="#8884d8" />
						</ComposedChart>
					)}

					{chartType === "area" && (
						<ComposedChart data={processedData}>
							<CartesianGrid strokeDasharray="3 3" opacity={0.6} />
							<XAxis dataKey="formattedTime" />
							<YAxis label={{ value: normalized ? "Normalized (%)" : pollutant, angle: -90, position: "insideLeft" }} />
							<Tooltip content={renderCustomTooltip} />
							<Legend />
							{threshold !== null && <ReferenceLine y={threshold} stroke="red" strokeDasharray="3 3" />}
							{regionsToShow.map((region, index) => (
								<Area
									key={region}
									type="monotone"
									dataKey={region}
									name={`Region ${region}`}
									stroke={chartColors[index % chartColors.length]}
									fill={`${chartColors[index % chartColors.length]}44`}
									activeDot={{ r: 8 }}
									isAnimationActive={true}
									animationDuration={500}
								/>
							))}
							<Brush dataKey="formattedTime" height={30} stroke="#8884d8" />
						</ComposedChart>
					)}

					{chartType === "composed" && (
						<ComposedChart data={processedData}>
							<CartesianGrid strokeDasharray="3 3" opacity={0.6} />
							<XAxis dataKey="formattedTime" />
							<YAxis label={{ value: normalized ? "Normalized (%)" : pollutant, angle: -90, position: "insideLeft" }} />
							<Tooltip content={renderCustomTooltip} />
							<Legend />
							{threshold !== null && <ReferenceLine y={threshold} stroke="red" strokeDasharray="3 3" />}
							{regionsToShow.map((region, index) =>
								index % 2 === 0 ? (
									<Bar key={region} dataKey={region} name={`Region ${region}`} fill={chartColors[index % chartColors.length]} isAnimationActive={true} animationDuration={500} />
								) : (
									<Line
										key={region}
										type="monotone"
										dataKey={region}
										name={`Region ${region}`}
										stroke={chartColors[index % chartColors.length]}
										activeDot={{ r: 8 }}
										strokeWidth={2}
										isAnimationActive={true}
										animationDuration={500}
									/>
								)
							)}
							<Brush dataKey="formattedTime" height={30} stroke="#8884d8" />
						</ComposedChart>
					)}

					{chartType === "scatter" && (
						<ComposedChart data={processedData}>
							<CartesianGrid strokeDasharray="3 3" opacity={0.6} />
							<XAxis dataKey="formattedTime" />
							<YAxis label={{ value: normalized ? "Normalized (%)" : pollutant, angle: -90, position: "insideLeft" }} />
							<Tooltip content={renderCustomTooltip} />
							<Legend />
							{threshold !== null && <ReferenceLine y={threshold} stroke="red" strokeDasharray="3 3" />}
							{regionsToShow.map((region, index) => (
								<Scatter
									key={region}
									name={`Region ${region}`}
									data={processedData.filter((entry) => entry[region] !== undefined)}
									fill={chartColors[index % chartColors.length]}
									line={{ stroke: chartColors[index % chartColors.length], strokeWidth: 1, strokeDasharray: "5 5" }}
									shape="circle"
									isAnimationActive={true}
									animationDuration={500}
								>
									{processedData.map((entry, i) => (
										<Cell key={`cell-${i}`} fill={entry[region] > threshold ? "#e74c3c" : chartColors[index % chartColors.length]} />
									))}

									{/* Add custom points for each data point */}
									<LabelList
										dataKey={region}
										position="top"
										content={(props) => {
											const { x, y, width, height, value } = props;
											if (value === undefined || value === null) return null;
											if (value <= threshold) return null;

											return (
												<g>
													<circle cx={x} cy={y} r={4} fill="#e74c3c" />
													<text x={x} y={y - 10} textAnchor="middle" fill="#e74c3c" fontSize={10}>
														{value.toFixed(1)}
													</text>
												</g>
											);
										}}
									/>
								</Scatter>
							))}
							<Brush dataKey="formattedTime" height={30} stroke="#8884d8" />
						</ComposedChart>
					)}
				</ResponsiveContainer>
			</div>
		);
	};

	// Render the comparison matrix
	const renderComparisonMatrix = () => {
		if (Object.keys(comparisons).length === 0) {
			return <div className="empty-comparison">No comparison data available</div>;
		}

		return (
			<div className="comparison-matrix">
				<table>
					<thead>
						<tr>
							<th>Regions</th>
							<th>Average Difference</th>
							<th>Correlation</th>
							<th>Samples</th>
						</tr>
					</thead>
					<tbody>
						{Object.entries(comparisons).map(([key, data], index) => {
							const [region1, region2] = key.split("-");
							return (
								<tr key={key}>
									<td>
										{region1} / {region2}
									</td>
									<td className={data.avgDiff > 0 ? "positive" : "negative"}>
										{data.avgDiff > 0 ? "+" : ""}
										{data.avgDiff.toFixed(2)}
									</td>
									<td className={getCorrelationClass(data.correlation)}>{data.correlation.toFixed(2)}</td>
									<td>{data.count}</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		);
	};

	// Get class for correlation value
	const getCorrelationClass = (correlation) => {
		const abs = Math.abs(correlation);
		if (abs > 0.7) return "strong";
		if (abs > 0.3) return "moderate";
		return "weak";
	};

	return (
		<div className="enhanced-regional-comparison">
			<div className="comparison-controls">
				<div className="control-group">
					<label>View Mode:</label>
					<div className="button-group">
						<button className={viewMode === "chart" ? "active" : ""} onClick={() => setViewMode("chart")}>
							Chart
						</button>
						<button className={viewMode === "table" ? "active" : ""} onClick={() => setViewMode("table")}>
							Comparison Table
						</button>
					</div>
				</div>

				<div className="control-group">
					<label>Chart Type:</label>
					<div className="button-group">
						<button className={chartType === "bar" ? "active" : ""} onClick={() => setViewMode("chart") || setChartType("bar")}>
							Bar
						</button>
						<button className={chartType === "line" ? "active" : ""} onClick={() => setViewMode("chart") || setChartType("line")}>
							Line
						</button>
						<button className={chartType === "area" ? "active" : ""} onClick={() => setViewMode("chart") || setChartType("area")}>
							Area
						</button>
						<button className={chartType === "composed" ? "active" : ""} onClick={() => setViewMode("chart") || setChartType("composed")}>
							Composed
						</button>
						<button className={chartType === "scatter" ? "active" : ""} onClick={() => setViewMode("chart") || setChartType("scatter")}>
							Scatter
						</button>
					</div>
				</div>

				<div className="control-group checkbox-control">
					<label>Options:</label>
					<div className="checkbox-group">
						<label>
							<input type="checkbox" checked={normalized} onChange={() => setNormalized(!normalized)} />
							Normalize Data
						</label>
						<label>
							<input type="checkbox" checked={showDelta} onChange={() => setShowDelta(!showDelta)} />
							Show Delta Indicators
						</label>
						<label>
							<input type="checkbox" checked={splitView} onChange={() => setSplitView(!splitView)} />
							Split View
						</label>
					</div>
				</div>
			</div>

			{viewMode === "chart" && renderChart()}
			{viewMode === "table" && renderComparisonMatrix()}

			{splitView && selectedRegions.length >= 2 && (
				<div className="split-view-container">
					<h3>Split View Comparison</h3>
					<div className="split-panels">
						{selectedRegions.slice(0, 2).map((region, index) => {
							// Get latest data point for this region
							const latestData = processedData.filter((entry) => entry[region] !== undefined && entry[region] !== null).slice(-1)[0];

							// Calculate percentage of threshold
							const thresholdPercentage = threshold ? (latestData?.[region] / threshold) * 100 : 0;

							return (
								<div className="split-panel" key={`panel-${index}`}>
									<h4>Region {region}</h4>
									<div className="panel-content">
										<div className="current-value">
											<div className="value-large">{latestData?.[region] !== undefined && typeof latestData[region] === "number" ? latestData[region].toFixed(2) : "N/A"}</div>
											<div className="value-unit">{pollutant.toUpperCase()}</div>
										</div>

										{threshold && latestData && (
											<div className="threshold-indicator">
												<div className="threshold-label">{latestData[region] > threshold ? "Exceeding" : "Below"} Threshold</div>
												<div className="threshold-bar">
													<div className={`threshold-fill ${latestData[region] > threshold ? "exceeding" : "safe"}`} style={{ width: `${Math.min(thresholdPercentage, 100)}%` }}></div>
												</div>
												<div className="threshold-value">{typeof thresholdPercentage === "number" ? thresholdPercentage.toFixed(0) : 0}% of threshold</div>
											</div>
										)}

										{showDelta && latestData && latestData[`${region}_delta`] !== undefined && (
											<div className="delta-indicator">
												{typeof latestData[`${region}_delta`] === "number" && (
													<div className={`delta-value ${latestData[`${region}_delta`] > 0 ? "increasing" : "decreasing"}`}>
														{latestData[`${region}_delta`] > 0 ? "▲" : "▼"} {Math.abs(latestData[`${region}_delta`]).toFixed(1)}%
													</div>
												)}
												<div className="delta-label">vs. previous period</div>
											</div>
										)}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
};

export default EnhancedRegionalComparison;
