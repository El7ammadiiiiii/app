"""
Redis Cache Implementation
===========================
Production-ready Redis caching with in-memory fallback.
"""

import asyncio
import pickle
import time
from typing import Any, Optional
import logging

logger = logging.getLogger(__name__)

# Try to import Redis, fallback to None if not available
try:
    import redis.asyncio as redis
    REDIS_AVAILABLE = True
except ImportError:
    logger.warning("redis package not installed - falling back to in-memory cache")
    REDIS_AVAILABLE = False
    redis = None


class RedisCache:
    """
    Redis-based cache with automatic fallback to in-memory.
    
    Features:
    - Async Redis operations
    - Automatic connection retry
    - In-memory fallback if Redis unavailable
    - Pickle serialization for complex objects
    """
    
    def __init__(
        self,
        redis_url: str = "redis://localhost:6379",
        ttl: int = 300,
        max_local_size: int = 1000
    ):
        """
        Initialize Redis cache.
        
        Args:
            redis_url: Redis connection URL
            ttl: Default TTL in seconds
            max_local_size: Max size for local fallback cache
        """
        self.redis_url = redis_url
        self.ttl = ttl
        self.max_local_size = max_local_size
        
        self.redis_client: Optional[Any] = None
        self.use_redis = False
        
        # Fallback in-memory cache
        self.local_cache: dict = {}
        self.local_timestamps: dict = {}
        
        logger.info(f"RedisCache initialized (url={redis_url}, ttl={ttl}s)")
    
    async def connect(self) -> None:
        """Establish Redis connection"""
        if not REDIS_AVAILABLE:
            logger.warning("Redis not available, using in-memory fallback")
            self.use_redis = False
            return
        
        try:
            self.redis_client = redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=False  # We'll handle serialization
            )
            await self.redis_client.ping()
            self.use_redis = True
            logger.info("✓ Connected to Redis successfully")
        except Exception as e:
            logger.warning(f"Failed to connect to Redis: {e}")
            logger.warning("Falling back to in-memory cache")
            self.use_redis = False
    
    async def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found
        """
        try:
            if self.use_redis and self.redis_client:
                # Try Redis first
                data = await self.redis_client.get(key)
                if data:
                    return pickle.loads(data)
            else:
                # Use local cache
                if key in self.local_cache:
                    timestamp = self.local_timestamps.get(key, 0)
                    if time.time() - timestamp < self.ttl:
                        return self.local_cache[key]
                    else:
                        # Expired
                        del self.local_cache[key]
                        del self.local_timestamps[key]
        except Exception as e:
            logger.error(f"Cache get error ({key}): {e}")
        
        return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """
        Set value in cache.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Override default TTL (optional)
        """
        cache_ttl = ttl if ttl is not None else self.ttl
        
        try:
            if self.use_redis and self.redis_client:
                # Store in Redis
                serialized = pickle.dumps(value)
                await self.redis_client.setex(key, cache_ttl, serialized)
            else:
                # Store in local cache
                # Evict oldest if full
                if len(self.local_cache) >= self.max_local_size:
                    oldest_key = min(
                        self.local_timestamps.keys(),
                        key=lambda k: self.local_timestamps[k]
                    )
                    del self.local_cache[oldest_key]
                    del self.local_timestamps[oldest_key]
                
                self.local_cache[key] = value
                self.local_timestamps[key] = time.time()
        except Exception as e:
            logger.error(f"Cache set error ({key}): {e}")
    
    async def delete(self, key: str) -> bool:
        """
        Delete a key from cache.
        
        Args:
            key: Cache key
            
        Returns:
            True if deleted, False otherwise
        """
        try:
            if self.use_redis and self.redis_client:
                result = await self.redis_client.delete(key)
                return result > 0
            else:
                if key in self.local_cache:
                    del self.local_cache[key]
                    del self.local_timestamps[key]
                    return True
        except Exception as e:
            logger.error(f"Cache delete error ({key}): {e}")
        
        return False
    
    async def clear(self) -> None:
        """Clear all cache entries"""
        try:
            if self.use_redis and self.redis_client:
                await self.redis_client.flushdb()
                logger.info("Cleared Redis cache")
            else:
                count = len(self.local_cache)
                self.local_cache.clear()
                self.local_timestamps.clear()
                logger.info(f"Cleared {count} local cache entries")
        except Exception as e:
            logger.error(f"Cache clear error: {e}")
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        try:
            if self.use_redis and self.redis_client:
                return await self.redis_client.exists(key) > 0
            else:
                if key in self.local_cache:
                    timestamp = self.local_timestamps.get(key, 0)
                    return time.time() - timestamp < self.ttl
        except Exception as e:
            logger.error(f"Cache exists error ({key}): {e}")
        
        return False
    
    async def close(self) -> None:
        """Close Redis connection"""
        if self.redis_client:
            await self.redis_client.close()
            logger.info("Redis connection closed")
