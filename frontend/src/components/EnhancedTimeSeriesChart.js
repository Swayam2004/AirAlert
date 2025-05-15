import React, { useEffect, useState, useMemo } from "react";
import { LineChart, Line, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Brush, ReferenceArea, Label } from "recharts";
import moment from "moment";
import "../styles/EnhancedTimeSeriesChart.css";

/**
 * Advanced TimeSeriesChart component with enhanced features:
 * - Moving averages
 * - Trend lines
 * - Annotations
 * - Multiple time ranges
 * - Different visualization modes
 */
const EnhancedTimeSeriesChart = ({
	data,
	selectedPollutants = [],
	pollutantColors = {},
	dateRange = { start: null, end: null },
	thresholds = {},
	showMovingAverage = false,
	movingAverageWindow = 24,
	showTrendLine = false,
	height = 400,
	chartType: propChartType = "line", // line, area
	annotations = [], // [{timestamp, text, type}]
}) => {
	const [chartData, setChartData] = useState([]);
	const [timeFormat, setTimeFormat] = useState("MMM D, HH:mm");
	const [chartTimeRange, setChartTimeRange] = useState("all");
	const [selectedAnnotation, setSelectedAnnotation] = useState(null);
	const [customAnnotations, setCustomAnnotations] = useState([...annotations]);
	const [chartType, setChartType] = useState(propChartType);

	// Process data when inputs change
	useEffect(() => {
		if (!data || data.length === 0) return;

		// Process data for the chart, including moving averages if needed
		const processedData = [...data];

		// Add time relative to now for easier filtering
		processedData.forEach((item) => {
			item.displayTime = new Date(item.timestamp).toLocaleString();
			item.relativeHours = moment().diff(moment(item.timestamp), "hours");
		});

		// Sort by timestamp
		processedData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

		// Filter by date range if provided
		const filteredData = processedData.filter((item) => {
			const itemDate = new Date(item.timestamp);
			if (dateRange.start && itemDate < dateRange.start) return false;
			if (dateRange.end && itemDate > dateRange.end) return false;
			return true;
		});

		// Calculate moving averages for each selected pollutant
		if (showMovingAverage && filteredData.length > movingAverageWindow) {
			selectedPollutants.forEach((pollutant) => {
				// Skip calculating MA if the pollutant data is missing
				if (!filteredData.some((d) => d[pollutant] !== undefined)) return;

				const maKey = `${pollutant}_ma`;

				for (let i = 0; i < filteredData.length; i++) {
					if (i < movingAverageWindow - 1) {
						// Not enough data points yet for the window
						filteredData[i][maKey] = null;
					} else {
						// Calculate moving average
						let sum = 0;
						let count = 0;
						for (let j = 0; j < movingAverageWindow; j++) {
							const val = filteredData[i - j][pollutant];
							if (val !== undefined && val !== null) {
								sum += val;
								count++;
							}
						}
						filteredData[i][maKey] = count > 0 ? sum / count : null;
					}
				}
			});
		}

		// Calculate trend lines if needed
		if (showTrendLine && filteredData.length > 2) {
			selectedPollutants.forEach((pollutant) => {
				// Skip if the pollutant data is missing
				if (!filteredData.some((d) => d[pollutant] !== undefined)) return;

				const trendKey = `${pollutant}_trend`;
				const xValues = filteredData.map((_, i) => i);
				const yValues = filteredData.map((d) => d[pollutant]);

				// Simple linear regression
				const { slope, intercept } = calculateLinearRegression(xValues, yValues);

				// Apply trend line
				filteredData.forEach((item, i) => {
					item[trendKey] = intercept + slope * i;
				});
			});
		}

		// Set time format based on date range
		const timeSpanHours = moment(filteredData[filteredData.length - 1]?.timestamp).diff(moment(filteredData[0]?.timestamp), "hours");

		if (timeSpanHours < 24) {
			setTimeFormat("HH:mm");
		} else if (timeSpanHours < 24 * 7) {
			setTimeFormat("ddd HH:mm");
		} else if (timeSpanHours < 24 * 30) {
			setTimeFormat("MMM D");
		} else {
			setTimeFormat("MMM D, YYYY");
		}

		setChartData(filteredData);
	}, [data, selectedPollutants, dateRange, showMovingAverage, movingAverageWindow, showTrendLine]);

	// Function to calculate linear regression
	const calculateLinearRegression = (xValues, yValues) => {
		const n = xValues.length;

		// Filter out null/undefined values
		const validPairs = xValues.map((x, i) => ({ x, y: yValues[i] })).filter((pair) => pair.y !== undefined && pair.y !== null);

		const validX = validPairs.map((pair) => pair.x);
		const validY = validPairs.map((pair) => pair.y);

		const validN = validX.length;

		if (validN < 2) return { slope: 0, intercept: validY[0] || 0 };

		// Calculate means
		const meanX = validX.reduce((sum, x) => sum + x, 0) / validN;
		const meanY = validY.reduce((sum, y) => sum + y, 0) / validN;

		// Calculate slope and intercept
		let numerator = 0;
		let denominator = 0;

		for (let i = 0; i < validN; i++) {
			numerator += (validX[i] - meanX) * (validY[i] - meanY);
			denominator += (validX[i] - meanX) ** 2;
		}

		const slope = denominator !== 0 ? numerator / denominator : 0;
		const intercept = meanY - slope * meanX;

		return { slope, intercept };
	};

	// Format the time for display
	const formatXAxis = (timestamp) => {
		return moment(timestamp).format(timeFormat);
	};

	// Custom tooltip for the chart
	const renderTooltip = ({ active, payload, label }) => {
		if (!active || !payload || !payload.length) return null;

		const formattedTime = moment(label).format("MMM D, YYYY HH:mm");

		return (
			<div className="custom-tooltip">
				<p className="tooltip-time">{formattedTime}</p>
				{payload.map((entry, index) => {
					// Skip trend and MA entries in initial display
					if (entry.dataKey.endsWith("_trend") || entry.dataKey.endsWith("_ma")) return null;

					const pollutant = entry.dataKey;
					const value = entry.value;
					const maValue = payload.find((p) => p.dataKey === `${pollutant}_ma`)?.value;
					const trendValue = payload.find((p) => p.dataKey === `${pollutant}_trend`)?.value;

					return (
						<div key={`tooltip-${index}`} className="tooltip-item">
							<span className="tooltip-color" style={{ backgroundColor: entry.color }}></span>
							<span className="tooltip-name">{pollutant.toUpperCase()}:</span>
							<span className="tooltip-value">{value?.toFixed(2)}</span>
							{maValue !== undefined && maValue !== null && <span className="tooltip-ma">(MA: {maValue.toFixed(2)})</span>}
							{trendValue !== undefined && trendValue !== null && <span className="tooltip-trend">(Trend: {trendValue.toFixed(2)})</span>}
						</div>
					);
				})}
			</div>
		);
	};

	// Function to handle adding an annotation
	const handleAddAnnotation = (e) => {
		if (!e || !e.activeLabel) return;

		const timestamp = e.activeLabel;
		const newAnnotation = {
			timestamp,
			text: "New annotation",
			type: "info",
		};

		setCustomAnnotations([...customAnnotations, newAnnotation]);
		setSelectedAnnotation(newAnnotation);
	};

	// Function to filter data by time range
	const filterDataByTimeRange = (range) => {
		setChartTimeRange(range);

		if (range === "all") return;

		const now = moment();
		let startTime;

		switch (range) {
			case "24h":
				startTime = now.clone().subtract(24, "hours");
				break;
			case "7d":
				startTime = now.clone().subtract(7, "days");
				break;
			case "30d":
				startTime = now.clone().subtract(30, "days");
				break;
			default:
				startTime = now.clone().subtract(24, "hours");
		}

		const filtered = data.filter((item) => moment(item.timestamp).isAfter(startTime));

		setChartData(filtered);
	};

	// Generate chart components for selected pollutants
	const renderChartLines = () => {
		const lines = [];

		selectedPollutants.forEach((pollutant) => {
			const color = pollutantColors[pollutant] || "#8884d8";

			if (chartType === "area") {
				lines.push(
					<Area
						key={pollutant}
						type="monotone"
						dataKey={pollutant}
						name={pollutant.toUpperCase()}
						stroke={color}
						fill={`${color}33`} // Add transparency
						activeDot={{ r: 6 }}
						isAnimationActive={true}
						animationDuration={500}
					/>
				);
			} else {
				lines.push(
					<Line
						key={pollutant}
						type="monotone"
						dataKey={pollutant}
						name={pollutant.toUpperCase()}
						stroke={color}
						strokeWidth={2}
						dot={{ r: 2 }}
						activeDot={{ r: 6 }}
						isAnimationActive={true}
						animationDuration={500}
					/>
				);
			}

			// Add moving average line if enabled
			if (showMovingAverage) {
				lines.push(
					<Line
						key={`${pollutant}_ma`}
						type="monotone"
						dataKey={`${pollutant}_ma`}
						name={`${pollutant.toUpperCase()} (${movingAverageWindow}h MA)`}
						stroke={`${color}88`} // Lighter version of the color
						strokeWidth={2}
						strokeDasharray="5 5"
						dot={false}
					/>
				);
			}

			// Add trend line if enabled
			if (showTrendLine) {
				lines.push(
					<Line
						key={`${pollutant}_trend`}
						type="monotone"
						dataKey={`${pollutant}_trend`}
						name={`${pollutant.toUpperCase()} Trend`}
						stroke={`${color}AA`}
						strokeWidth={1.5}
						strokeDasharray="10 5"
						dot={false}
					/>
				);
			}
		});

		return lines;
	};

	// Render reference lines for thresholds
	const renderThresholds = () => {
		const referenceLines = [];

		Object.entries(thresholds).forEach(([pollutant, value]) => {
			if (selectedPollutants.includes(pollutant)) {
				referenceLines.push(
					<ReferenceLine key={`threshold-${pollutant}`} y={value} stroke="red" strokeDasharray="3 3" strokeWidth={1.5}>
						<Label value={`${pollutant.toUpperCase()} Threshold (${value})`} position="insideBottomRight" fill="red" />
					</ReferenceLine>
				);
			}
		});

		return referenceLines;
	};

	// Render annotation elements
	const renderAnnotations = () => {
		const elements = [];

		customAnnotations.forEach((annotation, index) => {
			const annotationTime = new Date(annotation.timestamp).getTime();
			const nearestPoint = chartData.reduce((closest, point) => {
				const pointTime = new Date(point.timestamp).getTime();
				const currentClosest = new Date(closest.timestamp).getTime();

				return Math.abs(pointTime - annotationTime) < Math.abs(currentClosest - annotationTime) ? point : closest;
			}, chartData[0]);

			if (!nearestPoint) return null;

			const xValue = nearestPoint.timestamp;
			const yValue = nearestPoint[selectedPollutants[0]] || 0;

			const color = annotation.type === "warning" ? "red" : annotation.type === "info" ? "blue" : "green";

			elements.push(
				<ReferenceLine key={`annotation-${index}`} x={xValue} stroke={color} strokeDasharray="3 3">
					<Label value={annotation.text} position="top" fill={color} fontSize={12} />
				</ReferenceLine>
			);
		});

		return elements;
	};

	return (
		<div className="enhanced-time-series-chart">
			{/* Control panel */}
			<div className="chart-controls">
				<div className="time-range-selector">
					<button className={chartTimeRange === "24h" ? "active" : ""} onClick={() => filterDataByTimeRange("24h")}>
						24 Hours
					</button>
					<button className={chartTimeRange === "7d" ? "active" : ""} onClick={() => filterDataByTimeRange("7d")}>
						7 Days
					</button>
					<button className={chartTimeRange === "30d" ? "active" : ""} onClick={() => filterDataByTimeRange("30d")}>
						30 Days
					</button>
					<button className={chartTimeRange === "all" ? "active" : ""} onClick={() => filterDataByTimeRange("all")}>
						All Data
					</button>
				</div>
				<div className="chart-type-selector">
					<button className={chartType === "line" ? "active" : ""} onClick={() => setChartType("line")}>
						Line
					</button>
					<button className={chartType === "area" ? "active" : ""} onClick={() => setChartType("area")}>
						Area
					</button>
				</div>
			</div>

			{/* Chart container */}
			<div className="chart-container" style={{ height }}>
				<ResponsiveContainer width="100%" height="100%">
					{chartType === "area" ? (
						<AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 30 }} onClick={handleAddAnnotation}>
							<CartesianGrid strokeDasharray="3 3" opacity={0.6} />
							<XAxis dataKey="timestamp" tickFormatter={formatXAxis} tick={{ fontSize: 12 }} allowDataOverflow={true} />
							<YAxis tick={{ fontSize: 12 }} />
							<Tooltip content={renderTooltip} />
							<Legend height={30} />
							{renderChartLines()}
							{renderThresholds()}
							{renderAnnotations()}
							<Brush dataKey="timestamp" height={30} stroke="#8884d8" tickFormatter={formatXAxis} startIndex={Math.max(0, chartData.length - 100)} />
						</AreaChart>
					) : (
						<LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 30 }} onClick={handleAddAnnotation}>
							<CartesianGrid strokeDasharray="3 3" opacity={0.6} />
							<XAxis dataKey="timestamp" tickFormatter={formatXAxis} tick={{ fontSize: 12 }} allowDataOverflow={true} />
							<YAxis tick={{ fontSize: 12 }} />
							<Tooltip content={renderTooltip} />
							<Legend height={30} />
							{renderChartLines()}
							{renderThresholds()}
							{renderAnnotations()}
							<Brush dataKey="timestamp" height={30} stroke="#8884d8" tickFormatter={formatXAxis} startIndex={Math.max(0, chartData.length - 100)} />
						</LineChart>
					)}
				</ResponsiveContainer>
			</div>

			{/* Annotation editor */}
			{selectedAnnotation && (
				<div className="annotation-editor">
					<h3>Edit Annotation</h3>
					<div className="annotation-form">
						<div className="form-group">
							<label>Text:</label>
							<input
								type="text"
								value={selectedAnnotation.text}
								onChange={(e) => {
									setSelectedAnnotation({
										...selectedAnnotation,
										text: e.target.value,
									});

									setCustomAnnotations(customAnnotations.map((ann) => (ann.timestamp === selectedAnnotation.timestamp ? { ...ann, text: e.target.value } : ann)));
								}}
							/>
						</div>
						<div className="form-group">
							<label>Type:</label>
							<select
								value={selectedAnnotation.type}
								onChange={(e) => {
									setSelectedAnnotation({
										...selectedAnnotation,
										type: e.target.value,
									});

									setCustomAnnotations(customAnnotations.map((ann) => (ann.timestamp === selectedAnnotation.timestamp ? { ...ann, type: e.target.value } : ann)));
								}}
							>
								<option value="info">Information</option>
								<option value="warning">Warning</option>
								<option value="event">Event</option>
							</select>
						</div>
						<div className="form-buttons">
							<button
								onClick={() => {
									setCustomAnnotations(customAnnotations.filter((ann) => ann.timestamp !== selectedAnnotation.timestamp));
									setSelectedAnnotation(null);
								}}
							>
								Delete
							</button>
							<button onClick={() => setSelectedAnnotation(null)}>Close</button>
						</div>
					</div>
				</div>
			)}

			{/* Chart instructions */}
			<div className="chart-instructions">
				<p>Click on the chart to add annotations. Use the brush at the bottom to zoom into specific time ranges.</p>
			</div>
		</div>
	);
};

export default EnhancedTimeSeriesChart;
