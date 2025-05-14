import React from "react";
import "../styles/index.css";

function ContactUsPage() {
	return (
		<div className="container">
			<header className="mb-5">
				<h1 className="text-primary">Contact Us</h1>
				<p className="text-secondary">We would love to hear from you! Please fill out the form below.</p>
			</header>

			<form className="contact-form">
				<label htmlFor="name">Name:</label>
				<input type="text" id="name" name="name" className="form-control" placeholder="Enter your name" />

				<label htmlFor="email" className="mt-3">
					Email:
				</label>
				<input type="email" id="email" name="email" className="form-control" placeholder="Enter your email" />

				<label htmlFor="subject" className="mt-3">
					Subject:
				</label>
				<input type="text" id="subject" name="subject" className="form-control" placeholder="Enter the subject" />

				<label htmlFor="message" className="mt-3">
					Message:
				</label>
				<textarea id="message" name="message" className="form-control" rows="5" placeholder="Enter your message"></textarea>

				<button type="submit" className="btn btn-primary mt-3">
					Send Message
				</button>
			</form>
		</div>
	);
}

export default ContactUsPage;
