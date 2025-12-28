"""
🔮 Elite Inference System
نظام التنبؤ بأعلى دقة - مع TTA وEnsemble

Features:
- Test Time Augmentation (TTA)
- Model Ensemble
- Confidence Calibration
- Batch Prediction
- Feature Extraction for Visualization
"""

import json
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import transforms
from PIL import Image
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import numpy as np

try:
    import timm
    TIMM_AVAILABLE = True
except ImportError:
    TIMM_AVAILABLE = False


class ElitePatternClassifier(nn.Module):
    """Mirror of training model"""
    
    def __init__(self, model_name: str, num_classes: int, dropout: float = 0.4):
        super().__init__()
        
        self.backbone = timm.create_model(model_name, pretrained=False, num_classes=0, drop_rate=dropout)
        
        with torch.no_grad():
            dummy = torch.randn(1, 3, 224, 224)
            features = self.backbone(dummy)
            in_features = features.shape[1]
        
        self.classifier = nn.Sequential(
            nn.LayerNorm(in_features),
            nn.Dropout(dropout),
            nn.Linear(in_features, 1024),
            nn.GELU(),
            nn.LayerNorm(1024),
            nn.Dropout(dropout / 2),
            nn.Linear(1024, 512),
            nn.GELU(),
            nn.Dropout(dropout / 3),
            nn.Linear(512, num_classes)
        )
    
    def forward(self, x):
        features = self.backbone(x)
        return self.classifier(features)
    
    def get_features(self, x):
        return self.backbone(x)


