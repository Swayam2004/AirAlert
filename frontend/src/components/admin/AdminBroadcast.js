import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import "./AdminBroadcast.css";

const AdminBroadcast = () => {
	const { user } = useAuth();
	const [broadcasts, setBroadcasts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(10);
	const [totalPages, setTotalPages] = useState(1);
	const [showCreateForm, setShowCreateForm] = useState(false);

	// Form state for creating a new broadcast
	const [broadcastForm, setBroadcastForm] = useState({
		title: "",
		message: "",
		priority_level: "info",
		target_audience: "all_users",
		regions: [],
		expiration_hours: 24,
		delivery_channels: ["app"],
	});

	// Form validation state
	const [formErrors, setFormErrors] = useState({});
	const [submitSuccess, setSubmitSuccess] = useState(false);

	// Load broadcasts on component mount and when page/limit changes
	useEffect(() => {
		loadBroadcasts();
	}, [page, limit]);

	// Load broadcast messages
	const loadBroadcasts = async () => {
		try {
			setLoading(true);
			setError(null);

			const response = await axios.get("/api/admin/broadcasts", {
				params: { page, limit },
			});

			setBroadcasts(response.data.items);
			setTotalPages(response.data.pages);
		} catch (err) {
			console.error("Error fetching broadcasts:", err);
			setError("Failed to load broadcast messages. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	// Handle form input changes
	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setBroadcastForm({
			...broadcastForm,
			[name]: value,
		});

		// Clear validation error when field is modified
		if (formErrors[name]) {
			setFormErrors({
				...formErrors,
				[name]: null,
			});
		}
	};

	// Handle checkbox changes for delivery channels
	const handleChannelChange = (channel) => {
		// If "all" is selected, select all channels
		if (channel === "all") {
			if (broadcastForm.delivery_channels.includes("all")) {
				// Remove all channels
				setBroadcastForm({
					...broadcastForm,
					delivery_channels: [],
				});
			} else {
				// Select all channels
				setBroadcastForm({
					...broadcastForm,
					delivery_channels: ["app", "email", "sms", "all"],
				});
			}
			return;
		}

		// Handle other channel selections
		if (broadcastForm.delivery_channels.includes(channel)) {
			// Remove channel
			setBroadcastForm({
				...broadcastForm,
				delivery_channels: broadcastForm.delivery_channels.filter((ch) => ch !== channel),
			});

			// Also remove "all" if it was selected
			if (broadcastForm.delivery_channels.includes("all")) {
				setBroadcastForm((prev) => ({
					...prev,
					delivery_channels: prev.delivery_channels.filter((ch) => ch !== "all"),
				}));
			}
		} else {
			// Add channel
			setBroadcastForm({
				...broadcastForm,
				delivery_channels: [...broadcastForm.delivery_channels, channel],
			});

			// Check if all individual channels are selected
			const allIndividualChannels = ["app", "email", "sms"];
			if (allIndividualChannels.every((ch) => ch === channel || broadcastForm.delivery_channels.includes(ch)) && !broadcastForm.delivery_channels.includes("all")) {
				setBroadcastForm((prev) => ({
					...prev,
					delivery_channels: [...prev.delivery_channels, "all"],
				}));
			}
		}
	};

	// Handle region input
	const handleRegionChange = (e) => {
		const regions = e.target.value
			.split(",")
			.map((region) => region.trim())
			.filter((region) => region.length > 0);

		setBroadcastForm({
			...broadcastForm,
			regions,
		});
	};

	// Validate form before submission
	const validateForm = () => {
		const errors = {};

		if (!broadcastForm.title.trim()) {
			errors.title = "Title is required";
		} else if (broadcastForm.title.length > 100) {
			errors.title = "Title must be 100 characters or less";
		}

		if (!broadcastForm.message.trim()) {
			errors.message = "Message content is required";
		} else if (broadcastForm.message.length > 2000) {
			errors.message = "Message must be 2000 characters or less";
		}

		if (broadcastForm.target_audience === "specific_regions" && broadcastForm.regions.length === 0) {
			errors.regions = "At least one region must be specified";
		}

		if (broadcastForm.delivery_channels.length === 0) {
			errors.delivery_channels = "At least one delivery channel must be selected";
		}

		return errors;
	};

	// Handle form submission
	const handleSubmit = async (e) => {
		e.preventDefault();

		// Validate form
		const errors = validateForm();
		if (Object.keys(errors).length > 0) {
			setFormErrors(errors);
			return;
		}

		try {
			setLoading(true);

			// Map priority level to severity level for the backend
			const priorityMapping = {
				critical: 2, // High severity
				important: 1, // Medium severity
				info: 0, // Low severity
			};

			// Prepare broadcast data with proper format for backend
			const broadcastData = {
				...broadcastForm,
				severity_level: priorityMapping[broadcastForm.priority_level] || 0,
			};

			// Send broadcast data to API
			const response = await axios.post("/api/admin/broadcast", broadcastData);

			// Show success message
			setSubmitSuccess(true);

			// Add a success notification using window.dispatchEvent
			window.dispatchEvent(
				new CustomEvent("notification", {
					detail: {
						type: "success",
						title: "Broadcast Sent",
						message: `Your broadcast "${broadcastForm.title}" has been successfully sent to ${broadcastForm.target_audience === "all_users" ? "all users" : "selected users"}`,
						duration: 5000,
					},
				})
			);

			// Reset form
			setBroadcastForm({
				title: "",
				message: "",
				priority_level: "info",
				target_audience: "all_users",
				regions: [],
				expiration_hours: 24,
				delivery_channels: ["app"],
			});

			// Reload broadcasts to show the new broadcast
			loadBroadcasts();

			// Hide success message and form after 3 seconds
			setTimeout(() => {
				setSubmitSuccess(false);
				setShowCreateForm(false);
			}, 3000);
		} catch (err) {
			console.error("Error submitting broadcast:", err);
			setError("Failed to send broadcast. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	// Handle pagination
	const handlePageChange = (newPage) => {
		setPage(newPage);
	};

	// Format date in a user-friendly way
	const formatDate = (dateString) => {
		if (!dateString) return "—";
		const date = new Date(dateString);
		return date.toLocaleString();
	};

	// Get priority level badge class
	const getPriorityBadgeClass = (level) => {
		switch (level) {
			case "critical":
				return "priority-critical";
			case "warning":
				return "priority-warning";
			default:
				return "priority-info";
		}
	};

	return (
		<div className="admin-broadcast">
			<h2 className="section-title">Alert Broadcasting System</h2>

			<div className="broadcast-actions">
				<button className="btn btn-primary create-broadcast-btn" onClick={() => setShowCreateForm(!showCreateForm)}>
					{showCreateForm ? "Cancel" : "Create New Broadcast"}
				</button>
			</div>

			{/* Create Broadcast Form */}
			{showCreateForm && (
				<div className="broadcast-form-container">
					<h3>Create New Broadcast Alert</h3>

					{submitSuccess && <div className="success-message">Broadcast has been sent successfully!</div>}

					{error && <div className="error-message">{error}</div>}

					<form onSubmit={handleSubmit} className="broadcast-form">
						<div className="form-group">
							<label htmlFor="title">Title</label>
							<input type="text" id="title" name="title" value={broadcastForm.title} onChange={handleInputChange} placeholder="Alert Title" className={formErrors.title ? "input-error" : ""} />
							{formErrors.title && <div className="error-text">{formErrors.title}</div>}
						</div>

						<div className="form-group">
							<label htmlFor="message">Message</label>
							<textarea
								id="message"
								name="message"
								value={broadcastForm.message}
								onChange={handleInputChange}
								placeholder="Alert message content"
								rows="5"
								className={formErrors.message ? "input-error" : ""}
							></textarea>
							{formErrors.message && <div className="error-text">{formErrors.message}</div>}
							<div className="char-count">{broadcastForm.message.length}/2000 characters</div>
						</div>

						<div className="form-row">
							<div className="form-group">
								<label htmlFor="priority_level">Priority Level</label>
								<select id="priority_level" name="priority_level" value={broadcastForm.priority_level} onChange={handleInputChange}>
									<option value="info">Information</option>
									<option value="warning">Warning</option>
									<option value="critical">Critical</option>
								</select>
							</div>

							<div className="form-group">
								<label htmlFor="expiration_hours">Expires After</label>
								<select id="expiration_hours" name="expiration_hours" value={broadcastForm.expiration_hours} onChange={handleInputChange}>
									<option value="1">1 hour</option>
									<option value="4">4 hours</option>
									<option value="8">8 hours</option>
									<option value="24">24 hours</option>
									<option value="48">48 hours</option>
									<option value="72">3 days</option>
									<option value="168">7 days</option>
								</select>
							</div>
						</div>

						<div className="form-group">
							<label htmlFor="target_audience">Target Audience</label>
							<select id="target_audience" name="target_audience" value={broadcastForm.target_audience} onChange={handleInputChange}>
								<option value="all_users">All Users</option>
								<option value="admin_only">Admins Only</option>
								<option value="specific_regions">Specific Regions</option>
							</select>
						</div>

						{broadcastForm.target_audience === "specific_regions" && (
							<div className="form-group">
								<label htmlFor="regions">Regions (comma separated)</label>
								<input
									type="text"
									id="regions"
									name="regions"
									value={broadcastForm.regions.join(", ")}
									onChange={handleRegionChange}
									placeholder="e.g. New York, Los Angeles, Chicago"
									className={formErrors.regions ? "input-error" : ""}
								/>
								{formErrors.regions && <div className="error-text">{formErrors.regions}</div>}
							</div>
						)}

						<div className="form-group">
							<label>Delivery Channels</label>
							<div className="channels-container">
								<label className="channel-option">
									<input type="checkbox" checked={broadcastForm.delivery_channels.includes("app")} onChange={() => handleChannelChange("app")} />
									In-App Notification
								</label>

								<label className="channel-option">
									<input type="checkbox" checked={broadcastForm.delivery_channels.includes("email")} onChange={() => handleChannelChange("email")} />
									Email
								</label>

								<label className="channel-option">
									<input type="checkbox" checked={broadcastForm.delivery_channels.includes("sms")} onChange={() => handleChannelChange("sms")} />
									SMS
								</label>

								<label className="channel-option">
									<input type="checkbox" checked={broadcastForm.delivery_channels.includes("all")} onChange={() => handleChannelChange("all")} />
									All Channels
								</label>
							</div>
							{formErrors.delivery_channels && <div className="error-text">{formErrors.delivery_channels}</div>}
						</div>

						<div className="preview-container">
							<h4>Preview</h4>
							<div className={`alert-preview ${getPriorityBadgeClass(broadcastForm.priority_level)}`}>
								<div className="preview-header">
									<span className="preview-title">{broadcastForm.title || "Alert Title"}</span>
									<span className="preview-badge">{broadcastForm.priority_level}</span>
								</div>
								<div className="preview-body">{broadcastForm.message || "Alert message will appear here"}</div>
								<div className="preview-footer">
									<span className="preview-channels">Channels: {broadcastForm.delivery_channels.includes("all") ? "All" : broadcastForm.delivery_channels.join(", ")}</span>
									<span className="preview-expiry">
										Expires after: {broadcastForm.expiration_hours} {broadcastForm.expiration_hours === 1 ? "hour" : "hours"}
									</span>
								</div>
							</div>
						</div>

						<div className="form-actions">
							<button type="button" className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>
								Cancel
							</button>
							<button type="submit" className="btn btn-primary" disabled={loading}>
								{loading ? "Sending..." : "Send Broadcast"}
							</button>
						</div>
					</form>
				</div>
			)}

			{/* Broadcasts History */}
			<div className="broadcasts-history">
				<h3>Broadcast History</h3>

				{loading && !showCreateForm ? (
					<div className="loading-indicator">Loading broadcast history...</div>
				) : error && !submitSuccess ? (
					<div className="error-message">{error}</div>
				) : broadcasts.length === 0 ? (
					<div className="no-broadcasts">No broadcast messages found</div>
				) : (
					<>
						<div className="broadcasts-table-container">
							<table className="broadcasts-table">
								<thead>
									<tr>
										<th>ID</th>
										<th>Title</th>
										<th>Priority</th>
										<th>Target</th>
										<th>Sent</th>
										<th>Expires</th>
										<th>Recipients</th>
									</tr>
								</thead>
								<tbody>
									{broadcasts.map((broadcast) => (
										<tr key={broadcast.id}>
											<td>{broadcast.id}</td>
											<td>
												<div className="broadcast-title-cell">
													<span className="broadcast-title">{broadcast.title}</span>
													<span className="broadcast-message">{broadcast.message}</span>
												</div>
											</td>
											<td>
												<span className={`priority-badge ${getPriorityBadgeClass(broadcast.priority_level)}`}>{broadcast.priority_level}</span>
											</td>
											<td>{broadcast.target_audience}</td>
											<td>{formatDate(broadcast.created_at)}</td>
											<td>{formatDate(broadcast.expires_at)}</td>
											<td>{broadcast.notification_count}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{/* Pagination */}
						{totalPages > 1 && (
							<div className="pagination">
								<button onClick={() => handlePageChange(1)} disabled={page === 1} className="pagination-button">
									&laquo;
								</button>

								<button onClick={() => handlePageChange(page - 1)} disabled={page === 1} className="pagination-button">
									&lsaquo;
								</button>

								<span className="pagination-info">
									Page {page} of {totalPages}
								</span>

								<button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages} className="pagination-button">
									&rsaquo;
								</button>

								<button onClick={() => handlePageChange(totalPages)} disabled={page >= totalPages} className="pagination-button">
									&raquo;
								</button>

								<select
									value={limit}
									onChange={(e) => {
										setLimit(Number(e.target.value));
										setPage(1);
									}}
									className="limit-select"
								>
									<option value="5">5 per page</option>
									<option value="10">10 per page</option>
									<option value="25">25 per page</option>
									<option value="50">50 per page</option>
								</select>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
};

export default AdminBroadcast;
