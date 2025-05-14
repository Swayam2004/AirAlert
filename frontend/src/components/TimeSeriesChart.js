import React, { useEffect, useState } from "react";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Brush } from "recharts";
import moment from "moment";

/**
 * Advanced TimeSeriesChart component for visualizing pollutant trends with additional features
 * including moving averages, threshold highlighting, and customizable date ranges.
 */
const TimeSeriesChart = ({
	data,
	selectedPollutants,
	pollutantColors,
	dateRange,
	thresholds = {},
	showMovingAverage = false,
	movingAverageWindow = 24, // Default 24-hour moving average
	height = 400,
}) => {
	const [chartData, setChartData] = useState([]);

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

		// Calculate moving averages for each selected pollutant
		if (showMovingAverage && processedData.length > movingAverageWindow) {
			selectedPollutants.forEach((pollutant) => {
				// Skip calculating MA if the pollutant data is missing
				if (!processedData.some((d) => d[pollutant] !== undefined)) return;

				const maKey = `${pollutant}_ma`;

				for (let i = 0; i < processedData.length; i++) {
					if (i < movingAverageWindow - 1) {
						// Not enough data points yet for the window
						processedData[i][maKey] = null;
					} else {
						// Calculate moving average
						let sum = 0;
						let count = 0;
						for (let j = 0; j < movingAverageWindow; j++) {
							const val = processedData[i - j][pollutant];
							if (val !== null && val !== undefined) {
								sum += val;
								count++;
							}
						}
						processedData[i][maKey] = count > 0 ? sum / count : null;
					}
				}
			});
		}

		// Filter data based on the selected date range
		let filteredData = processedData;
		if (dateRange) {
			const { startDate, endDate } = dateRange;
			filteredData = processedData.filter((item) => {
				const itemDate = new Date(item.timestamp);
				return itemDate >= startDate && itemDate <= endDate;
			});
		}

		setChartData(filteredData);
	}, [data, selectedPollutants, showMovingAverage, movingAverageWindow, dateRange]);

	// Helper to get the stroke dash array for moving average lines
	const getStrokeDashArray = (pollutant) => {
		return `${pollutant.includes("_ma") ? "5 5" : "0"}`;
	};

	// Helper to get line opacity
	const getLineOpacity = (pollutant) => {
		return pollutant.includes("_ma") ? 0.7 : 1;
	};

	// Format the tooltip to show both the actual value and the moving average
	const CustomTooltip = ({ active, payload, label }) => {
		if (!active || !payload || payload.length === 0) return null;

		return (
			<div className="custom-tooltip">
				<p className="tooltip-time">{label}</p>
				{payload.map((entry, index) => {
					const isMovingAvg = entry.dataKey.includes("_ma");
					const basePollutant = isMovingAvg ? entry.dataKey.replace("_ma", "") : entry.dataKey;

					return (
						<p key={`tooltip-${index}`} style={{ color: entry.color }} className={isMovingAvg ? "tooltip-ma" : ""}>
							<span className="tooltip-label">{isMovingAvg ? `${basePollutant.toUpperCase()} (${movingAverageWindow}h MA)` : basePollutant.toUpperCase()}:</span>
							<span className="tooltip-value">{entry.value !== null && entry.value !== undefined ? entry.value.toFixed(2) : "N/A"}</span>
						</p>
					);
				})}
			</div>
		);
	};

	return (
		<div className="time-series-chart">
			<ResponsiveContainer width="100%" height={height}>
				<LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
					<CartesianGrid strokeDasharray="3 3" />
					<XAxis dataKey="displayTime" angle={-30} textAnchor="end" height={60} tick={{ fontSize: 12 }} />
					<YAxis />
					<Tooltip content={<CustomTooltip />} />
					<Legend />

					{/* Draw threshold reference lines if provided */}
					{Object.entries(thresholds).map(([pollutant, threshold]) => {
						if (selectedPollutants.includes(pollutant)) {
							return (
								<ReferenceLine
									key={`threshold-${pollutant}`}
									y={threshold}
									stroke={pollutantColors[pollutant]}
									strokeDasharray="3 3"
									label={{
										value: `${pollutant.toUpperCase()} Threshold`,
										fill: pollutantColors[pollutant],
										fontSize: 12,
									}}
								/>
							);
						}
						return null;
					})}

					{/* Draw lines for each selected pollutant */}
					{selectedPollutants.map((pollutant) => (
						<Line
							key={pollutant}
							type="monotone"
							dataKey={pollutant}
							stroke={pollutantColors[pollutant]}
							name={pollutant.toUpperCase()}
							dot={false}
							activeDot={{ r: 6 }}
							isAnimationActive={true}
							animationDuration={1000}
						/>
					))}

					{/* Draw moving average lines if enabled */}
					{showMovingAverage &&
						selectedPollutants.map((pollutant) => (
							<Line
								key={`${pollutant}_ma`}
								type="monotone"
								dataKey={`${pollutant}_ma`}
								stroke={pollutantColors[pollutant]}
								name={`${pollutant.toUpperCase()} (${movingAverageWindow}h MA)`}
								dot={false}
								strokeDasharray="5 5"
								strokeWidth={2}
								opacity={0.7}
								isAnimationActive={true}
								animationDuration={1000}
							/>
						))}

					{/* Add brush for zooming and panning */}
					<Brush
						dataKey="displayTime"
						height={30}
						stroke="#8884d8"
						startIndex={Math.max(0, chartData.length - 50)} // Start showing the most recent data
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
};

export default TimeSeriesChart;
