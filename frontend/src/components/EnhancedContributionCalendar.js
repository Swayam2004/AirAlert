import React, { useState, useEffect } from "react";
import CalendarHeatmap from "react-calendar-heatmap";
import { Tooltip as ReactTooltip } from "react-tooltip";
import "react-calendar-heatmap/dist/styles.css";
import "../styles/EnhancedContributionCalendar.css";

/**
 * Enhanced GitHub-style contribution calendar for visualizing pollution data over time
 * Shows air quality/pollutant levels with color intensity indicating severity
 * Features include:
 * - Customizable color ranges for different pollutants
 * - Interactive tooltips with detailed information
 * - Time range filtering
 * - Multiple view options (week, month, year)
 */
const EnhancedContributionCalendar = ({
	data = [], // Array of { date, value, pollutant, location } objects
	selectedPollutant = "aqi",
	startDate = null, // Date object or null for auto calculation
	endDate = null, // Date object or null for auto calculation
	tooltipUnit = "", // Unit to display in tooltip (e.g., "μg/m³")
	colorRange = ["#ebedf0", "#c6e48b", "#7bc96f", "#239a3b", "#196127"], // Default GitHub-style
}) => {
	const [calendarData, setCalendarData] = useState([]);
	const [viewStartDate, setViewStartDate] = useState(startDate || new Date(new Date().setFullYear(new Date().getFullYear() - 1)));
	const [viewEndDate, setViewEndDate] = useState(endDate || new Date());
	const [tooltipData, setTooltipData] = useState({});
	const [viewMode, setViewMode] = useState("year"); // 'week', 'month', 'year'

	// Update view mode based on date range
	useEffect(() => {
		if (startDate && endDate) {
			const diffDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

			if (diffDays <= 14) {
				setViewMode("week");
			} else if (diffDays <= 60) {
				setViewMode("month");
			} else {
				setViewMode("year");
			}
		}
	}, [startDate, endDate]);

	// Process data when inputs change
	useEffect(() => {
		if (!data || data.length === 0) return;

		// Filter data by pollutant and organize by date
		const filteredData = data.filter((item) => selectedPollutant === "all" || item.pollutant === selectedPollutant);

		// Get date range if not specified
		const dateRange = filteredData.reduce(
			(range, item) => {
				const date = new Date(item.date);
				if (!range.min || date < range.min) range.min = date;
				if (!range.max || date > range.max) range.max = date;
				return range;
			},
			{ min: null, max: null }
		);

		if (dateRange.min && !startDate) {
			setViewStartDate(dateRange.min);
		}
		if (dateRange.max && !endDate) {
			setViewEndDate(dateRange.max);
		}

		// Group data by date and calculate averages
		const groupedByDate = filteredData.reduce((acc, item) => {
			const dateStr = item.date;

			if (!acc[dateStr]) {
				acc[dateStr] = {
					date: dateStr,
					value: item.value,
					count: 1,
					locations: [item.location],
					values: [item.value],
				};
			} else {
				acc[dateStr].count += 1;
				acc[dateStr].values.push(item.value);
				acc[dateStr].value = (acc[dateStr].value * (acc[dateStr].count - 1) + item.value) / acc[dateStr].count; // Running average

				if (!acc[dateStr].locations.includes(item.location)) {
					acc[dateStr].locations.push(item.location);
				}
			}

			return acc;
		}, {});

		// Convert to array format for the heatmap
		const calendarFormattedData = Object.values(groupedByDate);
		setCalendarData(calendarFormattedData);
	}, [data, selectedPollutant, startDate, endDate]);

	// Calculate intensity level for color mapping
	const getIntensityLevel = (value) => {
		if (!value || value === 0) return 0;

		// Determine thresholds based on pollutant type
		let thresholds;

		switch (selectedPollutant) {
			case "pm25":
				thresholds = [12, 35.5, 55.5, 150.5];
				break;
			case "pm10":
				thresholds = [55, 155, 255, 355];
				break;
			case "o3":
				thresholds = [54, 70, 85, 105];
				break;
			case "no2":
				thresholds = [53, 100, 360, 649];
				break;
			case "so2":
				thresholds = [35, 75, 185, 304];
				break;
			case "co":
				thresholds = [4.4, 9.4, 12.4, 15.4];
				break;
			case "aqi":
			default:
				thresholds = [50, 100, 150, 200];
		}

		if (value <= thresholds[0]) return 1;
		if (value <= thresholds[1]) return 2;
		if (value <= thresholds[2]) return 3;
		if (value <= thresholds[3]) return 4;
		return 5;
	};

	// Format tooltip content
	const formatTooltip = (value) => {
		if (!value || !value.date) return null;

		const date = new Date(value.date);
		const formattedDate = date.toLocaleDateString(undefined, {
			year: "numeric",
			month: "short",
			day: "numeric",
		});

		// Format based on the data available
		let tooltipContent = `<strong>${formattedDate}</strong><br/>`;
		tooltipContent += `Average: ${value.value.toFixed(2)} ${tooltipUnit}<br/>`;

		if (value.count > 1) {
			const minValue = Math.min(...value.values);
			const maxValue = Math.max(...value.values);
			tooltipContent += `Range: ${minValue.toFixed(2)} - ${maxValue.toFixed(2)} ${tooltipUnit}<br/>`;
			tooltipContent += `Measurements: ${value.count}<br/>`;
		}

		if (value.locations && value.locations.length > 0) {
			const locationText = value.locations.length === 1 ? `Location: ${value.locations[0]}` : `Locations: ${value.locations.length} stations`;
			tooltipContent += locationText;
		}

		return tooltipContent;
	};

	// Function to handle date range change
	const handleRangeChange = (range) => {
		const end = new Date();
		let start = new Date();

		switch (range) {
			case "week":
				start.setDate(end.getDate() - 7);
				setViewMode("week");
				break;
			case "month":
				start.setMonth(end.getMonth() - 1);
				setViewMode("month");
				break;
			case "3months":
				start.setMonth(end.getMonth() - 3);
				setViewMode("month");
				break;
			case "6months":
				start.setMonth(end.getMonth() - 6);
				setViewMode("year");
				break;
			case "year":
				start.setFullYear(end.getFullYear() - 1);
				setViewMode("year");
				break;
			default:
				start.setFullYear(end.getFullYear() - 1);
				setViewMode("year");
		}

		setViewStartDate(start);
		setViewEndDate(end);
	};

	return (
		<div className="enhanced-contribution-calendar">
			<div className="calendar-controls">
				<div className="view-mode-selector">
					<button className={`view-mode-btn ${viewMode === "week" ? "active" : ""}`} onClick={() => handleRangeChange("week")}>
						Week View
					</button>
					<button className={`view-mode-btn ${viewMode === "month" ? "active" : ""}`} onClick={() => handleRangeChange("month")}>
						Month View
					</button>
					<button className={`view-mode-btn ${viewMode === "year" ? "active" : ""}`} onClick={() => handleRangeChange("year")}>
						Year View
					</button>
				</div>
			</div>

			<div className="calendar-wrapper">
				<CalendarHeatmap
					startDate={
						viewMode === "week" ? new Date(viewEndDate.getTime() - 7 * 24 * 60 * 60 * 1000) : viewMode === "month" ? new Date(viewEndDate.getTime() - 30 * 24 * 60 * 60 * 1000) : viewStartDate
					}
					endDate={viewEndDate}
					values={calendarData}
					showMonthLabels={viewMode !== "week"}
					showWeekdayLabels={true}
					gutterSize={viewMode === "week" ? 4 : 1}
					horizontal={viewMode === "week"}
					classForValue={(value) => {
						if (!value || value.count === 0) {
							return "color-empty";
						}

						// Map the value to one of the color classes (color-1 to color-5)
						const intensityLevel = getIntensityLevel(value.value);
						return `color-scale-${intensityLevel}`;
					}}
					tooltipDataAttrs={(value) => {
						if (!value) return null;

						return {
							"data-tooltip-id": "calendar-tooltip",
							"data-tooltip-html": formatTooltip(value),
						};
					}}
				/>
				<ReactTooltip id="calendar-tooltip" />
			</div>

			<div className="calendar-legend">
				<div className="legend-item">
					<span className="color-empty legend-color"></span>
					<span>No data</span>
				</div>
				<div className="legend-item">
					<span className="color-scale-1 legend-color"></span>
					<span>Good</span>
				</div>
				<div className="legend-item">
					<span className="color-scale-2 legend-color"></span>
					<span>Moderate</span>
				</div>
				<div className="legend-item">
					<span className="color-scale-3 legend-color"></span>
					<span>Unhealthy for Sensitive Groups</span>
				</div>
				<div className="legend-item">
					<span className="color-scale-4 legend-color"></span>
					<span>Unhealthy</span>
				</div>
				<div className="legend-item">
					<span className="color-scale-5 legend-color"></span>
					<span>Very Unhealthy/Hazardous</span>
				</div>
			</div>

			<div className="calendar-stats">
				{calendarData.length > 0 && (
					<>
						<div className="stat-item">
							<span className="stat-label">Average:</span>
							<span className="stat-value">
								{(calendarData.reduce((sum, item) => sum + item.value, 0) / calendarData.length).toFixed(2)} {tooltipUnit}
							</span>
						</div>
						<div className="stat-item">
							<span className="stat-label">Max:</span>
							<span className="stat-value">
								{Math.max(...calendarData.map((item) => item.value)).toFixed(2)} {tooltipUnit}
							</span>
						</div>
						<div className="stat-item">
							<span className="stat-label">Days with data:</span>
							<span className="stat-value">{calendarData.length}</span>
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default EnhancedContributionCalendar;
