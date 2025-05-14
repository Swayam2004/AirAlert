/**
 * Constants used in notification preference components
 */

export const SENSITIVITY_LEVELS = [
	{
		value: 0,
		label: "Standard",
		description: "Receive alerts for unhealthy levels and above",
	},
	{
		value: 1,
		label: "Sensitive",
		description: "Receive alerts at lower thresholds, suitable for sensitive individuals",
	},
	{
		value: 2,
		label: "Highly Sensitive",
		description: "Receive alerts at lowest thresholds, for those with severe respiratory conditions",
	},
];

export const POLLUTANTS = [
	{ id: "pm25", name: "PM2.5", unit: "μg/m³" },
	{ id: "pm10", name: "PM10", unit: "μg/m³" },
	{ id: "o3", name: "Ozone", unit: "ppb" },
	{ id: "no2", name: "NO2", unit: "ppb" },
	{ id: "so2", name: "SO2", unit: "ppb" },
	{ id: "co", name: "CO", unit: "ppm" },
	{ id: "aqi", name: "AQI", unit: "" },
];

export const HEALTH_CONDITIONS = [
	{ id: "has_asthma", name: "Asthma" },
	{ id: "has_copd", name: "COPD" },
	{ id: "has_heart_disease", name: "Heart Disease" },
	{ id: "has_diabetes", name: "Diabetes" },
	{ id: "has_pregnancy", name: "Pregnancy" },
];

export const AGE_CATEGORIES = [
	{ value: "child", label: "Child (0-12 years)" },
	{ value: "teen", label: "Teen (13-18 years)" },
	{ value: "adult", label: "Adult (19-64 years)" },
	{ value: "elderly", label: "Elderly (65+ years)" },
];

export const DEFAULT_PREFERENCES = {
	notification_channels: {
		email: false,
		sms: false,
		app: true,
	},
	sensitivity_level: 0,
	alert_subscriptions: [],
	is_active: true,
	health_profile: null,
};
