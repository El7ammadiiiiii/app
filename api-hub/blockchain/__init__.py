# omnichain/__init__.py
"""
🌐 Omnichain - Multi-Agent Blockchain Data System
101+ chains • 12 GPT-4o-mini agents • Claude 3.5 Sonnet orchestrator
"""

__version__ = "1.0.0"
__author__ = "Omnichain Team"

from .config import API_KEYS, BLOCKCHAIN_APIS, SETTINGS
from .orchestrator import Orchestrator

__all__ = [
    "API_KEYS",
    "BLOCKCHAIN_APIS",
    "SETTINGS",
    "Orchestrator",
]
