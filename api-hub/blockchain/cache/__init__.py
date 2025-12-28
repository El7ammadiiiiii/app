"""
Cache Module for Omnichain
===========================
Caching layer with Redis support and in-memory fallback.
"""

from .redis_cache import RedisCache
from .simple_cache import SimpleCache

__all__ = ["RedisCache", "SimpleCache"]
