import React, { useState, useEffect } from "react";
import API from "../../services/api";

const LocationSettings = ({ user, onSuccess, onError }) => {
	const [locations, setLocations] = useState([]);
	const [newLocation, setNewLocation] = useState({
		name: "",
		address: "",
		type: "home",
		radius: 5, // km
		isDefault: false,
	});

	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [editIndex, setEditIndex] = useState(-1);

	useEffect(() => {
		const loadLocations = async () => {
			try {
				const data = await API.fetchUserLocations(user.id);
				setLocations(data || []);
			} catch (err) {
				onError(err.message || "Failed to load saved locations");
			} finally {
				setIsLoading(false);
			}
		};

		loadLocations();
	}, [user.id, onError]);

	const handleInputChange = (e) => {
		const { name, value, type, checked } = e.target;
		setNewLocation((prev) => ({
			...prev,
			[name]: type === "checkbox" ? checked : value,
		}));
	};

	const handleEditLocation = (index) => {
		setNewLocation(locations[index]);
		setEditIndex(index);
	};

	const handleDeleteLocation = async (index) => {
		const updatedLocations = [...locations];
		updatedLocations.splice(index, 1);

		setIsSubmitting(true);
		try {
			await API.updateUserLocations(user.id, updatedLocations);
			setLocations(updatedLocations);
			onSuccess("Location removed successfully");
		} catch (err) {
			onError(err.message || "Failed to remove location");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setIsSubmitting(true);

		try {
			let updatedLocations = [...locations];

			if (editIndex >= 0) {
				// Update existing location
				updatedLocations[editIndex] = newLocation;
			} else {
				// Add new location
				updatedLocations.push(newLocation);
			}

			// If new location is set as default, update other locations
			if (newLocation.isDefault) {
				updatedLocations = updatedLocations.map((loc, index) => {
					if (editIndex >= 0 ? index !== editIndex : index !== updatedLocations.length - 1) {
						return { ...loc, isDefault: false };
					}
					return loc;
				});
			}

			await API.updateUserLocations(user.id, updatedLocations);

			setLocations(updatedLocations);
			setNewLocation({
				name: "",
				address: "",
				type: "home",
				radius: 5,
				isDefault: false,
			});
			setEditIndex(-1);

			onSuccess(editIndex >= 0 ? "Location updated successfully" : "New location added successfully");
		} catch (err) {
			onError(err.message || "Failed to save location");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isLoading) {
		return (
			<div className="settings-loading">
				<div className="settings-spinner"></div>
				<div>Loading location information...</div>
			</div>
		);
	}

	return (
		<div className="settings-section">
			<div className="settings-card">
				<h3 className="settings-section-title">{editIndex >= 0 ? "Edit Location" : "Add New Location"}</h3>
				<form onSubmit={handleSubmit}>
					<div className="settings-form-group">
						<label htmlFor="name" className="settings-label">
							Location Name
						</label>
						<input type="text" id="name" name="name" className="settings-input" value={newLocation.name} onChange={handleInputChange} placeholder="e.g., Home, Office, School" required />
					</div>

					<div className="settings-form-group">
						<label htmlFor="address" className="settings-label">
							Address
						</label>
						<input type="text" id="address" name="address" className="settings-input" value={newLocation.address} onChange={handleInputChange} placeholder="Enter full address" required />
					</div>

					<div className="settings-form-group">
						<label htmlFor="type" className="settings-label">
							Type
						</label>
						<select id="type" name="type" className="settings-input" value={newLocation.type} onChange={handleInputChange}>
							<option value="home">Home</option>
							<option value="work">Work</option>
							<option value="school">School</option>
							<option value="family">Family</option>
							<option value="other">Other</option>
						</select>
					</div>

					<div className="settings-form-group">
						<label htmlFor="radius" className="settings-label">
							Alert Radius (km): {newLocation.radius}
						</label>
						<input type="range" id="radius" name="radius" min="1" max="25" value={newLocation.radius} onChange={handleInputChange} className="settings-range" />
					</div>

					<div className="toggle-container">
						<span className="toggle-label">Set as Default Location</span>
						<label className="toggle-switch">
							<input type="checkbox" name="isDefault" checked={newLocation.isDefault} onChange={handleInputChange} />
							<span className="toggle-slider"></span>
						</label>
					</div>

					<div className="settings-actions">
						{editIndex >= 0 && (
							<button
								type="button"
								className="settings-button settings-button-secondary"
								onClick={() => {
									setEditIndex(-1);
									setNewLocation({
										name: "",
										address: "",
										type: "home",
										radius: 5,
										isDefault: false,
									});
								}}
							>
								Cancel
							</button>
						)}

						<button type="submit" className="settings-button settings-button-primary" disabled={isSubmitting}>
							{isSubmitting ? (editIndex >= 0 ? "Updating..." : "Adding...") : editIndex >= 0 ? "Update Location" : "Add Location"}
						</button>
					</div>
				</form>
			</div>

			<div className="settings-card">
				<h3 className="settings-section-title">Saved Locations</h3>
				{locations.length === 0 ? (
					<p>No saved locations yet. Add your first location above.</p>
				) : (
					<div className="locations-list">
						{locations.map((location, index) => (
							<div key={index} className="location-item">
								<div className="location-info">
									<h4>
										{location.name} <span className="location-type">{location.type}</span>
									</h4>
									{location.isDefault && <span className="default-badge">Default</span>}
									<p>{location.address}</p>
									<p className="location-radius">Alert radius: {location.radius} km</p>
								</div>
								<div className="location-actions">
									<button type="button" className="settings-button settings-button-secondary" onClick={() => handleEditLocation(index)}>
										Edit
									</button>
									<button type="button" className="settings-button settings-button-danger" onClick={() => handleDeleteLocation(index)} disabled={isSubmitting}>
										Remove
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

export default LocationSettings;
