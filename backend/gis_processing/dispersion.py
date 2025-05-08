"""
Pollution dispersion modeling module for AirAlert.
Predicts how pollutants spread over time based on meteorological conditions.
"""
import os
import logging
import numpy as np
from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime, timedelta
import geopandas as gpd
import rasterio
from rasterio.transform import from_origin
import matplotlib.pyplot as plt
from scipy import ndimage

class DispersionModel:
    """Predicts pollutant dispersion based on wind and other factors."""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize with configuration.
        
        Args:
            config: Configuration parameters including:
                - cell_size: Cell size in degrees (default: 0.01)
                - output_dir: Directory to save outputs (default: 'output')
                - time_steps: Number of time steps to predict (default: 6)
                - hours_per_step: Hours per time step (default: 1)
        """
        self.config = config
        self.cell_size = config.get('cell_size', 0.01)
        self.output_dir = config.get('output_dir', 'output')
        self.time_steps = config.get('time_steps', 6)
        self.hours_per_step = config.get('hours_per_step', 1)
        self.logger = logging.getLogger("DispersionModel")
        
        # Create output directory if it doesn't exist
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
    
    def predict_dispersion(self, initial_concentration: np.ndarray, 
                          wind_directions: List[float], wind_speeds: List[float],
                          transform: rasterio.transform.Affine,
                          bounds: Tuple[float, float, float, float]) -> List[np.ndarray]:
        """
        Predict pollution dispersion over time using a Gaussian diffusion model.
        
        Args:
            initial_concentration: Initial pollutant concentration grid
            wind_directions: List of wind directions in degrees (0=N, 90=E, 180=S, 270=W)
            wind_speeds: List of wind speeds in m/s
            transform: Spatial transform of the concentration grid
            bounds: Spatial bounds (minx, miny, maxx, maxy)
            
        Returns:
            List of concentration grids for each time step
        """
        try:
            # Ensure wind data is available for all time steps
            if len(wind_directions) < self.time_steps or len(wind_speeds) < self.time_steps:
                raise ValueError("Wind data must be provided for all time steps")
                
            # Initialize list of concentration grids for each time step
            concentration_grids = [initial_concentration]
            
            # Initialize current concentration
            current = initial_concentration.copy()
            
            # Apply dispersion for each time step
            for i in range(self.time_steps):
                # Get wind parameters for this step
                direction = wind_directions[i]
                speed = wind_speeds[i]
                
                # Calculate advection components (in grid cells per time step)
                # Convert wind direction to radians (meteorological to mathematical)
                direction_rad = np.radians((270 - direction) % 360)
                
                # Calculate cell movement based on wind speed and direction
                # Scale by hours per time step
                dx = speed * np.cos(direction_rad) * self.hours_per_step / 3.6  # Convert to grid cells
                dy = speed * np.sin(direction_rad) * self.hours_per_step / 3.6
                
                # Apply advection using scipy's shift function
                shifted = ndimage.shift(current, [dy, dx], order=1, mode='constant', cval=0)
                
                # Apply diffusion using gaussian filter
                # Diffusion coefficient depends on atmospheric stability
                # We're using a simplified approach with fixed sigma
                sigma = 1 + 0.2 * speed  # More diffusion with higher wind speeds
                diffused = ndimage.gaussian_filter(shifted, sigma)
                
                # Apply decay (chemical reactions, deposition)
                # Simplified decay rate
                decay_rate = 0.95  # 5% reduction per time step
                decayed = diffused * decay_rate
                
                # Update current concentration and add to results
                current = decayed
                concentration_grids.append(current)
            
            return concentration_grids
            
        except Exception as e:
            self.logger.error(f"Error predicting dispersion: {str(e)}")
            raise
    
    def predict_and_save(self, initial_concentration: np.ndarray, 
                        wind_directions: List[float], wind_speeds: List[float],
                        transform: rasterio.transform.Affine,
                        bounds: Tuple[float, float, float, float],
                        pollutant: str, 
                        output_prefix: Optional[str] = None) -> List[str]:
        """
        Predict dispersion and save results to files.
        
        Args:
            initial_concentration: Initial pollutant concentration grid
            wind_directions: List of wind directions in degrees
            wind_speeds: List of wind speeds in m/s
            transform: Spatial transform of the concentration grid
            bounds: Spatial bounds (minx, miny, maxx, maxy)
            pollutant: Name of the pollutant
            output_prefix: Prefix for output files
            
        Returns:
            List of paths to saved files
        """
        try:
            # Generate default output prefix if not provided
            if output_prefix is None:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_prefix = os.path.join(self.output_dir, f"{pollutant}_dispersion_{timestamp}")
            
            # Create parent directories if they don't exist
            os.makedirs(os.path.dirname(os.path.abspath(output_prefix)), exist_ok=True)
            
            # Run dispersion model
            concentration_grids = self.predict_dispersion(
                initial_concentration, 
                wind_directions, 
                wind_speeds,
                transform,
                bounds
            )
            
            # Save each time step
            output_paths = []
            for i, grid in enumerate(concentration_grids):
                # Time step (initial = 0)
                hours = i * self.hours_per_step
                
                # Generate output path
                if i == 0:
                    path = f"{output_prefix}_initial.png"
                else:
                    path = f"{output_prefix}_plus{hours}h.png"
                
                # Save as visualization
                self._visualize_concentration(
                    grid, 
                    transform, 
                    bounds, 
                    pollutant, 
                    path,
                    title=f"{pollutant.upper()} Concentration (Now + {hours}h)"
                )
                
                output_paths.append(path)
            
            self.logger.info(f"Saved {len(output_paths)} dispersion maps")
            return output_paths
            
        except Exception as e:
            self.logger.error(f"Error predicting and saving dispersion: {str(e)}")
            raise
    
    def _visualize_concentration(self, concentration: np.ndarray, 
                              transform: rasterio.transform.Affine,
                              bounds: Tuple[float, float, float, float],
                              pollutant: str, output_path: str, 
                              title: Optional[str] = None) -> None:
        """
        Generate a visualization of a concentration grid.
        
        Args:
            concentration: Grid of pollutant concentrations
            transform: Affine transform for georeferencing
            bounds: Spatial bounds (minx, miny, maxx, maxy)
            pollutant: Name of the pollutant
            output_path: Path to save the visualization
            title: Title for the plot (optional)
        """
        # Set up the plot
        plt.figure(figsize=(12, 8))
        
        # Plot the concentration surface
        extent = [bounds[0], bounds[2], bounds[1], bounds[3]]
        img = plt.imshow(concentration, extent=extent, origin='upper', 
                        cmap='jet', alpha=0.8, vmin=0)
        
        # Add colorbar
        cbar = plt.colorbar(img)
        cbar.set_label(self._get_pollutant_label(pollutant))
        
        # Set title and labels
        if title:
            plt.title(title)
        else:
            plt.title(f"{pollutant.upper()} Concentration")
            
        plt.xlabel("Longitude")
        plt.ylabel("Latitude")
        plt.grid(True, alpha=0.3)
        
        # Save the figure
        plt.tight_layout()
        plt.savefig(output_path, dpi=300, bbox_inches='tight')
        plt.close()
    
    def _get_pollutant_label(self, pollutant: str) -> str:
        """Get appropriate label with units for a pollutant."""
        labels = {
            'pm25': 'PM2.5 (μg/m³)',
            'pm10': 'PM10 (μg/m³)',
            'o3': 'Ozone (ppb)',
            'no2': 'NO₂ (ppb)',
            'so2': 'SO₂ (ppb)',
            'co': 'CO (ppm)',
            'aqi': 'Air Quality Index'
        }
        return labels.get(pollutant, pollutant)

    def generate_wind_forecast(self, base_direction: float, base_speed: float, 
                              hours: int = 48) -> Tuple[List[float], List[float]]:
        """
        Generate a synthetic wind forecast for testing.
        
        Args:
            base_direction: Base wind direction in degrees
            base_speed: Base wind speed in m/s
            hours: Number of hours to forecast
            
        Returns:
            Tuple of (directions, speeds) lists
        """
        # Generate time steps based on hours_per_step
        n_steps = int(hours / self.hours_per_step)
        
        # Generate directions with some variation but maintaining overall trend
        directions = []
        speeds = []
        
        current_dir = base_direction
        current_speed = base_speed
        
        for _ in range(n_steps):
            # Add some random variation to direction
            dir_change = np.random.normal(0, 15)  # Standard deviation of 15 degrees
            current_dir = (current_dir + dir_change) % 360
            directions.append(current_dir)
            
            # Add some random variation to speed
            speed_change = np.random.normal(0, 0.5)  # Standard deviation of 0.5 m/s
            current_speed = max(0.5, current_speed + speed_change)  # Ensure speed is at least 0.5 m/s
            speeds.append(current_speed)
        
        return directions, speeds

    def integrate_meteorological_data(self, weather_data):
        """Integrate meteorological data into the dispersion model."""
        # Example: Adjust dispersion based on wind speed and direction
        for data_point in weather_data:
            wind_speed = data_point.get('wind_speed', 0)
            wind_direction = data_point.get('wind_direction', 0)
            # Adjust dispersion logic here

    def forecast_dispersion(self, initial_concentration: np.ndarray, 
                            wind_directions: List[float], wind_speeds: List[float],
                            transform: rasterio.transform.Affine,
                            bounds: Tuple[float, float, float, float],
                            pollutant: str, hours: int = 48) -> List[str]:
        """
        Forecast pollutant dispersion for the next specified hours.

        Args:
            initial_concentration: Initial pollutant concentration grid
            wind_directions: List of wind directions in degrees
            wind_speeds: List of wind speeds in m/s
            transform: Spatial transform of the concentration grid
            bounds: Spatial bounds (minx, miny, maxx, maxy)
            pollutant: Name of the pollutant
            hours: Number of hours to forecast

        Returns:
            List of paths to saved forecast visualizations
        """
        try:
            # Calculate the number of time steps based on hours and model resolution
            time_steps = hours // self.hours_per_step

            # Run dispersion model for each time step
            concentration_grids = self.predict_dispersion(
                initial_concentration, 
                wind_directions, 
                wind_speeds,
                transform,
                bounds
            )

            # Save each time step visualization
            output_paths = []
            for i, grid in enumerate(concentration_grids[:time_steps]):
                hours_ahead = i * self.hours_per_step
                output_path = f"{self.output_dir}/{pollutant}_forecast_{hours_ahead}h.png"
                self._visualize_concentration(
                    grid, 
                    transform, 
                    bounds, 
                    pollutant, 
                    output_path,
                    title=f"{pollutant.upper()} Forecast (Now + {hours_ahead}h)"
                )
                output_paths.append(output_path)

            return output_paths

        except Exception as e:
            self.logger.error(f"Error forecasting dispersion: {str(e)}")
            raise

class GaussianPlumeModel:
    """Gaussian Plume Model for pollution dispersion."""

    def __init__(self, wind_speed, wind_direction, emission_rate, stack_height):
        self.wind_speed = wind_speed
        self.wind_direction = wind_direction
        self.emission_rate = emission_rate
        self.stack_height = stack_height

    def predict_concentration(self, x, y):
        """Predict pollutant concentration at a given point (x, y)."""
        import math

        # Constants for Gaussian Plume Model
        sigma_y = 0.1 * x  # Horizontal dispersion coefficient
        sigma_z = 0.1 * x  # Vertical dispersion coefficient

        # Gaussian Plume formula
        exponent = -0.5 * ((y / sigma_y) ** 2)
        concentration = (
            (self.emission_rate / (2 * math.pi * self.wind_speed * sigma_y * sigma_z))
            * math.exp(exponent)
        )
        return concentration
