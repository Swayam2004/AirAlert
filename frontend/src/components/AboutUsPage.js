import React from "react";
import "../styles/index.css";

function AboutUsPage() {
	return (
		<div className="container">
			<header className="mb-5">
				<h1 className="text-primary">About Us</h1>
				<p className="text-secondary">Learn more about the team behind AirAlert and our mission.</p>
			</header>

			<section className="team-info">
				<h2 className="text-primary">Our Team</h2>
				<p>We are a group of passionate individuals dedicated to improving air quality awareness and public health.</p>
			</section>

			<section className="mission-info mt-5">
				<h2 className="text-primary">Our Mission</h2>
				<p>Our mission is to provide accurate and timely air quality information to help people make informed decisions for their health and well-being.</p>
			</section>
		</div>
	);
}

export default AboutUsPage;
