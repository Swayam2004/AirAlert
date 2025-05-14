import React, { useState, useEffect, useRef } from "react";
import { Line, Bar, Scatter } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ScatterController } from "chart.js";
import axios from "axios";
import "./DataExplorerPage.css";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ScatterController);

const DataExplorerPage = () => {
	// Chart reference for exporting
	const chartRef = useRef(null);

	// State management
	const [pollutant, setPollutant] = useState("PM2.5");
	const [dateRange, setDateRange] = useState({
		start: "2025-05-01",
		end: "2025-05-15",
	});
	const [location, setLocation] = useState("all");
	const [visualizationType, setVisualizationType] = useState("line");
	const [timeGrouping, setTimeGrouping] = useState("daily");
	const [weatherCorrelation, setWeatherCorrelation] = useState("none");
	const [showPredictions, setShowPredictions] = useState(false);
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(false);
	const [insights, setInsights] = useState("");
	const [locations, setLocations] = useState([]);
	const [view, setView] = useState("visualization"); // visualization, insights, export
	const [weatherData, setWeatherData] = useState(null);
	const [correlationResults, setCorrelationResults] = useState(null);
	const [exportFormat, setExportFormat] = useState("csv");
	const [pollutants, setPollutants] = useState([
		{ id: "PM2.5", name: "PM2.5 (Fine Particulate Matter)" },
		{ id: "PM10", name: "PM10 (Coarse Particulate Matter)" },
		{ id: "O3", name: "O3 (Ozone)" },
		{ id: "NO2", name: "NO2 (Nitrogen Dioxide)" },
		{ id: "SO2", name: "SO2 (Sulfur Dioxide)" },
		{ id: "CO", name: "CO (Carbon Monoxide)" },
		{ id: "AQI", name: "Air Quality Index (AQI)" },
	]);
	const [weatherMetrics, setWeatherMetrics] = useState([
		{ id: "temperature", name: "Temperature" },
		{ id: "humidity", name: "Humidity" },
		{ id: "wind_speed", name: "Wind Speed" },
		{ id: "precipitation", name: "Precipitation" },
		{ id: "pressure", name: "Atmospheric Pressure" },
	]);

	// Mock fetch locations on component mount
	useEffect(() => {
		// In a real application, this would be an actual API call
		setLocations([
			{ id: "all", name: "All Stations" },
			{ id: "delhi", name: "Delhi" },
			{ id: "mumbai", name: "Mumbai" },
			{ id: "bangalore", name: "Bangalore" },
			{ id: "chennai", name: "Chennai" },
			{ id: "kolkata", name: "Kolkata" },
		]);

		// Fetch data on initial load
		fetchData();
	}, []);

	// Mock data fetch function - in real app, this would call the backend API
	const fetchData = async () => {
		setLoading(true);

		try {
			// In a real application, this would be an actual API call
			// const response = await axios.get('/api/air_quality', {
			//   params: { pollutant, startDate: dateRange.start, endDate: dateRange.end, location, timeGrouping }
			// });

			// For now, we'll use mock data
			// Generate some sample data for the selected date range
			const mockData = generateMockData(dateRange.start, dateRange.end, timeGrouping);

			// Wait a moment to simulate network request
			await new Promise((resolve) => setTimeout(resolve, 800));

			setData(mockData);

			if (showPredictions) {
				const predictionsData = generateMockPredictions(mockData);
				setData((prevData) => ({
					...prevData,
					predictionLabels: predictionsData.predictionLabels,
					predictionValues: predictionsData.predictionValues,
					predictionUncertainties: predictionsData.predictionUncertainties,
				}));
			}

			if (weatherCorrelation !== "none") {
				const weatherData = generateMockWeatherData(dateRange.start, dateRange.end, timeGrouping, weatherCorrelation);
				setWeatherData(weatherData);

				// Generate correlation analysis
				const correlationData = calculateMockCorrelation(mockData.values, weatherData.values);
				setCorrelationResults(correlationData);
			}

			// Generate LLM insights (mock)
			setInsights(generateMockInsights(pollutant, location));
		} catch (error) {
			console.error("Error fetching data:", error);
			// Handle error in UI
		} finally {
			setLoading(false);
		}
	};

	// Function to handle filter changes and fetch data
	const handleFilterChange = () => {
		fetchData();
	};

	// Generate mock data based on date range and grouping
	const generateMockData = (startDate, endDate, grouping) => {
		const start = new Date(startDate);
		const end = new Date(endDate);
		const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

		let labels = [];
		let values = [];
		let uncertainties = [];

		// Generate dates and random values
		for (let i = 0; i <= days; i++) {
			const date = new Date(start);
			date.setDate(start.getDate() + i);

			// Format date based on grouping
			let label;
			if (grouping === "hourly") {
				// For hourly, we'll just show the day with several hours
				for (let h = 0; h < 24; h += 3) {
					label = `${date.getMonth() + 1}/${date.getDate()} ${h}:00`;
					labels.push(label);

					// Generate a random value based on pollutant type
					let baseValue = 0;
					switch (pollutant) {
						case "PM2.5":
							baseValue = 25 + Math.random() * 35;
							break;
						case "PM10":
							baseValue = 45 + Math.random() * 55;
							break;
						case "O3":
							baseValue = 30 + Math.random() * 40;
							break;
						case "NO2":
							baseValue = 15 + Math.random() * 25;
							break;
						case "SO2":
							baseValue = 5 + Math.random() * 15;
							break;
						case "CO":
							baseValue = 1 + Math.random() * 4;
							break;
						default:
							baseValue = 50 + Math.random() * 50;
					}

					// Add some trend and randomness
					const trend = Math.sin(i + h / 24) * 10;
					const value = Math.max(0, baseValue + trend + (Math.random() * 15 - 7.5));
					values.push(value.toFixed(1));

					// Generate uncertainty bands (for error bars)
					uncertainties.push((value * 0.1).toFixed(1));
				}
			} else if (grouping === "daily") {
				label = `${date.getMonth() + 1}/${date.getDate()}`;
				labels.push(label);

				// Generate a random value based on pollutant type with daily trend
				let baseValue = 0;
				switch (pollutant) {
					case "PM2.5":
						baseValue = 25 + Math.random() * 35;
						break;
					case "PM10":
						baseValue = 45 + Math.random() * 55;
						break;
					case "O3":
						baseValue = 30 + Math.random() * 40;
						break;
					case "NO2":
						baseValue = 15 + Math.random() * 25;
						break;
					case "SO2":
						baseValue = 5 + Math.random() * 15;
						break;
					case "CO":
						baseValue = 1 + Math.random() * 4;
						break;
					default:
						baseValue = 50 + Math.random() * 50;
				}

				// Add some trend - higher values on weekends for PM and lower for NO2
				const dayOfWeek = date.getDay();
				const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

				const weekendFactor = isWeekend ? (pollutant.startsWith("PM") ? 1.2 : 0.8) : pollutant.startsWith("PM") ? 0.9 : 1.1;

				const value = Math.max(0, baseValue * weekendFactor + (Math.random() * 10 - 5));
				values.push(value.toFixed(1));

				// Generate uncertainty bands (for error bars)
				uncertainties.push((value * 0.1).toFixed(1));
			} else {
				// weekly or monthly
				const weekNum = Math.floor(i / 7) + 1;
				if (grouping === "weekly" && i % 7 === 0) {
					label = `Week ${weekNum}`;
					labels.push(label);

					// Generate aggregated values
					const baseValue =
						pollutant === "PM2.5"
							? 30 + Math.random() * 40
							: pollutant === "PM10"
							? 50 + Math.random() * 60
							: pollutant === "O3"
							? 35 + Math.random() * 45
							: pollutant === "NO2"
							? 20 + Math.random() * 30
							: pollutant === "SO2"
							? 8 + Math.random() * 17
							: pollutant === "CO"
							? 2 + Math.random() * 5
							: 60 + Math.random() * 60;

					const seasonalTrend = Math.sin(weekNum / 4) * 15;
					const value = Math.max(0, baseValue + seasonalTrend);
					values.push(value.toFixed(1));

					// Generate uncertainty bands (for error bars)
					uncertainties.push((value * 0.08).toFixed(1));
				} else if (grouping === "monthly" && i % 30 === 0) {
					const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
					const monthIndex = (start.getMonth() + Math.floor(i / 30)) % 12;
					label = monthNames[monthIndex];
					labels.push(label);

					// Generate aggregated monthly values with seasonal patterns
					const seasonalFactor =
						monthIndex >= 10 || monthIndex <= 2
							? 1.3 // Winter (Nov-Feb)
							: monthIndex >= 3 && monthIndex <= 5
							? 0.9 // Spring (Mar-May)
							: monthIndex >= 6 && monthIndex <= 9
							? 1.1
							: 1; // Summer/Fall

					const baseValue =
						pollutant === "PM2.5"
							? 30 + Math.random() * 40
							: pollutant === "PM10"
							? 50 + Math.random() * 60
							: pollutant === "O3"
							? 35 + Math.random() * 45
							: pollutant === "NO2"
							? 20 + Math.random() * 30
							: pollutant === "SO2"
							? 8 + Math.random() * 17
							: pollutant === "CO"
							? 2 + Math.random() * 5
							: 60 + Math.random() * 60;

					const value = Math.max(0, baseValue * seasonalFactor);
					values.push(value.toFixed(1));

					// Generate uncertainty bands (for error bars)
					uncertainties.push((value * 0.07).toFixed(1));
				}
			}
		}

		return {
			labels,
			values,
			uncertainties,
		};
	};

	// Generate mock predictions data
	const generateMockPredictions = (data) => {
		const lastDataIndex = data.labels.length - 1;
		const lastDate = new Date(data.labels[lastDataIndex]);

		// Generate 5 days worth of predictions
		const predictionLabels = [];
		const predictionValues = [];
		const predictionUncertainties = [];

		const lastDataPoint = parseFloat(data.values[lastDataIndex]);

		for (let i = 1; i <= 5; i++) {
			const nextDate = new Date(lastDate);
			nextDate.setDate(lastDate.getDate() + i);

			// Format date label
			const label = `${nextDate.getMonth() + 1}/${nextDate.getDate()}`;
			predictionLabels.push(label);

			// Generate prediction with increasing uncertainty
			const trend = Math.sin(i) * 5;
			const randomFactor = Math.random() * 10 - 5;
			const predicted = lastDataPoint + trend + randomFactor;
			predictionValues.push(predicted.toFixed(1));

			// Uncertainty increases with time
			predictionUncertainties.push((predicted * (0.1 + i * 0.05)).toFixed(1));
		}

		return {
			predictionLabels,
			predictionValues,
			predictionUncertainties,
		};
	};

	// Generate mock weather data
	const generateMockWeatherData = (startDate, endDate, grouping, weatherParameter) => {
		const mockData = generateMockData(startDate, endDate, grouping);
		const labels = mockData.labels;
		let values = [];

		// Generate weather values based on parameter
		for (let i = 0; i < labels.length; i++) {
			let baseValue = 0;

			switch (weatherParameter) {
				case "temperature":
					baseValue = 20 + Math.random() * 15;
					break;
				case "humidity":
					baseValue = 50 + Math.random() * 40;
					break;
				case "wind_speed":
					baseValue = 5 + Math.random() * 15;
					break;
				case "precipitation":
					baseValue = Math.random() * 10;
					break;
				case "pressure":
					baseValue = 1000 + Math.random() * 30;
					break;
				default:
					baseValue = 50 + Math.random() * 50;
			}

			// Add some correlation with pollution data if it exists
			if (mockData.values && mockData.values[i]) {
				const pollutionValue = parseFloat(mockData.values[i]);

				// Different correlations for different weather parameters
				if (weatherParameter === "temperature") {
					// Higher temps may correlate with higher ozone
					baseValue += pollutionValue / 10;
				} else if (weatherParameter === "wind_speed") {
					// Higher winds may correlate with lower particulate matter
					baseValue -= pollutionValue / 20;
				} else if (weatherParameter === "humidity") {
					// Higher humidity may correlate with lower PM levels in some cases
					baseValue -= pollutionValue / 15;
				}
			}

			values.push(baseValue.toFixed(1));
		}

		return {
			labels,
			values,
			parameter: weatherParameter,
		};
	};

	// Calculate mock correlation between pollution and weather
	const calculateMockCorrelation = (pollutionValues, weatherValues) => {
		// Simple mock correlation calculation
		const normalizedPollution = pollutionValues.map((v) => parseFloat(v));
		const normalizedWeather = weatherValues.map((v) => parseFloat(v));

		// Calculate mean values
		const meanPollution = normalizedPollution.reduce((sum, val) => sum + val, 0) / normalizedPollution.length;
		const meanWeather = normalizedWeather.reduce((sum, val) => sum + val, 0) / normalizedWeather.length;

		// Calculate correlation coefficient (Pearson)
		let numerator = 0;
		let denominatorPollution = 0;
		let denominatorWeather = 0;

		for (let i = 0; i < normalizedPollution.length; i++) {
			const diffPollution = normalizedPollution[i] - meanPollution;
			const diffWeather = normalizedWeather[i] - meanWeather;

			numerator += diffPollution * diffWeather;
			denominatorPollution += diffPollution * diffPollution;
			denominatorWeather += diffWeather * diffWeather;
		}

		const correlation = numerator / Math.sqrt(denominatorPollution * denominatorWeather);

		// Calculate scatter plot data points
		const scatterData = normalizedPollution.map((p, i) => ({ x: p, y: normalizedWeather[i] }));

		return {
			coefficient: correlation.toFixed(2),
			scatterData,
			interpretation: interpretCorrelation(correlation, weatherCorrelation, pollutant),
		};
	};

	// Generate interpretation of correlation results
	const interpretCorrelation = (coefficient, weatherParam, pollutantType) => {
		const strength = Math.abs(coefficient) < 0.3 ? "weak" : Math.abs(coefficient) < 0.6 ? "moderate" : "strong";
		const direction = coefficient > 0 ? "positive" : "negative";

		let explanation = "";

		if (weatherParam === "temperature") {
			if (pollutantType === "O3" && direction === "positive") {
				explanation = `There is a ${strength} positive correlation between temperature and ozone levels. This is consistent with scientific knowledge, as higher temperatures tend to accelerate photochemical reactions that form ozone.`;
			} else if (pollutantType.startsWith("PM") && direction === "positive") {
				explanation = `There is a ${strength} positive correlation between temperature and ${pollutantType} levels. This could indicate that warmer periods have increased particulate formation, possibly due to higher rates of chemical reactions or increased emissions from sources like wildfires.`;
			} else {
				explanation = `There is a ${strength} ${direction} correlation between temperature and ${pollutantType} levels.`;
			}
		} else if (weatherParam === "humidity") {
			if (pollutantType.startsWith("PM") && direction === "negative") {
				explanation = `There is a ${strength} negative correlation between humidity and ${pollutantType} levels. This may be because higher humidity can cause particulate matter to settle out of the air more quickly.`;
			} else {
				explanation = `There is a ${strength} ${direction} correlation between humidity and ${pollutantType} levels.`;
			}
		} else if (weatherParam === "wind_speed") {
			if (direction === "negative") {
				explanation = `There is a ${strength} negative correlation between wind speed and ${pollutantType} levels. This is expected as higher wind speeds typically disperse pollutants more effectively.`;
			} else {
				explanation = `There is a ${strength} positive correlation between wind speed and ${pollutantType} levels. This might be unexpected and could indicate that higher winds are bringing in pollution from other areas.`;
			}
		} else {
			explanation = `There is a ${strength} ${direction} correlation between ${weatherParam} and ${pollutantType} levels.`;
		}

		return explanation;
	};

	// Generate mock insights using LLM-style text
	const generateMockInsights = (pollutantType, locationName) => {
		const insights = [
			`Analysis of ${pollutantType} data for ${
				locationName === "all" ? "all stations" : locationName
			} shows several key patterns. There appears to be a cyclical trend with higher levels during weekdays, particularly during morning and evening rush hours, suggesting traffic as a major contributor.`,

			`Over the selected time period, ${pollutantType} concentrations exceeded WHO recommended thresholds approximately 37% of the time. The highest readings were observed in the ${
				locationName === "delhi" || locationName === "all" ? "Delhi-NCR region" : locationName
			} area, where levels peaked at up to 3.2 times the safe threshold.`,

			`Weather conditions appear to play a significant role in ${pollutantType} concentration levels. Lower wind speeds and temperature inversions are strongly correlated with pollution buildup, particularly during the winter months when residential heating adds to baseline emissions.`,

			`Time series analysis reveals an overall ${Math.random() > 0.5 ? "improving" : "worsening"} trend in air quality over the selected period. This may be related to ${
				Math.random() > 0.5 ? "the implementation of emissions control policies" : "increased industrial activity and vehicle usage"
			} in the region.`,

			`If current patterns continue, we project that ${pollutantType} levels may ${
				Math.random() > 0.6 ? "decrease by approximately 8-12% in the coming weeks" : "increase by approximately 15-20% in the coming weeks"
			}, though this projection has moderate uncertainty due to variable weather patterns forecast for the region.`,
		];

		return insights.join("\n\n");
	};

	// Handle export of data
	const handleExportData = () => {
		if (!data) return;

		if (exportFormat === "csv") {
			let csvContent = "Date,Value\n";

			for (let i = 0; i < data.labels.length; i++) {
				csvContent += `${data.labels[i]},${data.values[i]}\n`;
			}

			// Create and trigger download
			const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.setAttribute("href", url);
			link.setAttribute("download", `AirAlert_${pollutant}_${location}_${new Date().toISOString().split("T")[0]}.csv`);
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} else if (exportFormat === "json") {
			const jsonData = {
				metadata: {
					pollutant,
					location,
					timeGrouping,
					dateRange,
					generatedAt: new Date().toISOString(),
				},
				data: data.labels.map((label, i) => ({
					date: label,
					value: data.values[i],
					uncertainty: data.uncertainties[i],
				})),
			};

			const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.setAttribute("href", url);
			link.setAttribute("download", `AirAlert_${pollutant}_${location}_${new Date().toISOString().split("T")[0]}.json`);
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} else if (exportFormat === "image" && chartRef.current) {
			// Export chart as image
			const url = chartRef.current.toBase64Image();
			const link = document.createElement("a");
			link.setAttribute("href", url);
			link.setAttribute("download", `AirAlert_${pollutant}_${location}_${new Date().toISOString().split("T")[0]}.png`);
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}
	};

	// Prepare chart data
	const prepareChartData = () => {
		if (!data) return null;

		const datasets = [
			{
				label: `${pollutant} Values`,
				data: data.values,
				borderColor: "rgba(75, 192, 192, 1)",
				backgroundColor: "rgba(75, 192, 192, 0.2)",
				fill: true,
				tension: 0.4,
			},
		];

		// Add prediction data if available
		if (data.predictionValues) {
			datasets.push({
				label: `${pollutant} Predictions`,
				data: data.predictionValues,
				borderColor: "rgba(255, 159, 64, 1)",
				backgroundColor: "rgba(255, 159, 64, 0.2)",
				borderDash: [5, 5],
				fill: true,
				tension: 0.2,
			});
		}

		// Add weather correlation data if available
		if (weatherData && weatherCorrelation !== "none") {
			datasets.push({
				label: `${weatherCorrelation.charAt(0).toUpperCase() + weatherCorrelation.slice(1)}`,
				data: weatherData.values,
				borderColor: "rgba(153, 102, 255, 1)",
				backgroundColor: "rgba(153, 102, 255, 0.2)",
				fill: false,
				tension: 0.4,
				yAxisID: "y1",
			});
		}

		// Return the appropriate chart data based on visualization type
		if (visualizationType === "scatter" && correlationResults) {
			return {
				datasets: [
					{
						label: `${pollutant} vs ${weatherCorrelation}`,
						data: correlationResults.scatterData,
						backgroundColor: "rgba(75, 192, 192, 0.6)",
						borderColor: "rgba(75, 192, 192, 1)",
						borderWidth: 1,
						pointRadius: 4,
						pointHoverRadius: 7,
					},
				],
			};
		} else {
			return {
				labels: [...data.labels, ...(data.predictionLabels || [])],
				datasets,
			};
		}
	};

	// Prepare chart options
	const prepareChartOptions = () => {
		let options = {
			responsive: true,
			maintainAspectRatio: false,
			interaction: {
				mode: "index",
				intersect: false,
			},
			plugins: {
				legend: {
					position: "top",
				},
				title: {
					display: true,
					text: `${pollutant} Levels for ${location === "all" ? "All Stations" : location}`,
				},
				tooltip: {
					callbacks: {
						label: function (context) {
							let label = context.dataset.label || "";
							if (label) {
								label += ": ";
							}
							label += context.parsed.y;
							return label;
						},
					},
				},
			},
		};

		// Add scales for dual axis if showing weather correlation
		if (weatherData && weatherCorrelation !== "none" && visualizationType !== "scatter") {
			options.scales = {
				y: {
					type: "linear",
					display: true,
					position: "left",
					title: {
						display: true,
						text: getPollutantUnit(pollutant),
					},
				},
				y1: {
					type: "linear",
					display: true,
					position: "right",
					grid: {
						drawOnChartArea: false,
					},
					title: {
						display: true,
						text: getWeatherUnit(weatherCorrelation),
					},
				},
			};
		} else if (visualizationType === "scatter" && correlationResults) {
			options.scales = {
				x: {
					title: {
						display: true,
						text: `${pollutant} (${getPollutantUnit(pollutant)})`,
					},
				},
				y: {
					title: {
						display: true,
						text: `${weatherCorrelation.charAt(0).toUpperCase() + weatherCorrelation.slice(1)} (${getWeatherUnit(weatherCorrelation)})`,
					},
				},
			};
		} else {
			options.scales = {
				y: {
					title: {
						display: true,
						text: getPollutantUnit(pollutant),
					},
				},
			};
		}

		return options;
	};

	// Helper function to get units
	const getPollutantUnit = (pollutantType) => {
		switch (pollutantType) {
			case "PM2.5":
			case "PM10":
				return "μg/m³";
			case "O3":
			case "NO2":
			case "SO2":
				return "ppb";
			case "CO":
				return "ppm";
			case "AQI":
				return "";
			default:
				return "";
		}
	};

	const getWeatherUnit = (weatherType) => {
		switch (weatherType) {
			case "temperature":
				return "°C";
			case "humidity":
				return "%";
			case "wind_speed":
				return "m/s";
			case "precipitation":
				return "mm";
			case "pressure":
				return "hPa";
			default:
				return "";
		}
	};

	return (
		<div className="data-explorer">
			<h1>Data Explorer</h1>

			<div className="data-explorer-tabs">
				<button className={view === "visualization" ? "active" : ""} onClick={() => setView("visualization")}>
					Visualization
				</button>
				<button className={view === "insights" ? "active" : ""} onClick={() => setView("insights")}>
					AI Insights
				</button>
				<button className={view === "export" ? "active" : ""} onClick={() => setView("export")}>
					Export Data
				</button>
			</div>

			<div className="data-explorer-content">
				<div className="filters-container">
					<h2>Data Filters</h2>
					<div className="filters">
						<div className="filter-row">
							<label>
								Pollutant:
								<select value={pollutant} onChange={(e) => setPollutant(e.target.value)}>
									{pollutants.map((p) => (
										<option key={p.id} value={p.id}>
											{p.name}
										</option>
									))}
								</select>
							</label>

							<label>
								Location:
								<select value={location} onChange={(e) => setLocation(e.target.value)}>
									{locations.map((loc) => (
										<option key={loc.id} value={loc.id}>
											{loc.name}
										</option>
									))}
								</select>
							</label>
						</div>

						<div className="filter-row">
							<label>
								Start Date:
								<input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} />
							</label>

							<label>
								End Date:
								<input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} />
							</label>
						</div>

						<div className="filter-row">
							<label>
								Time Grouping:
								<select value={timeGrouping} onChange={(e) => setTimeGrouping(e.target.value)}>
									<option value="hourly">Hourly</option>
									<option value="daily">Daily</option>
									<option value="weekly">Weekly</option>
									<option value="monthly">Monthly</option>
								</select>
							</label>

							<label>
								Visualization Type:
								<select value={visualizationType} onChange={(e) => setVisualizationType(e.target.value)}>
									<option value="line">Line Chart</option>
									<option value="bar">Bar Chart</option>
									<option value="scatter" disabled={weatherCorrelation === "none"}>
										Scatter Plot (Correlation)
									</option>
								</select>
							</label>
						</div>

						<div className="filter-row">
							<label>
								Weather Correlation:
								<select value={weatherCorrelation} onChange={(e) => setWeatherCorrelation(e.target.value)}>
									<option value="none">None</option>
									{weatherMetrics.map((w) => (
										<option key={w.id} value={w.id}>
											{w.name}
										</option>
									))}
								</select>
							</label>

							<div className="checkbox-filter">
								<label>
									<input type="checkbox" checked={showPredictions} onChange={(e) => setShowPredictions(e.target.checked)} />
									Show AI Predictions
								</label>
							</div>
						</div>

						<button className="apply-filters" onClick={handleFilterChange}>
							Apply Filters
						</button>
					</div>
				</div>

				{loading ? (
					<div className="loading">
						<p>Loading data...</p>
					</div>
				) : (
					<>
						{view === "visualization" && data && (
							<div className="visualization-container">
								<div className="chart-container">
									{visualizationType === "line" && <Line ref={chartRef} data={prepareChartData()} options={prepareChartOptions()} />}

									{visualizationType === "bar" && <Bar ref={chartRef} data={prepareChartData()} options={prepareChartOptions()} />}

									{visualizationType === "scatter" && correlationResults && <Scatter ref={chartRef} data={prepareChartData()} options={prepareChartOptions()} />}
								</div>

								{correlationResults && weatherCorrelation !== "none" && (
									<div className="correlation-results">
										<h3>Correlation Analysis</h3>
										<p>
											<strong>Correlation Coefficient:</strong> {correlationResults.coefficient}
										</p>
										<p>{correlationResults.interpretation}</p>
									</div>
								)}
							</div>
						)}

						{view === "insights" && insights && (
							<div className="insights-container">
								<h2>AI-Powered Insights</h2>
								<div className="ai-insights">
									{insights.split("\n\n").map((paragraph, i) => (
										<p key={i}>{paragraph}</p>
									))}
								</div>

								{data && showPredictions && (
									<div className="prediction-insights">
										<h3>Prediction Analysis</h3>
										<p>
											Based on historical patterns and current trends, our AI model forecasts that {pollutant} levels will likely{" "}
											{parseFloat(data.predictionValues?.[0]) > parseFloat(data.values?.[data.values.length - 1]) ? "increase" : "decrease"} in the coming days. The predictions have a confidence
											interval that widens over time, reflecting increasing uncertainty for longer-term forecasts.
										</p>
									</div>
								)}
							</div>
						)}

						{view === "export" && data && (
							<div className="export-container">
								<h2>Export Data</h2>

								<div className="export-options">
									<label>
										Export Format:
										<select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
											<option value="csv">CSV</option>
											<option value="json">JSON</option>
											<option value="image">Chart Image</option>
										</select>
									</label>

									<button className="export-button" onClick={handleExportData}>
										Export Data
									</button>
								</div>

								<div className="export-preview">
									<h3>Preview</h3>
									{exportFormat === "csv" && (
										<pre className="code-preview">
											Date,Value
											<br />
											{data.labels.slice(0, 5).map((label, i) => `${label},${data.values[i]}\n`)}
											...
										</pre>
									)}

									{exportFormat === "json" && (
										<pre className="code-preview">
											{JSON.stringify(
												{
													metadata: {
														pollutant,
														location,
														timeGrouping,
														dateRange,
														generatedAt: new Date().toISOString(),
													},
													data: data.labels.slice(0, 3).map((label, i) => ({
														date: label,
														value: data.values[i],
														uncertainty: data.uncertainties[i],
													})),
												},
												null,
												2
											)}
											...
										</pre>
									)}

									{exportFormat === "image" && <p>The current visualization will be exported as a PNG image.</p>}
								</div>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
};

export default DataExplorerPage;
