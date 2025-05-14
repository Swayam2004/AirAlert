import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthService from "../services/auth";

function Login() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();

	const handleLogin = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError("");

		try {
			await AuthService.login(email, password);
			navigate("/"); // Redirect to homepage after successful login
		} catch (err) {
			setError(err.response?.data?.detail || "Login failed. Please check your credentials.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="login-container">
			<h2>Log In</h2>
			{error && <div className="alert alert-danger">{error}</div>}
			<form onSubmit={handleLogin}>
				<div className="form-group">
					<label htmlFor="email">Email</label>
					<input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
				</div>
				<div className="form-group">
					<label htmlFor="password">Password</label>
					<input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
				</div>
				<button type="submit" className="btn btn-primary" disabled={loading}>
					{loading ? "Logging in..." : "Login"}
				</button>
			</form>
			<div className="login-footer">
				<p>
					Don't have an account?{" "}
					<button onClick={() => navigate("/signup")} className="link-button">
						Sign up
					</button>
				</p>
				<p>
					<button onClick={() => navigate("/forgot-password")} className="link-button">
						Forgot password?
					</button>
				</p>
			</div>
		</div>
	);
}

export default Login;
