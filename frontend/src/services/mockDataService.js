/**
 * Mock Data Service
 * Provides sample data when the API is unavailable
 */

import moment from "moment";

// Generate random integer between min and max (inclusive)
const randomInt = (min, max) => {
	return Math.floor(Math.random() * (max - min + 1) + min);
};

// Generate random float between min and max with specified decimal places
const randomFloat = (min, max, decimals = 2) => {
	const rand = Math.random() * (max - min) + min;
	const power = Math.pow(10, decimals);
	return Math.floor(rand * power) / power;
};

// Generate AQI value based on PM2.5 concentration
const calculateAQI = (pm25) => {
	if (pm25 <= 12) return Math.round((50 / 12) * pm25);
	if (pm25 <= 35.4) return Math.round(50 + ((100 - 50) / (35.4 - 12.1)) * (pm25 - 12.1));
	if (pm25 <= 55.4) return Math.round(100 + ((150 - 100) / (55.4 - 35.5)) * (pm25 - 35.5));
	if (pm25 <= 150.4) return Math.round(150 + ((200 - 150) / (150.4 - 55.5)) * (pm25 - 55.5));
	if (pm25 <= 250.4) return Math.round(200 + ((300 - 200) / (250.4 - 150.5)) * (pm25 - 150.5));
	if (pm25 <= 350.4) return Math.round(300 + ((400 - 300) / (350.4 - 250.5)) * (pm25 - 250.5));
	return Math.round(400 + ((500 - 400) / (500.4 - 350.5)) * (pm25 - 350.5));
};

// Generate mock station data
export const generateStations = (count = 20) => {
	const cities = [
		{ name: "Delhi", state: "Delhi", lat: 28.7041, lng: 77.1025 },
		{ name: "Mumbai", state: "Maharashtra", lat: 19.076, lng: 72.8777 },
		{ name: "Bangalore", state: "Karnataka", lat: 12.9716, lng: 77.5946 },
		{ name: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707 },
		{ name: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639 },
		{ name: "Hyderabad", state: "Telangana", lat: 17.385, lng: 78.4867 },
		{ name: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567 },
		{ name: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714 },
		{ name: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873 },
		{ name: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462 },
		{ name: "Kanpur", state: "Uttar Pradesh", lat: 26.4499, lng: 80.3319 },
		{ name: "Nagpur", state: "Maharashtra", lat: 21.1458, lng: 79.0882 },
		{ name: "Indore", state: "Madhya Pradesh", lat: 22.7196, lng: 75.8577 },
		{ name: "Thane", state: "Maharashtra", lat: 19.2183, lng: 72.9781 },
		{ name: "Bhopal", state: "Madhya Pradesh", lat: 23.2599, lng: 77.4126 },
	];

	const sources = ["CPCB", "SPCB", "USAID", "OpenAQ", "EPA"];
	const stations = [];

	for (let i = 1; i <= count; i++) {
		const cityIndex = Math.floor(Math.random() * cities.length);
		const city = cities[cityIndex];

		// Add some randomness to the latitude and longitude to spread stations in the city
		const latOffset = (Math.random() - 0.5) * 0.1;
		const lngOffset = (Math.random() - 0.5) * 0.1;

		const lastUpdated = new Date();
		lastUpdated.setMinutes(lastUpdated.getMinutes() - randomInt(0, 180)); // 0-3 hours ago

		stations.push({
			id: i,
			station_name: `${city.name} Station ${i}`,
			station_code: `ST${i.toString().padStart(3, "0")}`,
			latitude: city.lat + latOffset,
			longitude: city.lng + lngOffset,
			city: city.name,
			state: city.state,
			country: "India",
			source: sources[Math.floor(Math.random() * sources.length)],
			last_updated: lastUpdated.toISOString(),
			status: Math.random() > 0.2 ? "active" : Math.random() > 0.5 ? "maintenance" : "offline",
		});
	}

	return stations;
};

