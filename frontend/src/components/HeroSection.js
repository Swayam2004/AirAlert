import React from "react";
import { Link } from "react-router-dom";
import "../styles/index.css";

function HeroSection({ title, description, imageUrl, ctaText, ctaLink }) {
	return (
		<div className="hero-section">
			<div className="hero-content">
				<h1>{title}</h1>
				<p>{description}</p>
				{ctaText && ctaLink && (
					<Link to={ctaLink} className="hero-cta">
						{ctaText}
					</Link>
				)}
			</div>
			{imageUrl && (
				<div className="hero-image">
					<img src={imageUrl} alt={title} />
				</div>
			)}
		</div>
	);
}

export default HeroSection;
