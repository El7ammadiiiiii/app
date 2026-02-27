# omnichain/providers/base.py
"""
🔧 Base Classes for Omnichain Providers
Provides BaseClient (HTTP), BaseAgent (AI), and ChainConfig utilities
"""

import asyncio
import aiohttp
import json
import time
import logging
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
from functools import wraps
logger = logging.getLogger(__name__)


_TRACE_VERBOSE = os.getenv("TRACE_VERBOSE", "0").strip().lower() in {"1", "true", "yes", "on"}


def _trace_log(message: str) -> None:
    """Log verbose lifecycle messages only when TRACE_VERBOSE=1."""
    if _TRACE_VERBOSE:
        logger.info(message)
    else:
        logger.debug(message)


# ═══════════════════════════════════════════════════════════════════════════════
# 📊 CHAIN CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class ChainConfig:
    """Configuration for a blockchain"""
    chain_id: int
    name: str
    symbol: str
    decimals: int = 18
    chain_type: str = "EVM"  # EVM, Non-EVM, L1, L2-Optimistic, L2-ZK, etc.
    explorer: str = ""
    rpc_url: str = ""
    api_url: str = ""
    
    @classmethod
    def from_json(cls, path: Union[str, Path]) -> "ChainConfig":
        """Load chain config from JSON file"""
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return cls(
            chain_id=data.get("chain_id", 0),
            name=data.get("name", "Unknown"),
            symbol=data.get("symbol", "???"),
            decimals=data.get("decimals", 18),
            chain_type=data.get("type", "EVM"),
            explorer=data.get("explorer", ""),
            rpc_url=data.get("rpc_url", ""),
            api_url=data.get("api_url", ""),
        )
    
    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return {
            "chain_id": self.chain_id,
            "name": self.name,
            "symbol": self.symbol,
            "decimals": self.decimals,
            "type": self.chain_type,
            "explorer": self.explorer,
            "rpc_url": self.rpc_url,
            "api_url": self.api_url,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# ⏱️ RATE LIMITER
# ═══════════════════════════════════════════════════════════════════════════════

class RateLimiter:
    """Token bucket rate limiter for API calls"""
    
    def __init__(self, rate: float = 5.0, burst: int = 10):
        """
        Args:
            rate: Requests per second
            burst: Maximum burst size
        """
        self.rate = rate
        self.burst = burst
        self.tokens = burst
        self.last_update = time.monotonic()
        self._lock = asyncio.Lock()
    
    async def acquire(self) -> None:
        """Wait until a request can be made"""
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self.last_update
            self.tokens = min(self.burst, self.tokens + elapsed * self.rate)
            self.last_update = now
            
            if self.tokens < 1:
                wait_time = (1 - self.tokens) / self.rate
                await asyncio.sleep(wait_time)
                self.tokens = 0
            else:
                self.tokens -= 1


# ═══════════════════════════════════════════════════════════════════════════════
# 💾 SIMPLE CACHE
# ═══════════════════════════════════════════════════════════════════════════════

class SimpleCache:
    """In-memory cache with TTL"""
    
    def __init__(self, ttl: int = 300, max_size: int = 1000):
        """
        Args:
            ttl: Time to live in seconds
            max_size: Maximum cache entries
        """
        self.ttl = ttl
        self.max_size = max_size
        self._cache: Dict[str, tuple] = {}  # key -> (value, timestamp)
        self._lock = asyncio.Lock()
    
    def _make_key(self, *args, **kwargs) -> str:
        """Create cache key from arguments"""
        return json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True)
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        async with self._lock:
            if key in self._cache:
                value, timestamp = self._cache[key]
                if time.time() - timestamp < self.ttl:
                    return value
                del self._cache[key]
        return None
    
    async def set(self, key: str, value: Any) -> None:
        """Set value in cache"""
        async with self._lock:
            # Evict oldest if full
            if len(self._cache) >= self.max_size:
                oldest_key = min(self._cache.keys(), key=lambda k: self._cache[k][1])
                del self._cache[oldest_key]
            
            self._cache[key] = (value, time.time())
    
    async def clear(self) -> None:
        """Clear all cache entries"""
        async with self._lock:
            self._cache.clear()


# ═══════════════════════════════════════════════════════════════════════════════
# 🌐 BASE HTTP CLIENT
# ═══════════════════════════════════════════════════════════════════════════════

