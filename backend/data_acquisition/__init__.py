"""
Data acquisition module for the AirAlert system.
Handles fetching data from various sources and integration into the database.
"""

from .fetchers.base import DataFetcher
from .fetchers.openaq import OpenAQFetcher
from .integrator import DataIntegrator

__all__ = [
    'DataFetcher',
    'OpenAQFetcher',
    'DataIntegrator'
]
