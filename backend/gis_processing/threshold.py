"""
Threshold detection module for AirAlert.
Identifies areas where air quality exceeds dangerous thresholds.
"""
import logging
import numpy as np
from typing import Dict, Any, List, Tuple, Optional
import geopandas as gpd
import matplotlib.pyplot as plt
import os
from datetime import datetime
from shapely.geometry import Polygon, MultiPolygon

class ThresholdDetector:
    """Detects areas where pollutant levels exceed thresholds."""
    
    # Default thresholds based on WHO guidelines
    DEFAULT_THRESHOLDS = {
        'pm25': {  # in μg/m³
            'good': 12,
            'moderate': 35.4,
            'unhealthy_sensitive': 55.4,
            'unhealthy': 150.4,
            'very_unhealthy': 250.4,
            'hazardous': 350.4
        },
        'pm10': {  # in μg/m³
            'good': 54,
            'moderate': 154,
            'unhealthy_sensitive': 254,
            'unhealthy': 354,
            'very_unhealthy': 424,
            'hazardous': 504
        },
        'o3': {  # in ppb
            'good': 54,
            'moderate': 70,
            'unhealthy_sensitive': 85,
            'unhealthy': 105,
            'very_unhealthy': 200,
            'hazardous': 300
        },
        'no2': {  # in ppb
            'good': 53,
            'moderate': 100,
            'unhealthy_sensitive': 360,
            'unhealthy': 649,
            'very_unhealthy': 1249,
            'hazardous': 1649
        },
        'so2': {  # in ppb
            'good': 35,
            'moderate': 75,
            'unhealthy_sensitive': 185,
            'unhealthy': 304,
            'very_unhealthy': 604,
            'hazardous': 804
        },
        'co': {  # in ppm
            'good': 4.4,
            'moderate': 9.4,
            'unhealthy_sensitive': 12.4,
            'unhealthy': 15.4,
            'very_unhealthy': 30.4,
            'hazardous': 40.4
        },
        'aqi': {  # AQI values
            'good': 50,
            'moderate': 100,
            'unhealthy_sensitive': 150,
            'unhealthy': 200,
            'very_unhealthy': 300,
            'hazardous': 500
        }
    }
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize with configuration.
        
        Args:
            config: Configuration parameters including:
                - thresholds: Custom thresholds (optional)
                - output_dir: Directory to save outputs (default: 'output')
        """
        self.config = config
        self.output_dir = config.get('output_dir', 'output')
        
        # Use custom thresholds if provided, otherwise use defaults
        self.thresholds = config.get('thresholds', self.DEFAULT_THRESHOLDS)
        
        self.logger = logging.getLogger("ThresholdDetector")
        
        # Create output directory if it doesn't exist
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
    
    def detect_exceedances(self, concentration: np.ndarray, 
                          transform: Any, bounds: Tuple[float, float, float, float],
                          pollutant: str, threshold_level: str = 'unhealthy') -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Detect areas where pollutant exceeds the specified threshold.
        
        Args:
            concentration: Grid of pollutant concentrations
            transform: Affine transform for georeferencing
            bounds: Spatial bounds (minx, miny, maxx, maxy)
            pollutant: Name of the pollutant
            threshold_level: Level to use ('good', 'moderate', etc.)
            
        Returns:
            Tuple of (exceedance_mask, metadata)
        """
        try:
            # Get the threshold value
            if pollutant not in self.thresholds:
                self.logger.warning(f"No thresholds defined for {pollutant}, using AQI thresholds")
                pollutant_thresholds = self.thresholds.get('aqi', {})
            else:
                pollutant_thresholds = self.thresholds[pollutant]
            
            if threshold_level not in pollutant_thresholds:
                self.logger.warning(f"Threshold level '{threshold_level}' not defined for {pollutant}, using 'unhealthy'")
                threshold_level = 'unhealthy'
                
            threshold = pollutant_thresholds.get(threshold_level)
            
            if threshold is None:
                raise ValueError(f"No threshold value found for {pollutant} at level {threshold_level}")
            
            # Create mask where concentration exceeds threshold
            exceedance_mask = concentration > threshold
            
            # Calculate exceedance statistics
            total_cells = concentration.size
            exceeded_cells = np.sum(exceedance_mask)
            percentage = (exceeded_cells / total_cells) * 100 if total_cells > 0 else 0
            
            # Calculate area statistics (assuming lat/long coordinates)
            # Approximate area calculation
            cell_width = (bounds[2] - bounds[0]) / concentration.shape[1]
            cell_height = (bounds[3] - bounds[1]) / concentration.shape[0]
            
            # Assuming equirectangular approximation
            # Area in square km (very rough approximation)
            # For a proper area calculation, we'd need to reproject to an equal-area projection
            exceeded_area_km2 = exceeded_cells * cell_width * cell_height * 111 * 111
            
            metadata = {
                'pollutant': pollutant,
                'threshold_level': threshold_level,
                'threshold_value': threshold,
                'total_cells': int(total_cells),
                'exceeded_cells': int(exceeded_cells),
                'exceedance_percentage': float(percentage),
                'exceeded_area_km2': float(exceeded_area_km2),
                'max_concentration': float(np.max(concentration)),
                'mean_concentration': float(np.mean(concentration)),
                'timestamp': datetime.now().isoformat()
            }
            
            return exceedance_mask, metadata
            
        except Exception as e:
            self.logger.error(f"Error detecting exceedances: {str(e)}")
            raise
    
    def create_exceedance_polygons(self, exceedance_mask: np.ndarray, 
                                 transform: Any, bounds: Tuple[float, float, float, float],
                                 simplify_tolerance: Optional[float] = None) -> gpd.GeoDataFrame:
        """
        Convert exceedance raster mask to vector polygons.
        
        Args:
            exceedance_mask: Boolean mask where True indicates exceedance
            transform: Affine transform for georeferencing
            bounds: Spatial bounds (minx, miny, maxx, maxy)
            simplify_tolerance: Tolerance for polygon simplification (optional)
            
        Returns:
            GeoDataFrame with exceedance polygons
        """
        try:
            import rasterio
            from rasterio import features
            
            # Extract shapes from raster mask
            shapes = features.shapes(
                exceedance_mask.astype('uint8'),
                mask=exceedance_mask,
                transform=transform
            )
            
            # Convert shapes to polygons
            polygons = []
            for geom, value in shapes:
                if value == 1:  # Only include areas with exceedance
                    polygon = Polygon(geom['coordinates'][0])
                    
                    # Simplify if requested
                    if simplify_tolerance is not None:
                        polygon = polygon.simplify(simplify_tolerance)
                        
                    if not polygon.is_empty:
                        polygons.append(polygon)
            
            # Create GeoDataFrame
            if polygons:
                gdf = gpd.GeoDataFrame({'geometry': polygons}, crs="EPSG:4326")
                
                # Calculate polygon areas (in square km, approximate)
                gdf['area_km2'] = gdf.to_crs('EPSG:3857').area / 10**6
                
                return gdf
            else:
                # Return empty GeoDataFrame
                return gpd.GeoDataFrame(columns=['geometry', 'area_km2'], geometry='geometry', crs="EPSG:4326")
            
        except Exception as e:
            self.logger.error(f"Error creating exceedance polygons: {str(e)}")
            # Return empty GeoDataFrame on error
            return gpd.GeoDataFrame(columns=['geometry'], geometry='geometry', crs="EPSG:4326")
    
    def visualize_exceedances(self, concentration: np.ndarray, exceedance_mask: np.ndarray,
                            transform: Any, bounds: Tuple[float, float, float, float],
                            pollutant: str, metadata: Dict[str, Any],
                            output_path: Optional[str] = None) -> str:
        """
        Visualize areas of threshold exceedance.
        
        Args:
            concentration: Grid of pollutant concentrations
            exceedance_mask: Boolean mask where True indicates exceedance
            transform: Affine transform for georeferencing
            bounds: Spatial bounds (minx, miny, maxx, maxy)
            pollutant: Name of the pollutant
            metadata: Exceedance metadata
            output_path: Path to save the visualization (optional)
            
        Returns:
            Path to the saved visualization
        """
        try:
            # Generate default output path if not provided
            if output_path is None:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_path = os.path.join(self.output_dir, f"{pollutant}_exceedance_{timestamp}.png")
                
            # Create parent directories if they don't exist
            os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
            
            # Set up the plot
            plt.figure(figsize=(12, 10))
            
            # Plot concentration as background
            extent = [bounds[0], bounds[2], bounds[1], bounds[3]]
            plt.imshow(concentration, extent=extent, origin='upper', cmap='YlOrRd', alpha=0.7)
            
            # Add colorbar
            cbar = plt.colorbar()
            cbar.set_label(self._get_pollutant_label(pollutant))
            
            # Highlight exceedances
            exceedance = np.ma.masked_array(
                concentration, 
                mask=~exceedance_mask
            )
            plt.imshow(exceedance, extent=extent, origin='upper', cmap='Reds', alpha=0.7)
            
            # Create polygon outlines for exceedance areas
            exceedance_gdf = self.create_exceedance_polygons(
                exceedance_mask, 
                transform, 
                bounds,
                simplify_tolerance=0.001
            )
            
            if not exceedance_gdf.empty:
                exceedance_gdf.boundary.plot(ax=plt.gca(), color='red', linewidth=2)
            
            # Set title and labels
            threshold_value = metadata.get('threshold_value', 'unknown')
            threshold_level = metadata.get('threshold_level', 'unknown')
            exceeded_area = metadata.get('exceeded_area_km2', 0)
            
            title = f"{pollutant.upper()} Exceedance Areas\n"
            title += f"Threshold: {threshold_value} ({threshold_level})\n"
            title += f"Exceeded area: {exceeded_area:.1f} km²"
            
            plt.title(title)
            plt.xlabel("Longitude")
            plt.ylabel("Latitude")
            plt.grid(True, alpha=0.3)
            
            # Save the figure
            plt.tight_layout()
            plt.savefig(output_path, dpi=300, bbox_inches='tight')
            plt.close()
            
            self.logger.info(f"Saved exceedance visualization to {output_path}")
            return output_path
            
        except Exception as e:
            self.logger.error(f"Error visualizing exceedances: {str(e)}")
            raise
    
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
    
    def identify_threshold_exceedances(self, pollutant: str, concentration: np.ndarray, 
                                    transform: Any) -> Dict[str, gpd.GeoDataFrame]:
        """
        Identify areas where pollutant concentrations exceed different health thresholds.
        
        Args:
            pollutant: Name of the pollutant
            concentration: Grid of pollutant concentrations
            transform: Affine transform for georeferencing
            
        Returns:
            Dictionary mapping threshold levels to GeoDataFrames with exceedance polygons
        """
        try:
            # Check if we have thresholds for this pollutant
            if pollutant not in self.thresholds:
                self.logger.warning(f"No thresholds defined for {pollutant}, using AQI thresholds")
                pollutant_thresholds = self.thresholds.get('aqi', {})
            else:
                pollutant_thresholds = self.thresholds[pollutant]
                
            # Get raster bounds from transform and concentration shape
            height, width = concentration.shape
            bounds = (
                transform.c,                # minx
                transform.f + transform.e * height,  # miny
                transform.c + transform.a * width,   # maxx
                transform.f                # maxy
            )
            
            result = {}
            
            # Check exceedances for each threshold level, from most to least severe
            severity_levels = ['hazardous', 'very_unhealthy', 'unhealthy', 'unhealthy_sensitive', 'moderate']
            
            for level in severity_levels:
                if level not in pollutant_thresholds:
                    self.logger.warning(f"Threshold level '{level}' not defined for {pollutant}")
                    continue
                
                # Detect exceedances for this threshold
                exceedance_mask, metadata = self.detect_exceedances(
                    concentration, 
                    transform, 
                    bounds, 
                    pollutant, 
                    level
                )
                
                # Convert to polygons
                gdf = self.create_exceedance_polygons(
                    exceedance_mask, 
                    transform, 
                    bounds
                )
                
                # Add threshold information
                if not gdf.empty:
                    gdf['threshold'] = metadata['threshold_value']
                    gdf['level'] = level
                    gdf['pollutant'] = pollutant
                    
                    # Only include areas that have exceeded this threshold but not more severe ones
                    # (i.e., exclude areas already counted in more severe categories)
                    for more_severe in result.keys():
                        if not gdf.empty and not result[more_severe].empty:
                            # Spatial difference to exclude more severe areas
                            gdf = gpd.overlay(gdf, result[more_severe], how='difference')
                    
                    result[level] = gdf
                else:
                    result[level] = gpd.GeoDataFrame(
                        columns=['geometry', 'threshold', 'level', 'pollutant', 'area_km2'],
                        geometry='geometry', 
                        crs="EPSG:4326"
                    )
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error identifying threshold exceedances: {str(e)}")
            return {}

