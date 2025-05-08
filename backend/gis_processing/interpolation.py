"""
Spatial interpolation module for AirAlert.
Provides methods to estimate pollution levels across a region based on point measurements.
"""
import numpy as np
import pandas as pd
import geopandas as gpd
from typing import Dict, Any, List, Tuple, Optional, Union
import os
import logging
import matplotlib.pyplot as plt
from datetime import datetime
from scipy.interpolate import Rbf, griddata
import rasterio
from rasterio.transform import from_origin

class SpatialInterpolator:
    """Estimates pollutant concentrations across a continuous surface using point measurements."""
    
    # Available interpolation methods
    AVAILABLE_METHODS = ['idw', 'rbf', 'linear', 'cubic', 'nearest', 'kriging']
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize with configuration.
        
        Args:
            config: Configuration parameters including:
                - output_dir: Directory to save outputs (default: 'output')
                - default_method: Default interpolation method (default: 'idw')
                - resolution: Output grid resolution in degrees (default: 0.01)
                - idw_power: Power parameter for IDW (default: 2)
                - rbf_function: RBF function type (default: 'multiquadric')
        """
        self.config = config
        self.output_dir = config.get('output_dir', 'output')
        self.default_method = config.get('default_method', 'idw')
        self.resolution = config.get('resolution', 0.01)
        self.idw_power = config.get('idw_power', 2)
        self.rbf_function = config.get('rbf_function', 'multiquadric')
        
        self.logger = logging.getLogger("SpatialInterpolator")
        
        # Create output directory if it doesn't exist
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
        
        # Validate method
        if self.default_method not in self.AVAILABLE_METHODS:
            self.logger.warning(
                f"Invalid interpolation method: {self.default_method}. "
                f"Using 'idw' instead. Valid methods are: {', '.join(self.AVAILABLE_METHODS)}"
            )
            self.default_method = 'idw'
            
    def interpolate_pollutant(self, points_gdf: gpd.GeoDataFrame, pollutant: str,
                            bounds: Optional[Tuple[float, float, float, float]] = None,
                            method: Optional[str] = None) -> Tuple[np.ndarray, rasterio.transform.Affine, Tuple[float, float, float, float]]:
        """
        Interpolate pollutant concentration from point measurements.
        
        Args:
            points_gdf: GeoDataFrame with point geometries and pollutant values
            pollutant: Name of the pollutant column
            bounds: Optional bounds (minx, miny, maxx, maxy) for output raster
            method: Interpolation method to use
            
        Returns:
            Tuple of (interpolated_grid, transform, bounds)
        """
        try:
            # Verify pollutant column exists
            if pollutant not in points_gdf.columns:
                self.logger.error(f"Pollutant column '{pollutant}' not found in GeoDataFrame")
                raise ValueError(f"Pollutant column '{pollutant}' not found in data")
            
            # Run the interpolation
            grid, transform, metadata = self.interpolate(points_gdf, pollutant, bounds, method)
            
            # Extract bounds
            bounds = metadata['bounds']
            
            # Save the interpolation results
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_prefix = os.path.join(self.output_dir, f"{pollutant}_interpolation_{timestamp}")
            
            self.save_interpolation(grid, transform, metadata, pollutant, output_prefix)
            
            return grid, transform, bounds
            
        except Exception as e:
            self.logger.error(f"Error interpolating {pollutant}: {str(e)}")
            raise
    
    def interpolate(self, points_gdf: gpd.GeoDataFrame, value_column: str,
                   bounds: Optional[Tuple[float, float, float, float]] = None,
                   method: Optional[str] = None) -> Tuple[np.ndarray, rasterio.transform.Affine, Dict[str, Any]]:
        """
        Interpolate a continuous surface from point measurements.
        
        Args:
            points_gdf: GeoDataFrame with point geometries
            value_column: Column name containing values to interpolate
            bounds: Optional bounds (minx, miny, maxx, maxy) for output raster
            method: Interpolation method to use
            
        Returns:
            Tuple of (interpolated_grid, transform, metadata)
        """
        try:
            # Use default method if not specified
            if method is None:
                method = self.default_method
                
            # Validate method
            if method not in self.AVAILABLE_METHODS:
                self.logger.warning(
                    f"Invalid interpolation method: {method}. "
                    f"Using '{self.default_method}' instead. Valid methods are: {', '.join(self.AVAILABLE_METHODS)}"
                )
                method = self.default_method
            
            # Check if the GeoDataFrame is valid
            if points_gdf.empty:
                self.logger.error("Empty GeoDataFrame provided")
                raise ValueError("Cannot interpolate from empty data")
                
            if value_column not in points_gdf.columns:
                self.logger.error(f"Column '{value_column}' not found in GeoDataFrame")
                raise ValueError(f"Column '{value_column}' not found in data")
            
            # Extract coordinates and values
            x = points_gdf.geometry.x.values
            y = points_gdf.geometry.y.values
            z = points_gdf[value_column].values
            
            # Filter out NaN values
            valid_indices = ~np.isnan(z)
            x = x[valid_indices]
            y = y[valid_indices]
            z = z[valid_indices]
            
            if len(z) == 0:
                self.logger.error("No valid values to interpolate")
                raise ValueError("No valid values to interpolate")
            
            # Determine bounds for output raster
            if bounds is None:
                minx, miny, maxx, maxy = (
                    x.min() - self.resolution * 10,
                    y.min() - self.resolution * 10,
                    x.max() + self.resolution * 10,
                    y.max() + self.resolution * 10
                )
            else:
                minx, miny, maxx, maxy = bounds
            
            # Create grid
            xi = np.arange(minx, maxx, self.resolution)
            yi = np.arange(miny, maxy, self.resolution)
            xi, yi = np.meshgrid(xi, yi)
            
            # Interpolate based on method
            if method == 'idw':
                zi = self._idw_interpolation(x, y, z, xi, yi)
            elif method == 'rbf':
                zi = self._rbf_interpolation(x, y, z, xi, yi)
            elif method == 'kriging':
                zi = self._kriging_interpolation(x, y, z, xi, yi)
            else:
                # Use scipy's griddata for other methods
                points = np.column_stack((x, y))
                zi = griddata(points, z, (xi, yi), method=method)
            
            # Create transform for georeferencing
            transform = from_origin(minx, maxy, self.resolution, self.resolution)
            
            # Create metadata
            metadata = {
                'method': method,
                'resolution': self.resolution,
                'bounds': (minx, miny, maxx, maxy),
                'shape': zi.shape,
                'num_points': len(z),
                'min_value': float(z.min()),
                'max_value': float(z.max()),
                'mean_value': float(z.mean()),
                'interpolated_min': float(np.nanmin(zi)),
                'interpolated_max': float(np.nanmax(zi)),
                'interpolated_mean': float(np.nanmean(zi)),
                'timestamp': datetime.now().isoformat()
            }
            
            return zi, transform, metadata
        
        except Exception as e:
            self.logger.error(f"Error during interpolation: {str(e)}")
            raise
    
    def _idw_interpolation(self, x: np.ndarray, y: np.ndarray, z: np.ndarray, 
                         xi: np.ndarray, yi: np.ndarray) -> np.ndarray:
        """
        Perform Inverse Distance Weighted interpolation.
        
        Args:
            x, y: Coordinates of sample points
            z: Values at sample points
            xi, yi: Grid of points to interpolate to
            
        Returns:
            Interpolated values at (xi, yi)
        """
        # Initialize output array
        zi = np.zeros_like(xi, dtype=np.float64)
        
        # For each point in the grid
        for i in range(xi.shape[0]):
            for j in range(xi.shape[1]):
                # Calculate distance to all sample points
                distances = np.sqrt((xi[i, j] - x)**2 + (yi[i, j] - y)**2)
                
                # Handle the case where a grid point exactly matches a sample point
                if np.min(distances) < 1e-8:
                    zi[i, j] = z[distances < 1e-8][0]
                else:
                    # Apply IDW formula
                    weights = 1.0 / (distances ** self.idw_power)
                    zi[i, j] = np.sum(weights * z) / np.sum(weights)
        
        return zi
    
    def _rbf_interpolation(self, x: np.ndarray, y: np.ndarray, z: np.ndarray, 
                         xi: np.ndarray, yi: np.ndarray) -> np.ndarray:
        """
        Perform Radial Basis Function interpolation.
        
        Args:
            x, y: Coordinates of sample points
            z: Values at sample points
            xi, yi: Grid of points to interpolate to
            
        Returns:
            Interpolated values at (xi, yi)
        """
        # Create RBF interpolator
        rbf = Rbf(x, y, z, function=self.rbf_function)
        
        # Apply interpolation
        zi = rbf(xi, yi)
        
        return zi
    
    def _kriging_interpolation(self, x: np.ndarray, y: np.ndarray, z: np.ndarray, 
                             xi: np.ndarray, yi: np.ndarray) -> np.ndarray:
        """
        Perform Kriging interpolation (using PyKrige if available).
        
        Args:
            x, y: Coordinates of sample points
            z: Values at sample points
            xi, yi: Grid of points to interpolate to
            
        Returns:
            Interpolated values at (xi, yi)
        """
        try:
            from pykrige.ok import OrdinaryKriging
            
            # Create ordinary kriging object
            OK = OrdinaryKriging(
                x, y, z,
                variogram_model='linear',
                verbose=False,
                enable_plotting=False,
            )
            
            # Make kriging prediction
            zi, _ = OK.execute('grid', xi[0, :], yi[:, 0])
            
            return zi
            
        except ImportError:
            self.logger.warning("PyKrige not installed. Falling back to RBF interpolation.")
            return self._rbf_interpolation(x, y, z, xi, yi)
        
        except Exception as e:
            self.logger.warning(f"Kriging failed: {str(e)}. Falling back to RBF interpolation.")
            return self._rbf_interpolation(x, y, z, xi, yi)
    
    def save_interpolation(self, interpolated_grid: np.ndarray, transform: rasterio.transform.Affine,
                         metadata: Dict[str, Any], pollutant: str,
                         output_prefix: Optional[str] = None) -> Dict[str, str]:
        """
        Save interpolation results to files.
        
        Args:
            interpolated_grid: 2D array of interpolated values
            transform: Affine transform for georeferencing
            metadata: Interpolation metadata
            pollutant: Name of the pollutant
            output_prefix: Prefix for output files
            
        Returns:
            Dictionary with paths to output files
        """
        try:
            # Generate default output prefix if not provided
            if output_prefix is None:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_prefix = os.path.join(self.output_dir, f"{pollutant}_interpolation_{timestamp}")
            
            # Create parent directories if they don't exist
            os.makedirs(os.path.dirname(os.path.abspath(output_prefix)), exist_ok=True)
            
            # Save interpolation as raster file
            raster_path = f"{output_prefix}.tif"
            
            # Get CRS from metadata if available
            crs = metadata.get('crs', 'EPSG:4326')
            
            # Save as GeoTIFF
            with rasterio.open(
                raster_path,
                'w',
                driver='GTiff',
                height=interpolated_grid.shape[0],
                width=interpolated_grid.shape[1],
                count=1,
                dtype=interpolated_grid.dtype,
                crs=crs,
                transform=transform,
            ) as dst:
                dst.write(interpolated_grid, 1)
            
            # Save visualization
            vis_path = f"{output_prefix}.png"
            self._visualize_interpolation(
                interpolated_grid, 
                transform,
                metadata['bounds'],
                pollutant,
                vis_path
            )
            
            # Save metadata as JSON
            import json
            meta_path = f"{output_prefix}_metadata.json"
            with open(meta_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            return {
                'raster': raster_path,
                'visualization': vis_path,
                'metadata': meta_path
            }
            
        except Exception as e:
            self.logger.error(f"Error saving interpolation results: {str(e)}")
            raise
    
    def _visualize_interpolation(self, interpolated_grid: np.ndarray,
                              transform: rasterio.transform.Affine,
                              bounds: Tuple[float, float, float, float],
                              pollutant: str, output_path: str) -> None:
        """
        Create a visualization of the interpolated surface.
        
        Args:
            interpolated_grid: 2D array of interpolated values
            transform: Affine transform for georeferencing
            bounds: Spatial bounds (minx, miny, maxx, maxy)
            pollutant: Name of the pollutant
            output_path: Path to save the visualization
        """
        # Set up the plot
        plt.figure(figsize=(12, 10))
        
        # Plot interpolated surface
        extent = [bounds[0], bounds[2], bounds[1], bounds[3]]
        img = plt.imshow(interpolated_grid, extent=extent, origin='upper', cmap='jet', alpha=0.8)
        
        # Add colorbar
        cbar = plt.colorbar(img)
        cbar.set_label(self._get_pollutant_label(pollutant))
        
        # Set title and labels
        plt.title(f"Interpolated {pollutant.upper()} Concentration")
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
