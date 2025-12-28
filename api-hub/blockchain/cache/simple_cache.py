"""
Simple In-Memory Cache
=======================
Simple TTL-based in-memory cache for quick data access.
"""

import asyncio
import time
import json
from typing import Any, Dict, Optional
import logging

logger = logging.getLogger(__name__)


class SimpleCache:
    """In-memory cache with TTL support"""
    
    def __init__(self, ttl: int = 300, max_size: int = 1000):
        """
        Initialize cache.
        
        Args:
            ttl: Time to live in seconds (default: 5 minutes)
            max_size: Maximum number of cache entries (default: 1000)
        """
        self.ttl = ttl
        self.max_size = max_size
        self._cache: Dict[str, tuple] = {}  # key -> (value, timestamp)
        self._lock = asyncio.Lock()
        logger.info(f"SimpleCache initialized (ttl={ttl}s, max_size={max_size})")
    
    def _make_key(self, *args, **kwargs) -> str:
        """Create cache key from arguments"""
        return json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True)
    
    async def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found/expired
        """
        async with self._lock:
            if key in self._cache:
                value, timestamp = self._cache[key]
                if time.time() - timestamp < self.ttl:
                    return value
                # Expired - remove it
                del self._cache[key]
        return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """
        Set value in cache.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Override default TTL (optional)
        """
        async with self._lock:
            # Evict oldest entry if cache is full
            if len(self._cache) >= self.max_size:
                oldest_key = min(self._cache.keys(), key=lambda k: self._cache[k][1])
                del self._cache[oldest_key]
                logger.debug(f"Evicted oldest entry: {oldest_key}")
            
            # Store with custom or default TTL
            cache_ttl = ttl if ttl is not None else self.ttl
            self._cache[key] = (value, time.time())
    
    async def delete(self, key: str) -> bool:
        """
        Delete a key from cache.
        
        Args:
            key: Cache key
            
        Returns:
            True if key was deleted, False if not found
        """
        async with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
        return False
    
    async def clear(self) -> None:
        """Clear all cache entries"""
        async with self._lock:
            count = len(self._cache)
            self._cache.clear()
            logger.info(f"Cleared {count} cache entries")
    
    async def size(self) -> int:
        """Get current cache size"""
        async with self._lock:
            return len(self._cache)
    
    async def cleanup_expired(self) -> int:
        """
        Remove all expired entries.
        
        Returns:
            Number of entries removed
        """
        async with self._lock:
            current_time = time.time()
            expired_keys = [
                key for key, (_, timestamp) in self._cache.items()
                if current_time - timestamp >= self.ttl
            ]
            
            for key in expired_keys:
                del self._cache[key]
            
            if expired_keys:
                logger.debug(f"Cleaned up {len(expired_keys)} expired entries")
            
            return len(expired_keys)
