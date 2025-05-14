Design System
The design system includes a cohesive color palette, typography, and reusable components.
Color Palette
:root {
--primary-color: #3498db; /* Blue /
--secondary-color: #2ecc71; / Green /
--accent-color: #e74c3c; / Red /
--background-color: #f5f6fa; / Light background /
--card-bg: #ffffff; / White card background /
--text-color: #333; / Dark text /
--muted-text-color: #777; / Muted text */
--border-radius: 8px;
--box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
--transition: all 0.3s ease;
}

Typography
body {
font-family: "Inter", "Poppins", sans-serif;
color: var(--text-color);
background-color: var(--background-color);
line-height: 1.6;
}

h1, h2, h3, h4, h5, h6 {
font-family: "Poppins", sans-serif;
font-weight: 600;
margin-bottom: 1rem;
}

p {
font-size: 1rem;
color: var(--muted-text-color);
}

Reusable Components
I'll create reusable components like Card, Button, and StatCard.

Core Layout Structure
The layout will include a responsive grid system and a navigation bar.
Responsive Grid System
.container {
max-width: 1200px;
margin: 0 auto;
padding: 0 1rem;
}

.grid {
display: grid;
gap: 1.5rem;
}

.grid-2 {
grid-template-columns: repeat(2, 1fr);
}

.grid-3 {
grid-template-columns: repeat(3, 1fr);
}

@media (max-width: 768px) {
.grid-2, .grid-3 {
grid-template-columns: 1fr;
}
}

Navigation Bar
// Navigation.js
import React from "react";
import "./Navigation.css";

const Navigation = ({ activeSection, setActiveSection }) => {
const sections = [
{ id: "dashboard", label: "Dashboard" },
{ id: "trends", label: "Trends" },
{ id: "alerts", label: "Alerts" },
{ id: "stations", label: "Stations" },
{ id: "profile", label: "Profile" },
];

return (

<nav className="navigation"> <ul> {sections.map((section) => ( <li key={section.id}> <button className={activeSection === section.id ? "active" : ""} onClick={() => setActiveSection(section.id)} > {section.label} </button> </li> ))} </ul> </nav> ); };
export default Navigation;

/* Navigation.css */
.navigation {
background-color: var(--card-bg);
box-shadow: var(--box-shadow);
position: sticky;
top: 0;
z-index: 1000;
}

.navigation ul {
display: flex;
justify-content: space-around;
list-style: none;
margin: 0;
padding: 1rem;
}

.navigation button {
background: none;
border: none;
color: var(--text-color);
font-size: 1rem;
cursor: pointer;
transition: var(--transition);
}

.navigation button:hover,
.navigation button.active {
color: var(--primary-color);
font-weight: bold;
}

Dashboard Page
The dashboard will include a hero section, stat cards, pollutant charts, and a map for alerts.
Hero Section
// HeroSection.js
import React from "react";
import "./HeroSection.css";

const HeroSection = ({ aqi }) => (

<div className="hero-section"> <h1>Current AQI: {aqi}</h1> <p>Stay informed about the air quality in your area.</p> </div> );
export default HeroSection;

/* HeroSection.css */
.hero-section {
background-color: var(--primary-color);
color: white;
text-align: center;
padding: 2rem;
border-radius: var(--border-radius);
margin-bottom: 2rem;
}

.hero-section h1 {
font-size: 2.5rem;
margin-bottom: 0.5rem;
}

.hero-section p {
font-size: 1.2rem;
}

Stat Cards
// StatCard.js
import React from "react";
import "./StatCard.css";

const StatCard = ({ title, value, unit, icon }) => (

<div className="stat-card"> <div className="icon">{icon}</div> <div className="content"> <h3>{title}</h3> <p> {value} <span>{unit}</span> </p> </div> </div> );
export default StatCard;

/* StatCard.css */
.stat-card {
background: var(--card-bg);
padding: 1.5rem;
border-radius: var(--border-radius);
box-shadow: var(--box-shadow);
display: flex;
align-items: center;
transition: var(--transition);
}

.stat-card:hover {
transform: translateY(-5px);
box-shadow: 0 7px 15px rgba(0, 0, 0, 0.1);
}

.stat-card .icon {
font-size: 2.5rem;
margin-right: 1rem;
}

.stat-card .content h3 {
font-size: 1rem;
color: var(--text-color);
}

.stat-card .content p {
font-size: 1.5rem;
font-weight: bold;
}

Dashboard Integration
// Dashboard.js
import React from "react";
import HeroSection from "./HeroSection";
import StatCard from "./StatCard";
import "./Dashboard.css";

const Dashboard = () => {
const stats = [
{ title: "PM2.5", value: "35", unit: "µg/m³", icon: "🔬" },
{ title: "Temperature", value: "25", unit: "°C", icon: "🌡️" },
{ title: "Humidity", value: "60", unit: "%", icon: "💧" },
];

return (

<div className="dashboard"> <HeroSection aqi={85} /> <div className="stats-container"> {stats.map((stat, index) => ( <StatCard key={index} {...stat} /> ))} </div> </div> ); };
export default Dashboard;

/* Dashboard.css */
.dashboard {
padding: 2rem;
}

.stats-container {
display: grid;
grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
gap: 1.5rem;
}
