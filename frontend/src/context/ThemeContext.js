import React, { createContext, useState, useContext, useEffect } from "react";

// Create theme context
export const ThemeContext = createContext();

// Theme provider component
export const ThemeProvider = ({ children }) => {
	// Initialize theme from localStorage or default to 'light'
	const [theme, setTheme] = useState(() => {
		const savedTheme = localStorage.getItem("theme");
		return savedTheme || "light";
	});

	// Apply theme changes to document
	useEffect(() => {
		// Save to localStorage
		localStorage.setItem("theme", theme);

		// Apply theme to document
		document.documentElement.setAttribute("data-theme", theme);

		// Optional: Add/remove class from body
		if (theme === "dark") {
			document.body.classList.add("dark-theme");
		} else {
			document.body.classList.remove("dark-theme");
		}
	}, [theme]);

	// Toggle theme function
	const toggleTheme = () => {
		setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
	};

	// Set specific theme function
	const setSpecificTheme = (newTheme) => {
		if (newTheme === "light" || newTheme === "dark") {
			setTheme(newTheme);
		}
	};

	// Context value
	const value = {
		theme,
		toggleTheme,
		setTheme: setSpecificTheme,
		isDarkMode: theme === "dark",
	};

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

// Custom hook for using theme context
export const useTheme = () => {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
};

export default ThemeProvider;