// Generate mock air quality data
export const generateAirQualityData = (stations, days = 30) => {
	const data = [];
	const now = new Date();
	const endDate = now;
	const startDate = new Date(now);
	startDate.setDate(startDate.getDate() - days);

	// Loop through each station
	stations.forEach((station) => {
		// Base pollutant levels for this station (some stations will be cleaner than others)
		const basePm25 = randomInt(10, 50);
		const basePm10 = basePm25 * randomFloat(1.5, 2.5);
		const baseO3 = randomInt(20, 60);
		const baseNo2 = randomInt(10, 40);
		const baseSo2 = randomInt(5, 20);
		const baseCo = randomFloat(0.5, 3, 1);

		// Loop through each day
		const currentDate = new Date(startDate);
		while (currentDate <= endDate) {
			// Generate multiple readings per day (every 2-4 hours)
			const readingsPerDay = randomInt(6, 12);

			for (let i = 0; i < readingsPerDay; i++) {
				const hour = Math.floor(i * (24 / readingsPerDay));
				const readingDate = new Date(currentDate);
				readingDate.setHours(hour, randomInt(0, 59), 0, 0);

				if (readingDate > endDate) continue;

				// Daily cycle: pollution is typically worse in the morning and evening
				const hourFactor = 1 + 0.3 * Math.sin(((hour - 6) * Math.PI) / 12);

				// Weekly cycle: pollution might be lower on weekends
				const dayOfWeek = readingDate.getDay(); // 0 = Sunday, 6 = Saturday
				const weekendFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.8 : 1;

				// Seasonal trend (simplified)
				const dayOfYear = Math.floor((readingDate - new Date(readingDate.getFullYear(), 0, 0)) / (24 * 60 * 60 * 1000));
				const seasonalFactor = 1 + 0.2 * Math.sin(((dayOfYear - 80) * 2 * Math.PI) / 365);

				// Random daily variation
				const dailyVariation = randomFloat(0.8, 1.2);

				// Combine all factors
				const factor = hourFactor * weekendFactor * seasonalFactor * dailyVariation;

				// Calculate pollutant values with some correlation between them
				const pm25 = Math.max(1, Math.round(basePm25 * factor * randomFloat(0.9, 1.1)));
				const pm10 = Math.max(2, Math.round(basePm10 * factor * randomFloat(0.9, 1.1)));
				const o3 = Math.max(1, Math.round(baseO3 * factor * randomFloat(0.8, 1.2)));
				const no2 = Math.max(1, Math.round(baseNo2 * factor * randomFloat(0.8, 1.2)));
				const so2 = Math.max(1, Math.round(baseSo2 * factor * randomFloat(0.8, 1.2)));
				const co = Math.max(0.1, baseO3 * factor * randomFloat(0.8, 1.2)).toFixed(1);
				const aqi = calculateAQI(pm25);

				data.push({
					timestamp: readingDate.toISOString(),
					date: readingDate.toISOString().split("T")[0],
					station_id: station.id,
					station_name: station.station_name,
					city: station.city,
					state: station.state,
					country: station.country,
					pm25,
					pm10,
					o3,
					no2,
					so2,
					co,
					aqi,
					temperature: randomInt(15, 35),
					humidity: randomInt(30, 90),
					wind_speed: randomFloat(0, 15, 1),
					wind_direction: randomInt(0, 359),
				});
			}

			// Move to the next day
			currentDate.setDate(currentDate.getDate() + 1);
		}
	});

	return data;
};

// Mock API endpoints
export const mockApi = {
	getStations: async () => {
		return { stations: generateStations(), count: 20 };
	},

	getAirQuality: async (params) => {
		const stations = generateStations();
		let data = generateAirQualityData(stations);

		// Filter by station if specified
		if (params?.station_id) {
			const stationIds = params.station_id.split(",").map((id) => parseInt(id));
			data = data.filter((item) => stationIds.includes(item.station_id));
		}

		// Filter by pollutant if specified (we actually don't filter, just for mock data)

		// Filter by date range if specified
		if (params?.start_date) {
			const startDate = new Date(params.start_date);
			data = data.filter((item) => new Date(item.timestamp) >= startDate);
		}

		if (params?.end_date) {
			const endDate = new Date(params.end_date);
			data = data.filter((item) => new Date(item.timestamp) <= endDate);
		}

		return { readings: data, count: data.length };
	},
};

export default mockApi;
