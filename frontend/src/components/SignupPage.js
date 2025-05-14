import React from "react";
import "../styles/index.css";

function SignupPage() {
	return (
		<div className="container text-center">
			<header className="mb-5">
				<h1 className="text-primary">Sign Up</h1>
				<p className="text-secondary">Create an account to start using AirAlert.</p>
			</header>

			<form className="auth-form">
				<label htmlFor="name">Name:</label>
				<input type="text" id="name" name="name" className="form-control" placeholder="Enter your name" />

				<label htmlFor="email" className="mt-3">
					Email:
				</label>
				<input type="email" id="email" name="email" className="form-control" placeholder="Enter your email" />

				<label htmlFor="password" className="mt-3">
					Password:
				</label>
				<input type="password" id="password" name="password" className="form-control" placeholder="Enter your password" />

				<button type="submit" className="btn btn-primary mt-3">
					Sign Up
				</button>
			</form>
		</div>
	);
}

export default SignupPage;
