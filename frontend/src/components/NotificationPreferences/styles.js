/**
 * Styles for notification preferences components
 */
export const preferenceStyles = `
  .notification-preferences {
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 20px rgba(0, 0, 0, 0.15);
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
    padding-bottom: 20px;
  }

  .notification-preferences.loading {
    padding: 40px;
    text-align: center;
    color: #888;
  }

  .preferences-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    border-bottom: 1px solid #eee;
  }

  .preferences-header h2 {
    margin: 0;
    font-size: 1.2rem;
  }

  .close-button {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
  }

  .error-message,
  .success-message {
    margin: 10px 20px;
    padding: 10px;
    border-radius: 5px;
    text-align: center;
  }

  .error-message {
    background-color: #fff2f0;
    border: 1px solid #ffccc7;
    color: #f5222d;
  }

  .success-message {
    background-color: #f6ffed;
    border: 1px solid #b7eb8f;
    color: #52c41a;
  }

  .preferences-section {
    padding: 15px 20px;
    border-bottom: 1px solid #f0f0f0;
  }

  .preferences-section h3 {
    margin-top: 0;
    margin-bottom: 10px;
    font-size: 1.1rem;
    font-weight: 500;
  }

  .section-description {
    margin-top: 0;
    margin-bottom: 15px;
    color: #888;
    font-size: 0.9rem;
  }

  .channel-options {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
  }

  .channel-option {
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .channel-option input {
    margin-right: 8px;
  }

  .channel-icon {
    margin-right: 5px;
  }

  .toggle-switch {
    position: relative;
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: relative;
    display: inline-block;
    width: 50px;
    height: 24px;
    background-color: #ccc;
    border-radius: 34px;
    margin-right: 10px;
    transition: 0.4s;
  }

  .toggle-slider:before {
    position: absolute;
    content: "";
    height: 16px;
    width: 16px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    border-radius: 50%;
    transition: 0.4s;
  }

  input:checked + .toggle-slider {
    background-color: #1890ff;
  }

  input:checked + .toggle-slider:before {
    transform: translateX(26px);
  }

  .toggle-label {
    font-size: 0.9rem;
  }

  .sensitivity-options {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .sensitivity-option {
    display: flex;
    padding: 10px;
    border: 1px solid #f0f0f0;
    border-radius: 5px;
    cursor: pointer;
  }

  .sensitivity-option.selected {
    border-color: #1890ff;
    background-color: #e6f7ff;
  }

  .sensitivity-option input {
    margin-right: 10px;
    margin-top: 5px;
  }

  .sensitivity-content {
    flex-grow: 1;
  }

  .sensitivity-content h4 {
    margin: 0 0 5px 0;
    font-size: 0.95rem;
  }

  .sensitivity-content p {
    margin: 0;
    font-size: 0.85rem;
    color: #666;
  }

  .pollutant-subscriptions {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .pollutant-item {
    border: 1px solid #f0f0f0;
    border-radius: 5px;
    padding: 12px;
  }

  .pollutant-toggle {
    display: flex;
    align-items: center;
    cursor: pointer;
    margin-bottom: 8px;
  }

  .pollutant-toggle input {
    margin-right: 8px;
  }

  .pollutant-name small {
    color: #888;
    margin-left: 5px;
  }

  .severity-selector {
    padding-left: 25px;
    margin-top: 5px;
  }

  .severity-selector label {
    display: block;
    margin-bottom: 5px;
    font-size: 0.85rem;
    color: #666;
  }

  .severity-selector select {
    width: 100%;
    padding: 8px;
    border-radius: 4px;
    border: 1px solid #d9d9d9;
  }

  .health-conditions {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .health-condition {
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .health-condition input {
    margin-right: 8px;
  }

  .age-category {
    margin-top: 15px;
  }

  .age-category label {
    display: block;
    margin-bottom: 5px;
  }

  .age-category select {
    width: 100%;
    padding: 8px;
    border-radius: 4px;
    border: 1px solid #d9d9d9;
  }

  .preferences-actions {
    display: flex;
    justify-content: flex-end;
    padding: 15px 20px;
    gap: 10px;
    margin-top: 10px;
  }

  .cancel-button {
    padding: 8px 15px;
    background: none;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    cursor: pointer;
  }

  .save-button {
    padding: 8px 15px;
    background-color: #1890ff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .save-button:hover {
    background-color: #40a9ff;
  }

  .save-button:disabled {
    background-color: #91caff;
    cursor: not-allowed;
  }
`;
