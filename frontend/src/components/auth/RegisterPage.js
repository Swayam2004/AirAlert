import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const RegisterPage = () => {
	const [formData, setFormData] = useState({
		username: "",
		email: "",
		name: "",
		phone: "",
		password: "",
		confirmPassword: "",
	});
	const [errors, setErrors] = useState({});
	const [isLoading, setIsLoading] = useState(false);
	const [success, setSuccess] = useState(false);

	const { register } = useAuth();
	const navigate = useNavigate();

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData({ ...formData, [name]: value });

		// Clear error when user types
		if (errors[name]) {
			setErrors({ ...errors, [name]: "" });
		}
	};

	const validateForm = () => {
		const newErrors = {};

		// Validate username
		if (!formData.username.trim()) {
			newErrors.username = "Username is required";
		} else if (formData.username.length < 3) {
			newErrors.username = "Username must be at least 3 characters";
		}

		// Validate email
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!formData.email.trim()) {
			newErrors.email = "Email is required";
		} else if (!emailRegex.test(formData.email)) {
			newErrors.email = "Invalid email address";
		}

		// Validate password
		if (!formData.password) {
			newErrors.password = "Password is required";
		} else if (formData.password.length < 8) {
			newErrors.password = "Password must be at least 8 characters";
		} else if (!/[A-Z]/.test(formData.password)) {
			newErrors.password = "Password must contain an uppercase letter";
		} else if (!/[a-z]/.test(formData.password)) {
			newErrors.password = "Password must contain a lowercase letter";
		} else if (!/[0-9]/.test(formData.password)) {
			newErrors.password = "Password must contain a number";
		} else if (!/[^A-Za-z0-9]/.test(formData.password)) {
			newErrors.password = "Password must contain a special character";
		}

		// Validate password confirmation
		if (formData.password !== formData.confirmPassword) {
			newErrors.confirmPassword = "Passwords do not match";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		// Validate form
		if (!validateForm()) {
			return;
		}

		setIsLoading(true);

		try {
			// Prepare user data for API
			const userData = {
				username: formData.username,
				email: formData.email,
				name: formData.name,
				phone: formData.phone,
				password: formData.password,
			};

			const result = await register(userData);

			if (result.success) {
				setSuccess(true);
				// Clear form after successful registration
				setFormData({
					username: "",
					email: "",
					name: "",
					password: "",
					confirmPassword: "",
				});

				// Redirect to verification page after a short delay
				setTimeout(() => {
					navigate("/verify-email-sent", {
						state: { email: formData.email },
					});
				}, 1500);
			} else {
				// Handle API error
				setErrors({
					api: result.error || "Registration failed. Please try again.",
				});
			}
		} catch (err) {
			setErrors({
				api: "An unexpected error occurred. Please try again.",
			});
			console.error("Registration error:", err);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="auth-page">
			<div className="auth-container">
				<h1>Create an Account</h1>
				<p className="auth-subtitle">Sign up to monitor air quality and receive alerts</p>

				{errors.api && <div className="error-message">{errors.api}</div>}
				{success && <div className="success-message">Registration successful!</div>}

				<form onSubmit={handleSubmit} className="auth-form">
					<div className="form-group">
						<label htmlFor="username">Username*</label>
						<input id="username" name="username" type="text" value={formData.username} onChange={handleChange} placeholder="Choose a username" disabled={isLoading || success} required />
						{errors.username && <div className="field-error">{errors.username}</div>}
					</div>

					<div className="form-group">
						<label htmlFor="email">Email*</label>
						<input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Enter your email" disabled={isLoading || success} required />
						{errors.email && <div className="field-error">{errors.email}</div>}
					</div>

					<div className="form-group">
						<label htmlFor="name">Full Name (Optional)</label>
						<input id="name" name="name" type="text" value={formData.name} onChange={handleChange} placeholder="Enter your full name" disabled={isLoading || success} />
					</div>

					<div className="form-group">
						<label htmlFor="phone">Phone Number (Optional)</label>
						<input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="Enter your phone number" disabled={isLoading || success} />
					</div>

					<div className="form-group">
						<label htmlFor="password">Password*</label>
						<input id="password" name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Create a password" disabled={isLoading || success} required />
						{errors.password && <div className="field-error">{errors.password}</div>}
						<div className="password-requirements">Password must be at least 8 characters with uppercase, lowercase, number, and special character.</div>
					</div>

					<div className="form-group">
						<label htmlFor="confirmPassword">Confirm Password*</label>
						<input
							id="confirmPassword"
							name="confirmPassword"
							type="password"
							value={formData.confirmPassword}
							onChange={handleChange}
							placeholder="Confirm your password"
							disabled={isLoading || success}
							required
						/>
						{errors.confirmPassword && <div className="field-error">{errors.confirmPassword}</div>}
					</div>

					<div className="auth-actions">
						<button type="submit" className="btn btn-primary" disabled={isLoading || success}>
							{isLoading ? "Registering..." : "Create Account"}
						</button>
					</div>
				</form>

				<div className="auth-links">
					Already have an account? <Link to="/login">Log in</Link>
				</div>
			</div>
		</div>
	);
};

export default RegisterPage;
