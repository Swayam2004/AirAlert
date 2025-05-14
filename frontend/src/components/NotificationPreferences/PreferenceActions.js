import React from "react";

/**
 * Component for the save and cancel action buttons
 */
const PreferenceActions = ({ onSave, onCancel, saving }) => {
	return (
		<div className="preferences-actions">
			<button className="cancel-button" onClick={onCancel}>
				Cancel
			</button>
			<button className="save-button" onClick={onSave} disabled={saving}>
				{saving ? "Saving..." : "Save Preferences"}
			</button>
		</div>
	);
};

export default PreferenceActions;
