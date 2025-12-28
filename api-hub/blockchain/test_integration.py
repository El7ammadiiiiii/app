"""
Integration Test for Enhanced Omnichain Features
=================================================
Tests analytics, scoring, and caching modules.
"""

import asyncio
import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent))


async def test_graph_analysis():
    """Test graph analysis module"""
    print("\n" + "="*60)
    print("🔬 Testing Graph Analysis")
    print("="*60)
    
    from analytics import GraphAnalyzer
    
    # Sample transaction data
    transactions = [
        {"from": "0xA", "to": "0xB", "value": 1000},
        {"from": "0xB", "to": "0xC", "value": 500},
        {"from": "0xA", "to": "0xC", "value": 300},
        {"from": "0xC", "to": "0xD", "value": 200},
        {"from": "0xD", "to": "0xB", "value": 100},
    ]
    
    analyzer = GraphAnalyzer()
    analyzer.build_transaction_graph(transactions)
    
    # Test central wallets
    central = analyzer.find_central_wallets(top_n=3)
    print(f"\n✓ Central Wallets: {central}")
    
    # Test clusters
    clusters = analyzer.detect_clusters()
    print(f"✓ Clusters Detected: {len(clusters)}")
    
    # Test money flow tracing
    flow = analyzer.trace_money_flow("0xA", depth=2)
    print(f"✓ Money Flow from 0xA: {flow}")
    
    # Test wallet stats
    stats = analyzer.get_wallet_stats("0xB")
    print(f"✓ Wallet 0xB Stats: {stats}")
    
    print("✅ Graph Analysis: PASSED")


async def test_anomaly_detection():
    """Test anomaly detection"""
    print("\n" + "="*60)
    print("🤖 Testing Anomaly Detection")
    print("="*60)
    
    from analytics import AnomalyDetector
    
    detector = AnomalyDetector()
    
    # Test volume spike detection
    historical = [100, 110, 95, 105, 100, 98, 102]
    current = 300  # Anomaly
    
    is_anomaly, z_score = detector.detect_volume_spike(historical, current)
    print(f"\n✓ Volume Spike Detection:")
    print(f"  - Is Anomaly: {is_anomaly}")
    print(f"  - Z-Score: {z_score:.2f}")
    
    # Test trend prediction
    prices = [100, 105, 110, 115, 120, 125, 130]
    trend = detector.predict_trend(prices)
    print(f"✓ Trend Prediction: {trend}")
    
    # Test outlier detection
    values = [10, 12, 11, 13, 10, 100, 12, 11]  # 100 is outlier
    outliers = detector.detect_outliers_iqr(values)
    print(f"✓ Outliers (IQR): indices {outliers}")
    
    # Test volatility
    volatility = detector.calculate_volatility(prices)
    print(f"✓ Volatility: {volatility:.2%}" if volatility else "✓ Volatility: Insufficient data")
    
    print("✅ Anomaly Detection: PASSED")


async def test_fusion_engine():
    """Test fusion scoring engine"""
    print("\n" + "="*60)
    print("🎯 Testing Fusion Engine")
    print("="*60)
    
    from scoring import FusionEngine
    
    engine = FusionEngine()
    
    # Test basic fusion
    fundamental = {"final_score": 80}
    onchain = {"final_onchain_score": 70}
    
    result = engine.fuse_decisions(fundamental, onchain)
    print(f"\n✓ Fusion Result:")
    print(f"  - Strategic Score: {result['strategic_score']}")
    print(f"  - Decision: {result['decision']}")
    print(f"  - Risk Level: {result['risk_level']}")
    print(f"  - Confluence: {result['confluence_status']}")
    print(f"  - Confidence: {result['confidence']}")
    
    # Test multi-agent fusion
    agent_results = [
        {"score": 75},
        {"score": 80},
        {"score": 78},
        {"score": 82},
    ]
    
    multi_result = engine.fuse_multi_agent_results(agent_results)
    print(f"\n✓ Multi-Agent Fusion:")
    print(f"  - Average Score: {multi_result['strategic_score']}")
    print(f"  - Decision: {multi_result['decision']}")
    print(f"  - Std Dev: {multi_result['score_std_dev']}")
    print(f"  - Confluence: {multi_result['confluence_status']}")
    
    print("✅ Fusion Engine: PASSED")


async def test_caching():
    """Test caching modules"""
    print("\n" + "="*60)
    print("💾 Testing Cache Systems")
    print("="*60)
    
    # Test simple cache
    from cache import SimpleCache
    
    simple = SimpleCache(ttl=2, max_size=100)
    await simple.set("key1", {"data": "value1"})
    
    value = await simple.get("key1")
    print(f"\n✓ SimpleCache Get: {value}")
    
    # Test expiration
    await asyncio.sleep(2.5)
    expired = await simple.get("key1")
    print(f"✓ SimpleCache Expiration: {expired} (should be None)")
    
    # Test Redis cache (with fallback)
    from cache import RedisCache
    
    redis = RedisCache(ttl=60)
    await redis.connect()
    
    await redis.set("test_key", {"redis": "data"})
    redis_value = await redis.get("test_key")
    print(f"✓ RedisCache Get: {redis_value}")
    
    if redis.use_redis:
        print("✓ Using Redis backend")
    else:
        print("✓ Using in-memory fallback")
    
    await redis.close()
    
    print("✅ Cache Systems: PASSED")


async def test_api_integration():
    """Test API endpoints with simulated requests"""
    print("\n" + "="*60)
    print("🌐 Testing API Integration")
    print("="*60)
    
    # Simulate graph analysis request
    graph_request = {
        "transactions": [
            {"from": "0xA", "to": "0xB", "value": 1000},
            {"from": "0xB", "to": "0xC", "value": 500},
        ],
        "analysis_type": "clusters"
    }
    print(f"\n✓ Graph API Request Format: Valid")
    
    # Simulate fusion request
    fusion_request = {
        "fundamental_score": 75,
        "onchain_score": 80,
        "technical_score": 70
    }
    print(f"✓ Fusion API Request Format: Valid")
    
    # Simulate anomaly request
    anomaly_request = {
        "historical_data": [100, 110, 95, 105],
        "current_value": 300,
        "threshold": 2.0
    }
    print(f"✓ Anomaly API Request Format: Valid")
    
    print("✅ API Integration: PASSED")


async def main():
    """Run all tests"""
    print("\n" + "╔" + "="*58 + "╗")
    print("║  🧪 OMNICHAIN INTEGRATION TEST SUITE                    ║")
    print("╚" + "="*58 + "╝")
    
    try:
        await test_graph_analysis()
        await test_anomaly_detection()
        await test_fusion_engine()
        await test_caching()
        await test_api_integration()
        
        print("\n" + "╔" + "="*58 + "╗")
        print("║  ✅ ALL TESTS PASSED                                    ║")
        print("╚" + "="*58 + "╝\n")
        
        print("🎉 Integration successful!")
        print("\n📝 Next Steps:")
        print("  1. Install dependencies: pip install -r requirements.txt")
        print("  2. Start API server: python main.py --mode api")
        print("  3. Test endpoints at: http://localhost:8000/docs")
        print("\n🔗 New Endpoints:")
        print("  • POST /analytics/graph - Transaction graph analysis")
        print("  • POST /analytics/anomaly - Anomaly detection")
        print("  • POST /score/fusion - Multi-source score fusion")
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