class ThresholdAnalyzer:
    """Analyzes pollutant concentration thresholds."""

    def __init__(self, thresholds=None):
        """Initialize with default or custom thresholds."""
        self.thresholds = thresholds or {
            "pm25": 35.0,  # µg/m³
            "pm10": 50.0,  # µg/m³
            "o3": 100.0,   # ppb
            "no2": 40.0,   # ppb
            "so2": 20.0,   # ppb
            "co": 4.0      # ppm
        }

    def identify_threshold_exceedances(self, pollutant, raster, transform):
        """Identify areas where pollutant levels exceed thresholds."""
        import numpy as np

        threshold = self.thresholds.get(pollutant)
        if threshold is None:
            raise ValueError(f"No threshold defined for pollutant: {pollutant}")

        exceedances = raster > threshold
        return exceedances

    def visualize_threshold_exceedances(self, exceedances, transform, output_path, pollutant):
        """Visualize areas of threshold exceedances."""
        import matplotlib.pyplot as plt

        plt.figure(figsize=(10, 8))
        plt.imshow(exceedances, cmap="Reds", extent=(transform[2], transform[2] + transform[0] * exceedances.shape[1],
                                                      transform[5] + transform[4] * exceedances.shape[0], transform[5]))
        plt.colorbar(label=f"Exceedance of {pollutant} Threshold")
        plt.title(f"Threshold Exceedances for {pollutant}")
        plt.xlabel("Longitude")
        plt.ylabel("Latitude")
        plt.savefig(output_path)
        plt.close()
