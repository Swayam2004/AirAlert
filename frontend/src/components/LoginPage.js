import React from "react";
import "../styles/index.css";

function LoginPage() {
	return (
		<div className="container text-center">
			<header className="mb-5">
				<h1 className="text-primary">Login</h1>
				<p className="text-secondary">Access your AirAlert account.</p>
			</header>

			<form className="auth-form">
				<label htmlFor="email">Email:</label>
				<input type="email" id="email" name="email" className="form-control" placeholder="Enter your email" />

				<label htmlFor="password" className="mt-3">
					Password:
				</label>
				<input type="password" id="password" name="password" className="form-control" placeholder="Enter your password" />

				<button type="submit" className="btn btn-primary mt-3">
					Login
				</button>
			</form>
		</div>
	);
}

export default LoginPage;
