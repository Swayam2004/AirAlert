import React from "react";
import "../styles/index.css";

function HowToOperate() {
	return (
		<div className="container">
			<header className="mb-5">
				<h1 className="text-primary">How to Operate AirAlert</h1>
				<p className="text-secondary">Follow these steps to make the most out of AirAlert.</p>
			</header>

			<section className="steps-container">
				<div className="step-card">
					<h3>Step 1: Sign Up</h3>
					<p>Create an account to access personalized features.</p>
				</div>
				<div className="step-card">
					<h3>Step 2: Explore Dashboard</h3>
					<p>View real-time air quality data and trends.</p>
				</div>
				<div className="step-card">
					<h3>Step 3: Set Alerts</h3>
					<p>Configure alerts to stay informed about air quality changes.</p>
				</div>
			</section>

			<section className="faq-container mt-5">
				<h2 className="text-primary">Frequently Asked Questions</h2>
				<div className="faq-item">
					<h4>What is AirAlert?</h4>
					<p>AirAlert is a platform to monitor air quality and receive alerts.</p>
				</div>
				<div className="faq-item">
					<h4>How do I set up alerts?</h4>
					<p>Go to the Alerts page and configure thresholds for notifications.</p>
				</div>
			</section>
		</div>
	);
}

export default HowToOperate;