class BaseClient(ABC):
    """
    Abstract base class for blockchain API clients.
    Provides HTTP session management, rate limiting, caching, and retries.
    """
    
    def __init__(
        self,
        base_url: str,
        api_key: Optional[str] = None,
        rate_limit: float = 5.0,
        cache_ttl: int = 300,
        timeout: int = 30,
        max_retries: int = 3,
    ):
        """
        Args:
            base_url: Base API URL
            api_key: API key (optional)
            rate_limit: Requests per second
            cache_ttl: Cache TTL in seconds
            timeout: HTTP timeout in seconds
            max_retries: Maximum retry attempts
        """
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.timeout = timeout
        self.max_retries = max_retries
        
        self.rate_limiter = RateLimiter(rate=rate_limit)
        self.cache = SimpleCache(ttl=cache_ttl)
        
        self._session: Optional[aiohttp.ClientSession] = None
        self._initialized = False
    
    async def initialize(self) -> None:
        """Initialize HTTP session"""
        if not self._initialized:
            import socket
            import ssl
            
            # Create SSL context that doesn't verify certificates (temporary fix)
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            
            # Try using system resolver instead of aiodns
            connector = aiohttp.TCPConnector(
                limit=100,
                limit_per_host=30,
                keepalive_timeout=30,
                family=socket.AF_INET,  # Force IPv4
                use_dns_cache=False,  # Disable DNS cache
                ssl=ssl_context,
                force_close=False,
                enable_cleanup_closed=True
            )
            
            # Increase timeout
            timeout = aiohttp.ClientTimeout(
                total=60,
                connect=30,
                sock_connect=30,
                sock_read=30
            )
            
            self._session = aiohttp.ClientSession(
                connector=connector,
                timeout=timeout,
            )
            self._initialized = True
            _trace_log(f"Initialized client for {self.base_url}")
    
    async def close(self) -> None:
        """Close HTTP session"""
        if self._session:
            await self._session.close()
            self._session = None
            self._initialized = False
            _trace_log(f"Closed client for {self.base_url}")
    
    async def __aenter__(self):
        await self.initialize()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
    
    def _get_headers(self) -> Dict[str, str]:
        """Get default headers. Override in subclass for custom headers."""
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        
        # إذا كان base_url يحتوي على IP، أضف Host header
        if self.base_url and "217.79.243.34" in self.base_url:
            headers["Host"] = "api.etherscan.io"
        
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers
    
    async def _request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict] = None,
        data: Optional[Dict] = None,
        use_cache: bool = True,
    ) -> Dict[str, Any]:
        """
        Make HTTP request with rate limiting, caching, and retries.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint (appended to base_url)
            params: Query parameters
            data: Request body (for POST)
            use_cache: Whether to use caching
        
        Returns:
            JSON response as dictionary
        """
        if not self._initialized:
            await self.initialize()
        
        url = f"{self.base_url}/{endpoint.lstrip('/')}" if endpoint else self.base_url
        
        # Check cache for GET requests
        cache_key = None
        if use_cache and method.upper() == "GET":
            cache_key = self.cache._make_key(url, params)
            cached = await self.cache.get(cache_key)
            if cached is not None:
                logger.debug(f"Cache hit: {url}")
                return cached
        
        # Rate limiting
        await self.rate_limiter.acquire()
        
        # Retry loop
        last_error = None
        for attempt in range(self.max_retries):
            try:
                async with self._session.request(
                    method=method.upper(),
                    url=url,
                    params=params,
                    json=data,
                    headers=self._get_headers(),
                ) as response:
                    # Handle rate limit
                    if response.status == 429:
                        retry_after = int(response.headers.get("Retry-After", 1))
                        logger.warning(f"Rate limited, waiting {retry_after}s")
                        await asyncio.sleep(retry_after)
                        continue
                    
                    response.raise_for_status()
                    result = await response.json()
                    
                    # Cache successful GET responses
                    if cache_key:
                        await self.cache.set(cache_key, result)
                    
                    return result
                    
            except aiohttp.ClientError as e:
                last_error = e
                if attempt < self.max_retries - 1:
                    wait_time = 2 ** attempt  # Exponential backoff
                    logger.warning(f"Request failed, retrying in {wait_time}s: {e}")
                    await asyncio.sleep(wait_time)
        
        logger.error(f"Request failed after {self.max_retries} attempts: {last_error}")
        raise last_error
    
    async def get(self, endpoint: str = "", params: Optional[Dict] = None, **kwargs) -> Dict:
        """Make GET request"""
        return await self._request("GET", endpoint, params=params, **kwargs)
    
    async def post(self, endpoint: str = "", data: Optional[Dict] = None, **kwargs) -> Dict:
        """Make POST request"""
        return await self._request("POST", endpoint, data=data, use_cache=False, **kwargs)
    
    @abstractmethod
    async def get_balance(self, address: str, **kwargs) -> Dict:
        """Get address balance. Must be implemented by subclass."""
        pass
    
    @abstractmethod
    async def get_transactions(self, address: str, **kwargs) -> Dict:
        """Get address transactions. Must be implemented by subclass."""
        pass


# ═══════════════════════════════════════════════════════════════════════════════
# 🤖 BASE AI AGENT
# ═══════════════════════════════════════════════════════════════════════════════