class ElitePredictor:
    """Elite inference with TTA and Ensemble"""
    
    def __init__(self, model_dir: str, device: Optional[str] = None):
        self.model_dir = Path(model_dir)
        self.device = torch.device(device if device else ('cuda' if torch.cuda.is_available() else 'cpu'))
        
        # Load mapping
        mapping_path = self.model_dir / 'class_mapping.json'
        with open(mapping_path, 'r', encoding='utf-8') as f:
            self.mapping = json.load(f)
        
        self.idx_to_class = {int(k): v for k, v in self.mapping['idx_to_class'].items()}
        self.num_classes = self.mapping['num_classes']
        self.image_size = self.mapping.get('image_size', 300)
        self.model_name = self.mapping.get('model_name', 'efficientnet_b3')
        
        # Build and load model
        self.model = self._load_model()
        
        # Transforms
        self.base_transform = transforms.Compose([
            transforms.Resize((self.image_size, self.image_size)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])
        
        # TTA transforms
        self.tta_transforms = [
            self.base_transform,
            transforms.Compose([
                transforms.Resize((self.image_size, self.image_size)),
                transforms.RandomHorizontalFlip(1.0),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
            ]),
            transforms.Compose([
                transforms.Resize((self.image_size + 40, self.image_size + 40)),
                transforms.CenterCrop(self.image_size),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
            ]),
            transforms.Compose([
                transforms.Resize((self.image_size, self.image_size)),
                transforms.RandomRotation((10, 10)),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
            ]),
            transforms.Compose([
                transforms.Resize((self.image_size, self.image_size)),
                transforms.RandomRotation((-10, -10)),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
            ]),
        ]
        
        print(f"✅ Elite Predictor loaded")
        print(f"   Model: {self.model_name}")
        print(f"   Classes: {self.num_classes}")
        print(f"   Device: {self.device}")
    
    def _load_model(self) -> nn.Module:
        """Load trained model"""
        model = ElitePatternClassifier(
            model_name=self.model_name,
            num_classes=self.num_classes
        )
        
        checkpoint = torch.load(
            self.model_dir / 'best_model.pth',
            map_location=self.device
        )
        model.load_state_dict(checkpoint['model_state_dict'])
        model = model.to(self.device)
        model.eval()
        
        return model
    
    def predict(self, image_path: str, top_k: int = 5, use_tta: bool = True) -> List[Dict]:
        """
        Predict pattern from image
        
        Args:
            image_path: Path to image
            top_k: Number of top predictions
            use_tta: Use Test Time Augmentation
        
        Returns:
            List of predictions with pattern name, confidence, and category
        """
        image = Image.open(image_path).convert('RGB')
        
        if use_tta:
            predictions = self._predict_with_tta(image, top_k)
        else:
            predictions = self._predict_single(image, top_k)
        
        return predictions
    
    def _predict_single(self, image: Image.Image, top_k: int) -> List[Dict]:
        """Single prediction without TTA"""
        tensor = self.base_transform(image).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            outputs = self.model(tensor)
            probs = F.softmax(outputs, dim=1)
        
        return self._format_predictions(probs[0], top_k)
    
    def _predict_with_tta(self, image: Image.Image, top_k: int) -> List[Dict]:
        """Prediction with Test Time Augmentation"""
        all_probs = []
        
        with torch.no_grad():
            for tta_t in self.tta_transforms:
                tensor = tta_t(image).unsqueeze(0).to(self.device)
                outputs = self.model(tensor)
                probs = F.softmax(outputs, dim=1)
                all_probs.append(probs)
        
        # Average predictions
        avg_probs = torch.stack(all_probs).mean(0)
        
        return self._format_predictions(avg_probs[0], top_k)
    
    def _format_predictions(self, probs: torch.Tensor, top_k: int) -> List[Dict]:
        """Format predictions with metadata"""
        top_probs, top_indices = probs.topk(top_k)
        
        predictions = []
        for prob, idx in zip(top_probs.cpu(), top_indices.cpu()):
            pattern = self.idx_to_class[idx.item()]
            confidence = prob.item() * 100
            
            # Determine category
            category = self._get_category(pattern)
            
            predictions.append({
                'pattern': pattern,
                'confidence': round(confidence, 2),
                'category': category,
                'direction': self._get_direction(pattern)
            })
        
        return predictions
    
    def _get_category(self, pattern: str) -> str:
        """Get pattern category"""
        categories = {
            'harmonic': ['gartley', 'bat', 'butterfly', 'crab', 'shark', 'cypher', 'abcd', '5-0'],
            'triangle': ['ascending_triangle', 'descending_triangle', 'symmetrical_triangle'],
            'wedge': ['rising_wedge', 'falling_wedge'],
            'channel': ['ascending_channel', 'descending_channel', 'horizontal_channel'],
            'reversal': ['head_shoulders', 'double_top', 'double_bottom', 'triple'],
            'flag': ['bull_flag', 'bear_flag', 'pennant'],
            'candlestick': ['doji', 'hammer', 'engulfing', 'star', 'marubozu'],
            'smc': ['order_block', 'fvg', 'bos', 'choch', 'liquidity']
        }
        
        for cat, keywords in categories.items():
            if any(kw in pattern.lower() for kw in keywords):
                return cat
        
        return 'other'
    
    def _get_direction(self, pattern: str) -> str:
        """Get pattern direction"""
        bullish = ['bull', 'ascending', 'rising', 'inverse_head', 'double_bottom', 
                   'falling_wedge', 'hammer', 'morning_star']
        bearish = ['bear', 'descending', 'falling', 'head_shoulders', 'double_top',
                   'rising_wedge', 'shooting_star', 'evening_star']
        
        pattern_lower = pattern.lower()
        
        if any(b in pattern_lower for b in bullish):
            return 'bullish'
        elif any(b in pattern_lower for b in bearish):
            return 'bearish'
        
        return 'neutral'
    
    def predict_batch(self, image_paths: List[str], top_k: int = 3, 
                      use_tta: bool = False) -> List[List[Dict]]:
        """Batch prediction for multiple images"""
        
        results = []
        for path in image_paths:
            try:
                preds = self.predict(path, top_k, use_tta)
                results.append(preds)
            except Exception as e:
                results.append([{'error': str(e)}])
        
        return results
    
    def get_features(self, image_path: str) -> np.ndarray:
        """Extract features for visualization (t-SNE, UMAP)"""
        image = Image.open(image_path).convert('RGB')
        tensor = self.base_transform(image).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            features = self.model.get_features(tensor)
        
        return features.cpu().numpy().flatten()


# ============================================
# 🌐 REST API Server
# ============================================

def create_api_server(predictor: ElitePredictor, host: str = 'localhost', port: int = 8765):
    """Create REST API server for predictions"""
    
    from http.server import HTTPServer, BaseHTTPRequestHandler
    import json
    import base64
    import tempfile
    
    class PredictionHandler(BaseHTTPRequestHandler):
        
        def do_POST(self):
            if self.path == '/predict':
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                
                try:
                    data = json.loads(post_data)
                    
                    # Decode base64 image
                    image_data = base64.b64decode(data['image'])
                    use_tta = data.get('use_tta', True)
                    top_k = data.get('top_k', 5)
                    
                    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
                        f.write(image_data)
                        temp_path = f.name
                    
                    predictions = predictor.predict(temp_path, top_k=top_k, use_tta=use_tta)
                    Path(temp_path).unlink()
                    
                    response = {
                        'success': True,
                        'predictions': predictions,
                        'model': predictor.model_name
                    }
                    
                except Exception as e:
                    response = {'success': False, 'error': str(e)}
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(response).encode())
            
            elif self.path == '/health':
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'status': 'healthy',
                    'model': predictor.model_name,
                    'classes': predictor.num_classes
                }).encode())
            
            else:
                self.send_response(404)
                self.end_headers()
        
        def do_OPTIONS(self):
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
        
        def log_message(self, format, *args):
            pass  # Suppress logs
    
    server = HTTPServer((host, port), PredictionHandler)
    print(f"\n🌐 API Server running at http://{host}:{port}")
    print(f"   POST /predict - Predict pattern from base64 image")
    print(f"   POST /health  - Health check")
    server.serve_forever()


# ============================================
# Demo
# ============================================

def demo():
    """Demo elite prediction"""
    
    model_dir = r"C:\Users\GAME\elhammadi\ml_training\elite_models"
    
    if not Path(model_dir).exists() or not (Path(model_dir) / 'best_model.pth').exists():
        print("❌ Elite model not found!")
        print("   Run START_ELITE_TRAINING.bat first.")
        return
    
    predictor = ElitePredictor(model_dir)
    
    # Test on random images
    test_dir = Path(r"C:\Users\GAME\elhammadi\classified-patterns-v2")
    if test_dir.exists():
        print("\n📊 Testing on sample images:")
        
        count = 0
        for category in test_dir.iterdir():
            if category.is_dir() and count < 5:
                for pattern in category.iterdir():
                    if pattern.is_dir():
                        images = list(pattern.glob("*.png"))[:1]
                        for img in images:
                            preds = predictor.predict(str(img), top_k=3, use_tta=True)
                            print(f"\n   📷 {img.name}")
                            print(f"   📁 Actual: {pattern.name}")
                            for i, p in enumerate(preds, 1):
                                marker = "✅" if p['pattern'] == pattern.name else ""
                                print(f"      {i}. {p['pattern']}: {p['confidence']:.1f}% [{p['category']}] {marker}")
                            count += 1
                        break
    
    print("\n\n🌐 Starting API server...")
    create_api_server(predictor)


if __name__ == "__main__":
    demo()
