"""
Base class for data fetchers in AirAlert.
"""
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Tuple, Optional
import logging

class DataFetcher(ABC):
    """Abstract base class for data fetchers."""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize with configuration.
        
        Args:
            config: Configuration parameters for the data fetcher
        """
        self.config = config
        self.logger = logging.getLogger(f"DataFetcher.{self.__class__.__name__}")
    
    @abstractmethod
    async def fetch_data(self) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Fetch data from the source.
        
        Returns:
            Tuple of (stations, readings) where:
              - stations: List of dicts with station information
              - readings: List of dicts with pollutant readings
        """
        pass
    
    def _validate_response(self, data: Any) -> bool:
        """
        Validate response data.
        
        Args:
            data: Response data to validate
            
        Returns:
            True if data is valid, False otherwise
        """
        # Default implementation just checks if data is not None
        return data is not None
