import React, { useState, useEffect } from "react";
import CalendarHeatmap from "react-calendar-heatmap";
import { Tooltip as ReactTooltip } from "react-tooltip";
import "react-calendar-heatmap/dist/styles.css";
import "../styles/ContributionCalendar.css";

/**
 * Enhanced GitHub-style contribution calendar for visualizing pollution data over time
 * Shows air quality/pollutant levels with color intensity indicating severity
 * Features include:
 * - Customizable color ranges for different pollutants
 * - Interactive tooltips with detailed information
 * - Time range filtering
 * - Multiple view options (week, month, year)
 */
const ContributionCalendar = ({
	data = [], // Array of { date, value, pollutant, location } objects
	selectedPollutant = "aqi",
	startDate = null, // Date object or null for auto calculation
	endDate = null, // Date object or null for auto calculation
	tooltipUnit = "", // Unit to display in tooltip (e.g., "μg/m³")
	colorRange = ["#ebedf0", "#c6e48b", "#7bc96f", "#239a3b", "#196127"], // Similar to GitHub
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
			const dateStr = new Date(item.date).toISOString().split("T")[0];

			if (!acc[dateStr]) {
				acc[dateStr] = {
					date: dateStr,
					count: 1,
					sum: item.value,
					values: [item.value],
					locations: [item.location],
				};
			} else {
				acc[dateStr].count += 1;
				acc[dateStr].sum += item.value;
				acc[dateStr].values.push(item.value);
				if (!acc[dateStr].locations.includes(item.location)) {
					acc[dateStr].locations.push(item.location);
				}
			}
			return acc;
		}, {});

		// Convert to calendar format and add tooltips
		const calendarEntries = Object.entries(groupedByDate).map(([date, data]) => {
			const avgValue = data.sum / data.count;

			// Store detailed info for tooltip
			setTooltipData((prev) => ({
				...prev,
				[date]: {
					date,
					average: avgValue.toFixed(2),
					min: Math.min(...data.values).toFixed(2),
					max: Math.max(...data.values).toFixed(2),
					count: data.count,
					locations: data.locations,
				},
			}));

			return {
				date,
				count: avgValue,
			};
		});

		setCalendarData(calendarEntries);
	}, [data, selectedPollutant, startDate, endDate]);

	// Helper to get color based on value
	const getValueClass = (value) => {
		if (!value || value === 0) return "color-empty";

		// Determine thresholds based on pollutant
		let thresholds;
		switch (selectedPollutant) {
			case "pm25":
				thresholds = [12, 35.4, 55.4, 150.4];
				break;
			case "pm10":
				thresholds = [54, 154, 254, 354];
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
				break;
		}

		if (value <= thresholds[0]) return "color-scale-1";
		if (value <= thresholds[1]) return "color-scale-2";
		if (value <= thresholds[2]) return "color-scale-3";
		if (value <= thresholds[3]) return "color-scale-4";
		return "color-scale-5";
	};

	// Custom tooltip content
	const getTooltipDataAttr = (value) => {
		if (!value || !value.date) return null;

		const dateInfo = tooltipData[value.date];
		if (!dateInfo) return `No data for ${value.date}`;

		return `
      <div class="calendar-tooltip">
        <div class="tooltip-date">${new Date(value.date).toLocaleDateString()}</div>
        <div class="tooltip-value">Average: ${dateInfo.average} ${tooltipUnit}</div>
        <div class="tooltip-range">Range: ${dateInfo.min} - ${dateInfo.max} ${tooltipUnit}</div>
        <div class="tooltip-count">${dateInfo.count} measurements</div>
        <div class="tooltip-locations">${dateInfo.locations.length} location${dateInfo.locations.length !== 1 ? "s" : ""}</div>
      </div>
    `;
	};

	// Calculate months to display
	const getMonthLabels = () => {
		const months = [];
		const startDate = new Date(viewStartDate);
		const endDate = new Date(viewEndDate);

		let currentDate = new Date(startDate);
		while (currentDate <= endDate) {
			const month = currentDate.toLocaleString("default", { month: "short" });
			months.push(month);
			currentDate.setMonth(currentDate.getMonth() + 1);
		}

		return months;
	};

	// View range options
	const handleTimeRangeChange = (range) => {
		const today = new Date();
		let start;

		switch (range) {
			case "year":
				start = new Date(today);
				start.setFullYear(today.getFullYear() - 1);
				break;
			case "halfyear":
				start = new Date(today);
				start.setMonth(today.getMonth() - 6);
				break;
			case "quarter":
				start = new Date(today);
				start.setMonth(today.getMonth() - 3);
				break;
			case "month":
				start = new Date(today);
				start.setMonth(today.getMonth() - 1);
				break;
			default:
				start = viewStartDate;
		}

		setViewStartDate(start);
		setViewEndDate(today);
	};

	return (
		<div className="contribution-calendar">
			<div className="calendar-header">
				<h3>Historical Air Quality Levels</h3>
				<div className="calendar-controls">
					<button onClick={() => handleTimeRangeChange("month")}>1 Month</button>
					<button onClick={() => handleTimeRangeChange("quarter")}>3 Months</button>
					<button onClick={() => handleTimeRangeChange("halfyear")}>6 Months</button>
					<button onClick={() => handleTimeRangeChange("year")}>1 Year</button>
				</div>
			</div>

			<div className="calendar-container">
				<CalendarHeatmap
					startDate={viewStartDate}
					endDate={viewEndDate}
					values={calendarData}
					classForValue={(value) => getValueClass(value && value.count)}
					tooltipDataAttrs={(value) => ({
						"data-tooltip-id": "calendar-tooltip",
						"data-tooltip-html": getTooltipDataAttr(value),
					})}
					showWeekdayLabels={true}
					gutterSize={1}
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
		</div>
	);
};

export default ContributionCalendar;
