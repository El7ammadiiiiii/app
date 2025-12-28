"""
ML Models - Anomaly Detection
==============================
Machine learning models for detecting unusual blockchain activity.
"""

import numpy as np
from typing import List, Tuple, Optional
import logging

logger = logging.getLogger(__name__)


class AnomalyDetector:
    """
    Anomaly detection using statistical methods and simple ML.
    
    Detects:
    1. Sudden volume spikes (Pump/Dump preparation)
    2. Abnormal network activity
    3. Unusual transaction patterns
    """
    
    def __init__(self):
        logger.info("AnomalyDetector initialized")

    def detect_volume_spike(
        self, 
        historical_volumes: List[float], 
        current_volume: float, 
        threshold_sigma: float = 2.0
    ) -> Tuple[bool, float]:
        """
        Detect sudden volume spike using Z-Score.
        If current value is more than N standard deviations from mean, it's anomalous.
        
        Args:
            historical_volumes: List of historical volume values
            current_volume: Current volume to check
            threshold_sigma: Number of standard deviations for anomaly threshold
            
        Returns:
            Tuple of (is_anomaly: bool, z_score: float)
        """
        if not historical_volumes:
            logger.warning("No historical data provided")
            return False, 0.0

        try:
            data = np.array(historical_volumes)
            mean = np.mean(data)
            std = np.std(data)
            
            if std == 0:
                logger.warning("Standard deviation is 0, cannot calculate Z-score")
                return False, 0.0
                
            z_score = (current_volume - mean) / std
            is_anomaly = abs(z_score) > threshold_sigma
            
            if is_anomaly:
                logger.info(f"Volume anomaly detected: z_score={z_score:.2f}, threshold={threshold_sigma}")
            
            return is_anomaly, float(z_score)
            
        except Exception as e:
            logger.error(f"Error detecting volume spike: {e}")
            return False, 0.0

    def predict_trend(self, prices: List[float]) -> str:
        """
        Simple trend prediction using linear regression.
        
        Args:
            prices: List of historical prices
            
        Returns:
            Trend description: "Strong Uptrend", "Weak Uptrend", etc.
        """
        if len(prices) < 5:
            logger.warning("Insufficient data for trend prediction (need at least 5 points)")
            return "Insufficient Data"
            
        try:
            x = np.arange(len(prices))
            y = np.array(prices)
            
            # Calculate slope using polyfit (degree 1 = linear)
            slope, _ = np.polyfit(x, y, 1)
            
            # Classify trend based on slope
            if slope > 0.5:
                trend = "Strong Uptrend"
            elif slope > 0:
                trend = "Weak Uptrend"
            elif slope < -0.5:
                trend = "Strong Downtrend"
            else:
                trend = "Weak Downtrend"
                
            logger.info(f"Trend prediction: {trend} (slope={slope:.4f})")
            return trend
            
        except Exception as e:
            logger.error(f"Error predicting trend: {e}")
            return "Error"

    def detect_outliers_iqr(self, values: List[float]) -> List[int]:
        """
        Detect outliers using Interquartile Range (IQR) method.
        
        Args:
            values: List of numerical values
            
        Returns:
            List of indices of outlier values
        """
        if len(values) < 4:
            logger.warning("Insufficient data for IQR method (need at least 4 points)")
            return []
            
        try:
            data = np.array(values)
            q1 = np.percentile(data, 25)
            q3 = np.percentile(data, 75)
            iqr = q3 - q1
            
            lower_bound = q1 - (1.5 * iqr)
            upper_bound = q3 + (1.5 * iqr)
            
            outliers = [i for i, v in enumerate(values) 
                       if v < lower_bound or v > upper_bound]
            
            if outliers:
                logger.info(f"Detected {len(outliers)} outliers using IQR method")
            
            return outliers
            
        except Exception as e:
            logger.error(f"Error detecting outliers: {e}")
            return []

    def calculate_volatility(self, prices: List[float], window: int = 14) -> Optional[float]:
        """
        Calculate price volatility (standard deviation of returns).
        
        Args:
            prices: List of historical prices
            window: Rolling window size
            
        Returns:
            Volatility value (annualized if daily prices)
        """
        if len(prices) < window + 1:
            logger.warning(f"Insufficient data for volatility calculation (need at least {window+1} points)")
            return None
            
        try:
            # Calculate returns
            returns = np.diff(prices) / prices[:-1]
            
            # Calculate rolling standard deviation
            if len(returns) >= window:
                volatility = np.std(returns[-window:])
                # Annualize (assuming daily data)
                annualized_vol = volatility * np.sqrt(365)
                logger.info(f"Volatility: {annualized_vol:.2%}")
                return float(annualized_vol)
            else:
                return None
                
        except Exception as e:
            logger.error(f"Error calculating volatility: {e}")
            return None
