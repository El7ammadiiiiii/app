"""
Fusion Engine - Strategic Decision Fusion
==========================================
Combines multiple analysis sources into unified investment decisions.
"""

from typing import Dict, Any, Optional, List
import logging

logger = logging.getLogger(__name__)


class FusionEngine:
    """
    Strategic Decision Fusion Engine.
    
    Combines different analysis types:
    - Fundamental Analysis (quality/long-term)
    - On-chain Analysis (timing/momentum)
    - Technical Analysis (price action)
    
    Into a unified decision with risk assessment.
    """
    
    def __init__(self, custom_weights: Optional[Dict[str, float]] = None):
        """
        Initialize fusion engine with analysis weights.
        
        Args:
            custom_weights: Custom weights for different analysis types.
                          If None, uses default weights.
        """
        # Default strategic weights
        # Fundamental determines "WHAT to buy" (quality)
        # On-chain determines "WHEN to buy" (timing/momentum)
        self.weights = custom_weights or {
            "fundamental": 0.60,  # 60% for fundamentals (long-term investment)
            "onchain": 0.40       # 40% for current data
        }
        
        # Validate weights sum to 1.0
        total = sum(self.weights.values())
        if abs(total - 1.0) > 0.01:
            logger.warning(f"Weights sum to {total}, normalizing to 1.0")
            self.weights = {k: v/total for k, v in self.weights.items()}
        
        logger.info(f"FusionEngine initialized with weights: {self.weights}")

    def fuse_decisions(
        self, 
        fundamental_result: Optional[Dict[str, Any]] = None,
        onchain_result: Optional[Dict[str, Any]] = None,
        technical_result: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Fuse analysis results into unified decision.
        
        Args:
            fundamental_result: Fundamental analysis result with 'final_score' (0-100)
            onchain_result: On-chain analysis result with 'final_onchain_score' (0-100)
            technical_result: Technical analysis result with 'score' (0-100)
            
        Returns:
            Dictionary with:
                - strategic_score: Weighted final score (0-100)
                - decision: BUY/SELL/HOLD recommendation
                - risk_level: LOW/MODERATE/HIGH
                - confluence_status: ALIGNED/DIVERGENT
                - components: Individual scores
                - weights_used: Weights applied
        """
        try:
            # Extract scores with defaults
            fund_score = fundamental_result.get("final_score", 50) if fundamental_result else 50
            chain_score = onchain_result.get("final_onchain_score", 50) if onchain_result else 50
            tech_score = technical_result.get("score", 50) if technical_result else 50
            
            # Calculate weighted final score
            final_score = (
                (fund_score * self.weights.get("fundamental", 0)) +
                (chain_score * self.weights.get("onchain", 0)) +
                (tech_score * self.weights.get("technical", 0))
            )
            
            # Determine decision
            decision = self._calculate_decision(final_score, fund_score)
            
            # Assess risk
            risk_assessment = self._assess_risk(final_score, fund_score)
            
            # Analyze confluence (agreement between sources)
            confluence = self._analyze_confluence(fund_score, chain_score, tech_score)
            
            result = {
                "strategic_score": round(final_score, 2),
                "decision": decision,
                "risk_level": risk_assessment,
                "confluence_status": confluence,
                "components": {
                    "fundamental_score": fund_score,
                    "onchain_score": chain_score,
                    "technical_score": tech_score
                },
                "weights_used": self.weights,
                "confidence": self._calculate_confidence(confluence, final_score)
            }
            
            logger.info(f"Fusion result: {decision} (score={final_score:.1f}, confluence={confluence})")
            return result
            
        except Exception as e:
            logger.error(f"Error in fusion engine: {e}")
            return {
                "strategic_score": 50,
                "decision": "ERROR",
                "error": str(e),
                "risk_level": "HIGH"
            }

    def _calculate_decision(self, score: float, fundamental_score: float) -> str:
        """Calculate buy/sell/hold decision based on score."""
        if score >= 80:
            return "STRONG_BUY"
        elif score >= 65:
            return "BUY"
        elif score >= 45:
            return "HOLD"
        elif score >= 30:
            return "SELL"
        else:
            return "STRONG_SELL"

    def _assess_risk(self, score: float, fundamental_score: float) -> str:
        """Assess risk level."""
        # Strong fundamentals reduce risk
        if score >= 70 and fundamental_score > 65:
            return "LOW"
        elif score >= 50 and fundamental_score > 50:
            return "MODERATE"
        elif score < 40 or fundamental_score < 35:
            return "HIGH"
        else:
            return "MODERATE"

    def _analyze_confluence(
        self, 
        fund_score: float, 
        chain_score: float, 
        tech_score: Optional[float] = None
    ) -> str:
        """
        Analyze confluence between different analysis sources.
        
        Returns:
            STRONG_ALIGNED: All sources agree strongly
            ALIGNED: Sources generally agree
            MIXED: Some disagreement
            DIVERGENT: Significant disagreement
        """
        scores = [s for s in [fund_score, chain_score, tech_score] if s is not None]
        
        if len(scores) < 2:
            return "INSUFFICIENT_DATA"
        
        max_diff = max(scores) - min(scores)
        
        if max_diff < 15:
            return "STRONG_ALIGNED"
        elif max_diff < 25:
            return "ALIGNED"
        elif max_diff < 40:
            return "MIXED"
        else:
            return "DIVERGENT"

    def _calculate_confidence(self, confluence: str, score: float) -> str:
        """Calculate confidence level in the decision."""
        if confluence in ["STRONG_ALIGNED", "ALIGNED"]:
            if score > 70 or score < 30:  # Extreme scores with alignment
                return "HIGH"
            else:
                return "MODERATE"
        elif confluence == "MIXED":
            return "MODERATE"
        else:  # DIVERGENT
            return "LOW"

    def fuse_multi_agent_results(self, agent_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Fuse results from multiple omnichain agents.
        
        Args:
            agent_results: List of agent analysis results
            
        Returns:
            Unified fusion result
        """
        if not agent_results:
            logger.warning("No agent results provided")
            return {"error": "No results to fuse", "decision": "HOLD"}
        
        try:
            # Extract scores from each agent
            scores = []
            for result in agent_results:
                # Try different score field names
                score = (
                    result.get("score") or 
                    result.get("final_score") or 
                    result.get("confidence", 50)
                )
                scores.append(score)
            
            # Calculate average score
            avg_score = sum(scores) / len(scores)
            
            # Calculate standard deviation for confidence
            std_dev = (sum((s - avg_score) ** 2 for s in scores) / len(scores)) ** 0.5
            
            # Low std_dev = high agreement = high confidence
            if std_dev < 10:
                confluence = "STRONG_ALIGNED"
            elif std_dev < 20:
                confluence = "ALIGNED"
            elif std_dev < 30:
                confluence = "MIXED"
            else:
                confluence = "DIVERGENT"
            
            decision = self._calculate_decision(avg_score, avg_score)
            risk = self._assess_risk(avg_score, avg_score)
            
            return {
                "strategic_score": round(avg_score, 2),
                "decision": decision,
                "risk_level": risk,
                "confluence_status": confluence,
                "agent_scores": scores,
                "score_std_dev": round(std_dev, 2),
                "num_agents": len(agent_results),
                "confidence": self._calculate_confidence(confluence, avg_score)
            }
            
        except Exception as e:
            logger.error(f"Error fusing multi-agent results: {e}")
            return {"error": str(e), "decision": "HOLD", "risk_level": "HIGH"}

    def update_weights(self, new_weights: Dict[str, float]) -> None:
        """
        Update fusion weights.
        
        Args:
            new_weights: New weight configuration
        """
        total = sum(new_weights.values())
        if abs(total - 1.0) > 0.01:
            logger.warning(f"New weights sum to {total}, normalizing")
            new_weights = {k: v/total for k, v in new_weights.items()}
        
        self.weights = new_weights
        logger.info(f"Updated weights: {self.weights}")
