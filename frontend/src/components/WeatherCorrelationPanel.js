import React, { useState, useEffect } from "react";
import "../styles/WeatherCorrelationPanel.css";

/**
 * Weather Correlation Panel
 * Shows correlation between weather parameters and pollutant concentrations
 */
const WeatherCorrelationPanel = ({ airQualityData, selectedPollutant, pollutantConfig }) => {
	const [correlations, setCorrelations] = useState({
		temperature: null,
		humidity: null,
		windSpeed: null,
	});
	const [scatterData, setScatterData] = useState([]);
	const [selectedWeatherParam, setSelectedWeatherParam] = useState("temperature");

	useEffect(() => {
		if (!airQualityData || airQualityData.length === 0) return;

		// Calculate correlations
		calculateCorrelations();

		// Prepare scatter plot data for the selected parameter
		prepareScatterData();
	}, [airQualityData, selectedPollutant, selectedWeatherParam]);

	const calculateCorrelations = () => {
		// Filter out readings with missing data
		const validData = airQualityData.filter(
			(reading) => reading[selectedPollutant] !== undefined && reading.temperature !== undefined && reading.humidity !== undefined && reading.wind_speed !== undefined
		);

		if (validData.length < 5) {
			// Not enough data points for meaningful correlation
			setCorrelations({
				temperature: null,
				humidity: null,
				windSpeed: null,
			});
			return;
		}

		// Calculate Pearson correlation coefficient for each weather parameter
		const tempCorr = calculatePearsonCorrelation(
			validData.map((d) => d.temperature),
			validData.map((d) => d[selectedPollutant])
		);

		const humidityCorr = calculatePearsonCorrelation(
			validData.map((d) => d.humidity),
			validData.map((d) => d[selectedPollutant])
		);

		const windSpeedCorr = calculatePearsonCorrelation(
			validData.map((d) => d.wind_speed),
			validData.map((d) => d[selectedPollutant])
		);

		setCorrelations({
			temperature: tempCorr,
			humidity: humidityCorr,
			windSpeed: windSpeedCorr,
		});
	};

	const prepareScatterData = () => {
		// Prepare data for scatter plot
		const data = airQualityData
			.filter((reading) => reading[selectedPollutant] !== undefined && reading[getWeatherParamKey(selectedWeatherParam)] !== undefined)
			.map((reading) => ({
				pollutant: reading[selectedPollutant],
				weather: reading[getWeatherParamKey(selectedWeatherParam)],
				station: reading.station_id,
				timestamp: reading.timestamp,
			}));

		setScatterData(data);
	};

	const getWeatherParamKey = (param) => {
		switch (param) {
			case "temperature":
				return "temperature";
			case "humidity":
				return "humidity";
			case "windSpeed":
				return "wind_speed";
			default:
				return "temperature";
		}
	};

	const getWeatherParamUnit = (param) => {
		switch (param) {
			case "temperature":
				return "°C";
			case "humidity":
				return "%";
			case "windSpeed":
				return "m/s";
			default:
				return "";
		}
	};

	const calculatePearsonCorrelation = (x, y) => {
		// Ensure arrays are of the same length
		if (x.length !== y.length) {
			return null;
		}

		const n = x.length;

		// Check if we have enough data points
		if (n < 5) return null;

		// Calculate means
		const meanX = x.reduce((total, val) => total + val, 0) / n;
		const meanY = y.reduce((total, val) => total + val, 0) / n;

		// Calculate differences from means
		const diffsX = x.map((val) => val - meanX);
		const diffsY = y.map((val) => val - meanY);

		// Calculate sum of squares
		const sumSquaresX = diffsX.reduce((total, diff) => total + diff * diff, 0);
		const sumSquaresY = diffsY.reduce((total, diff) => total + diff * diff, 0);

		// Calculate sum of products
		let sumProducts = 0;
		for (let i = 0; i < n; i++) {
			sumProducts += diffsX[i] * diffsY[i];
		}

		// Calculate Pearson correlation coefficient
		const r = sumProducts / Math.sqrt(sumSquaresX * sumSquaresY);

		return isNaN(r) ? null : r;
	};

	const getCorrelationStrength = (correlation) => {
		if (correlation === null) return "Insufficient data";

		const absCorr = Math.abs(correlation);
		if (absCorr > 0.7) return "Strong";
		if (absCorr > 0.5) return "Moderate";
		if (absCorr > 0.3) return "Weak";
		return "Very weak";
	};

	const getCorrelationDescription = (parameter, correlation) => {
		if (correlation === null) return "Not enough data to determine correlation";

		let description = "";
		const param = parameter === "windSpeed" ? "wind speed" : parameter;

		if (correlation > 0) {
			description = `As ${param} increases, ${pollutantConfig[selectedPollutant].label} levels tend to increase`;
		} else {
			description = `As ${param} increases, ${pollutantConfig[selectedPollutant].label} levels tend to decrease`;
		}

		return description;
	};

	const getCorrelationClass = (correlation) => {
		if (correlation === null) return "neutral";

		const absCorr = Math.abs(correlation);
		if (absCorr > 0.7) return correlation > 0 ? "strong-positive" : "strong-negative";
		if (absCorr > 0.5) return correlation > 0 ? "moderate-positive" : "moderate-negative";
		if (absCorr > 0.3) return correlation > 0 ? "weak-positive" : "weak-negative";
		return "very-weak";
	};

	// If no valid correlations, show a message
	if (!correlations.temperature && !correlations.humidity && !correlations.windSpeed) {
		return (
			<div className="weather-correlation-panel">
				<div className="visualization-header">
					<h2>Weather Correlation Analysis</h2>
				</div>
				<div className="empty-state">
					<p>Insufficient data to analyze weather correlations. Please ensure your data contains weather parameters.</p>
				</div>
			</div>
		);
	}

	return (
		<div className="weather-correlation-panel">
			<div className="visualization-header">
				<h2>Weather Correlation Analysis</h2>
				<div className="weather-param-selector">
					<label>Weather Parameter:</label>
					<select value={selectedWeatherParam} onChange={(e) => setSelectedWeatherParam(e.target.value)}>
						<option value="temperature">Temperature</option>
						<option value="humidity">Humidity</option>
						<option value="windSpeed">Wind Speed</option>
					</select>
				</div>
			</div>

			<div className="correlation-content">
				<div className="correlation-metrics">
					<div className={`correlation-card ${getCorrelationClass(correlations.temperature)}`}>
						<div className="correlation-header">
							<h3>Temperature</h3>
							<div className="correlation-value">{correlations.temperature !== null ? correlations.temperature.toFixed(2) : "N/A"}</div>
						</div>
						<div className="correlation-details">
							<p className="correlation-strength">{getCorrelationStrength(correlations.temperature)}</p>
							<p className="correlation-description">{getCorrelationDescription("temperature", correlations.temperature)}</p>
						</div>
					</div>

					<div className={`correlation-card ${getCorrelationClass(correlations.humidity)}`}>
						<div className="correlation-header">
							<h3>Humidity</h3>
							<div className="correlation-value">{correlations.humidity !== null ? correlations.humidity.toFixed(2) : "N/A"}</div>
						</div>
						<div className="correlation-details">
							<p className="correlation-strength">{getCorrelationStrength(correlations.humidity)}</p>
							<p className="correlation-description">{getCorrelationDescription("humidity", correlations.humidity)}</p>
						</div>
					</div>

					<div className={`correlation-card ${getCorrelationClass(correlations.windSpeed)}`}>
						<div className="correlation-header">
							<h3>Wind Speed</h3>
							<div className="correlation-value">{correlations.windSpeed !== null ? correlations.windSpeed.toFixed(2) : "N/A"}</div>
						</div>
						<div className="correlation-details">
							<p className="correlation-strength">{getCorrelationStrength(correlations.windSpeed)}</p>
							<p className="correlation-description">{getCorrelationDescription("windSpeed", correlations.windSpeed)}</p>
						</div>
					</div>
				</div>

				<div className="scatter-plot-container">
					<h3>
						{pollutantConfig[selectedPollutant].label} vs {selectedWeatherParam === "windSpeed" ? "Wind Speed" : selectedWeatherParam}
					</h3>
					<div className="scatter-plot">
						{scatterData.length > 0 ? (
							<div className="scatter-points-container">
								{scatterData.map((point, index) => (
									<div
										key={`point-${index}`}
										className="scatter-point"
										style={{
											bottom: `${(point.pollutant / (Math.max(...scatterData.map((d) => d.pollutant)) * 1.1)) * 100}%`,
											left: `${(point.weather / (Math.max(...scatterData.map((d) => d.weather)) * 1.1)) * 100}%`,
										}}
										title={`${point.pollutant} ${pollutantConfig[selectedPollutant].unit} at ${point.weather} ${getWeatherParamUnit(selectedWeatherParam)}`}
									/>
								))}
							</div>
						) : (
							<div className="empty-scatter">No data available for scatter plot</div>
						)}
						<div className="axis x-axis">
							<span className="axis-title">
								{selectedWeatherParam === "windSpeed" ? "Wind Speed" : selectedWeatherParam} ({getWeatherParamUnit(selectedWeatherParam)})
							</span>
						</div>
						<div className="axis y-axis">
							<span className="axis-title">
								{pollutantConfig[selectedPollutant].label} ({pollutantConfig[selectedPollutant].unit})
							</span>
						</div>
					</div>
				</div>
			</div>

			<div className="correlation-analysis">
				<h3>Analysis Insights</h3>
				<p className="insight-text">
					{correlations[selectedWeatherParam.replace("windSpeed", "windSpeed")] !== null ? (
						<>
							The data shows a {getCorrelationStrength(correlations[selectedWeatherParam.replace("windSpeed", "windSpeed")]).toLowerCase()}
							correlation ({correlations[selectedWeatherParam.replace("windSpeed", "windSpeed")].toFixed(2)}) between {selectedWeatherParam === "windSpeed" ? "wind speed" : selectedWeatherParam} and{" "}
							{pollutantConfig[selectedPollutant].label} levels.
							{Math.abs(correlations[selectedWeatherParam.replace("windSpeed", "windSpeed")]) > 0.5
								? ` This suggests that ${selectedWeatherParam === "windSpeed" ? "wind speed" : selectedWeatherParam} is a significant factor affecting ${
										pollutantConfig[selectedPollutant].label
								  } concentrations in this area.`
								: ` Other environmental factors may have a stronger influence on ${pollutantConfig[selectedPollutant].label} concentrations than ${
										selectedWeatherParam === "windSpeed" ? "wind speed" : selectedWeatherParam
								  }.`}
						</>
					) : (
						"Insufficient data to provide meaningful insights."
					)}
				</p>
			</div>
		</div>
	);
};

export default WeatherCorrelationPanel;