class BaseAgent(ABC):
    """
    Abstract base class for AI agents.
    Wraps OpenAI GPT-4o-mini for specialized blockchain analysis.
    """
    
    def __init__(
        self,
        name: str,
        api_key: str,
        model: str = "gpt-4o-mini",
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ):
        """
        Args:
            name: Agent name
            api_key: OpenAI API key
            model: Model name
            system_prompt: System prompt for the agent
            temperature: Model temperature
            max_tokens: Maximum response tokens
        """
        self.name = name
        self.api_key = api_key
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        
        self.system_prompt = system_prompt or self._default_system_prompt()
        
        self._client: Optional[Any] = None
        self._data_client: Optional[BaseClient] = None
    
    def _default_system_prompt(self) -> str:
        """Default system prompt. Override in subclass."""
        return f"""You are {self.name}, a specialized blockchain data analyst.

Your role is to:
1. Analyze on-chain data accurately
2. Provide clear, structured responses
3. Identify patterns and anomalies
4. Give actionable insights

Always format responses in a clear, organized manner.
Use tables, bullet points, and sections for better readability.
Include relevant metrics and comparisons when available."""
    
    async def initialize(self) -> None:
        """Initialize the OpenAI client"""
        try:
            from openai import AsyncOpenAI
            self._client = AsyncOpenAI(api_key=self.api_key)
            _trace_log(f"Initialized agent: {self.name}")
        except ImportError:
            raise ImportError("openai package required. Install with: pip install openai")
    
    async def close(self) -> None:
        """Close resources"""
        if self._data_client:
            await self._data_client.close()
        self._client = None
        _trace_log(f"Closed agent: {self.name}")
    
    async def __aenter__(self):
        await self.initialize()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
    
    def set_data_client(self, client: BaseClient) -> None:
        """Set the data client for fetching blockchain data"""
        self._data_client = client
    
    async def _call_llm(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
    ) -> str:
        """
        Call the LLM with messages.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Override temperature
        
        Returns:
            LLM response text
        """
        if not self._client:
            await self.initialize()
        
        # Add system message
        full_messages = [
            {"role": "system", "content": self.system_prompt},
            *messages,
        ]
        
        response = await self._client.chat.completions.create(
            model=self.model,
            messages=full_messages,
            temperature=temperature or self.temperature,
            max_tokens=self.max_tokens,
        )
        
        return response.choices[0].message.content
    
    async def analyze(self, query: str, data: Optional[Dict] = None) -> str:
        """
        Analyze data and respond to query.
        
        Args:
            query: User query
            data: Optional data to analyze
        
        Returns:
            Analysis response
        """
        messages = []
        
        if data:
            messages.append({
                "role": "user",
                "content": f"Here is the blockchain data to analyze:\n```json\n{json.dumps(data, indent=2)}\n```"
            })
        
        messages.append({
            "role": "user",
            "content": query
        })
        
        return await self._call_llm(messages)
    
    @abstractmethod
    async def process_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a request from the orchestrator.
        Must be implemented by subclass.
        
        Args:
            request: Request dict with 'action', 'params', etc.
        
        Returns:
            Response dict with 'success', 'data', 'analysis', etc.
        """
        pass
    
    async def fetch_and_analyze(
        self,
        action: str,
        params: Dict[str, Any],
        query: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Fetch data and optionally analyze it.
        
        Args:
            action: Action to perform (e.g., 'get_balance')
            params: Parameters for the action
            query: Optional analysis query
        
        Returns:
            Dict with 'data' and optionally 'analysis'
        """
        if not self._data_client:
            raise RuntimeError("Data client not set. Call set_data_client() first.")
        
        # Fetch data based on action
        method = getattr(self._data_client, action, None)
        if not method:
            raise ValueError(f"Unknown action: {action}")
        
        data = await method(**params)
        
        result = {
            "success": True,
            "data": data,
        }
        
        # Analyze if query provided
        if query:
            analysis = await self.analyze(query, data)
            result["analysis"] = analysis
        
        return result


# ═══════════════════════════════════════════════════════════════════════════════
# 🔧 UTILITY FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def wei_to_eth(wei: Union[int, str], decimals: int = 18) -> float:
    """Convert wei to ETH (or other native token)"""
    if isinstance(wei, str):
        wei = int(wei)
    return wei / (10 ** decimals)


def eth_to_wei(eth: float, decimals: int = 18) -> int:
    """Convert ETH to wei"""
    return int(eth * (10 ** decimals))


def format_address(address: str) -> str:
    """Format address with checksum (if valid)"""
    if not address or not address.startswith("0x"):
        return address
    return address.lower()


def shorten_address(address: str, chars: int = 4) -> str:
    """Shorten address for display"""
    if len(address) <= chars * 2 + 2:
        return address
    return f"{address[:chars+2]}...{address[-chars:]}"


async def gather_with_errors(*coros) -> List[Any]:
    """Run coroutines in parallel, capturing errors"""
    results = await asyncio.gather(*coros, return_exceptions=True)
    return [
        r if not isinstance(r, Exception) else {"error": str(r)}
        for r in results
    ]


# ═══════════════════════════════════════════════════════════════════════════════
# 📝 LOGGING DECORATOR
# ═══════════════════════════════════════════════════════════════════════════════

def log_request(func):
    """Decorator to log API requests"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start = time.time()
        try:
            result = await func(*args, **kwargs)
            elapsed = time.time() - start
            logger.debug(f"{func.__name__} completed in {elapsed:.2f}s")
            return result
        except Exception as e:
            elapsed = time.time() - start
            logger.error(f"{func.__name__} failed after {elapsed:.2f}s: {e}")
            raise
    return wrapper
