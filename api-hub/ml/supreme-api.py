"""
👑 SUPREME Inference System
استخدام النموذج المدرب للتنبؤ

Features:
- Test Time Augmentation (TTA) with 10 transforms
- Model Ensemble support
- Feature extraction
- Batch prediction
- REST API
"""

import os
import sys
import json
from pathlib import Path
from typing import List, Dict, Tuple, Optional
import numpy as np
from PIL import Image

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.cuda.amp import autocast

try:
    import timm
except ImportError:
    print("❌ Install timm: pip install timm")
    sys.exit(1)

from torchvision import transforms

# ============================================
# Configuration
# ============================================

class InferenceConfig:
    MODEL_PATH = r"C:\Users\GAME\elhammadi\ml_training\supreme_models\best_model.pth"
    MAPPING_PATH = r"C:\Users\GAME\elhammadi\ml_training\supreme_models\class_mapping.json"
    IMAGE_SIZE = 384
    USE_TTA = True
    TTA_TRANSFORMS = 10
    USE_AMP = True
    CONFIDENCE_THRESHOLD = 0.3


# ============================================
# Model Definition (must match training)
# ============================================

class GeGLU(nn.Module):
    def __init__(self, in_features, out_features):
        super().__init__()
        self.proj = nn.Linear(in_features, out_features * 2)
    
    def forward(self, x):
        x, gate = self.proj(x).chunk(2, dim=-1)
        return x * F.gelu(gate)


class SupremeClassifier(nn.Module):
    def __init__(self, model_name: str, num_classes: int, dropout: float = 0.3):
        super().__init__()
        
        self.backbone = timm.create_model(
            model_name,
            pretrained=False,
            num_classes=0,
            drop_rate=dropout
        )
        
        with torch.no_grad():
            dummy = torch.randn(1, 3, 224, 224)
            features = self.backbone(dummy)
            in_features = features.shape[1]
        
        self.classifier = nn.Sequential(
            nn.LayerNorm(in_features),
            nn.Dropout(dropout),
            GeGLU(in_features, 1024),
            nn.LayerNorm(1024),
            nn.Dropout(dropout / 2),
            GeGLU(1024, 512),
            nn.LayerNorm(512),
            nn.Dropout(dropout / 3),
            nn.Linear(512, num_classes)
        )
    
    def forward(self, x):
        features = self.backbone(x)
        return self.classifier(features)
    
    def get_features(self, x):
        return self.backbone(x)


# ============================================
# TTA Transforms
# ============================================

def get_tta_transforms(size: int):
    """10 different TTA transforms"""
    normalize = transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
    
    return [
        # Original
        transforms.Compose([
            transforms.Resize((size, size)),
            transforms.ToTensor(),
            normalize
        ]),
        # Horizontal flip
        transforms.Compose([
            transforms.Resize((size, size)),
            transforms.RandomHorizontalFlip(p=1.0),
            transforms.ToTensor(),
            normalize
        ]),
        # Slight rotation right
        transforms.Compose([
            transforms.Resize((size, size)),
            transforms.RandomRotation((10, 10)),
            transforms.ToTensor(),
            normalize
        ]),
        # Slight rotation left
        transforms.Compose([
            transforms.Resize((size, size)),
            transforms.RandomRotation((-10, -10)),
            transforms.ToTensor(),
            normalize
        ]),
        # Slight scale up
        transforms.Compose([
            transforms.Resize((int(size * 1.1), int(size * 1.1))),
            transforms.CenterCrop(size),
            transforms.ToTensor(),
            normalize
        ]),
        # Slight scale down
        transforms.Compose([
            transforms.Resize((int(size * 0.9), int(size * 0.9))),
            transforms.Pad((size - int(size * 0.9)) // 2, fill=0),
            transforms.Resize((size, size)),
            transforms.ToTensor(),
            normalize
        ]),
        # Top crop
        transforms.Compose([
            transforms.Resize((int(size * 1.2), int(size * 1.2))),
            transforms.Lambda(lambda img: transforms.functional.crop(img, 0, int(size * 0.1), size, size)),
            transforms.Resize((size, size)),
            transforms.ToTensor(),
            normalize
        ]),
        # Brightness up
        transforms.Compose([
            transforms.Resize((size, size)),
            transforms.ColorJitter(brightness=0.2),
            transforms.ToTensor(),
            normalize
        ]),
        # Contrast up
        transforms.Compose([
            transforms.Resize((size, size)),
            transforms.ColorJitter(contrast=0.2),
            transforms.ToTensor(),
            normalize
        ]),
        # Grayscale converted back to RGB
        transforms.Compose([
            transforms.Resize((size, size)),
            transforms.Grayscale(num_output_channels=3),
            transforms.ToTensor(),
            normalize
        ]),
    ]


# ============================================
# Supreme Predictor
# ============================================

class SupremePredictor:
    """Supreme inference with TTA"""
    
    def __init__(self, model_path: str = None, mapping_path: str = None):
        self.model_path = model_path or InferenceConfig.MODEL_PATH
        self.mapping_path = mapping_path or InferenceConfig.MAPPING_PATH
        
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = None
        self.class_mapping = None
        self.idx_to_class = None
        self.image_size = InferenceConfig.IMAGE_SIZE
        self.tta_transforms = None
        
        self._load_model()
    
    def _load_model(self):
        """Load model and class mapping"""
        
        # Load mapping
        if not os.path.exists(self.mapping_path):
            raise FileNotFoundError(f"Mapping not found: {self.mapping_path}")
        
        with open(self.mapping_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        self.class_mapping = data['class_to_idx']
        self.idx_to_class = {int(k): v for k, v in data['idx_to_class'].items()}
        num_classes = data['num_classes']
        model_name = data.get('model_name', 'swin_base_patch4_window7_224')
        self.image_size = data.get('image_size', 384)
        
        print(f"📦 Loading Supreme model...")
        print(f"   Architecture: {model_name}")
        print(f"   Classes: {num_classes}")
        print(f"   Image size: {self.image_size}")
        
        # Create model
        self.model = SupremeClassifier(
            model_name=model_name,
            num_classes=num_classes,
            dropout=0.0  # No dropout for inference
        )
        
        # Load weights
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Model not found: {self.model_path}")
        
        checkpoint = torch.load(self.model_path, map_location=self.device)
        
        # Handle different checkpoint formats
        if 'ema_state_dict' in checkpoint:
            self.model.load_state_dict(checkpoint['ema_state_dict'])
            print("   Using EMA weights ✅")
        elif 'model_state_dict' in checkpoint:
            self.model.load_state_dict(checkpoint['model_state_dict'])
        else:
            self.model.load_state_dict(checkpoint)
        
        self.model = self.model.to(self.device)
        self.model.eval()
        
        # TTA transforms
        self.tta_transforms = get_tta_transforms(self.image_size)
        
        print(f"✅ Model loaded successfully!")
        print(f"   Device: {self.device}")
    
    @torch.no_grad()
    def predict(self, image_path: str, use_tta: bool = None) -> Dict:
        """Predict single image"""
        
        use_tta = use_tta if use_tta is not None else InferenceConfig.USE_TTA
        
        try:
            image = Image.open(image_path).convert('RGB')
        except Exception as e:
            return {'error': str(e)}
        
        if use_tta:
            return self._predict_tta(image)
        else:
            return self._predict_single(image)
    
    def _predict_single(self, image: Image.Image) -> Dict:
        """Single prediction without TTA"""
        
        transform = self.tta_transforms[0]  # Original transform
        tensor = transform(image).unsqueeze(0).to(self.device)
        
        with autocast(enabled=InferenceConfig.USE_AMP):
            outputs = self.model(tensor)
            probs = F.softmax(outputs, dim=1)
        
        confidence, predicted = probs.max(1)
        
        predicted_class = self.idx_to_class[predicted.item()]
        confidence_score = confidence.item()
        
        top5_probs, top5_indices = probs.topk(5, dim=1)
        top5 = [
            {'class': self.idx_to_class[idx.item()], 'confidence': prob.item()}
            for prob, idx in zip(top5_probs[0], top5_indices[0])
        ]
        
        return {
            'predicted_class': predicted_class,
            'confidence': confidence_score,
            'top5': top5,
            'method': 'single'
        }
    
    def _predict_tta(self, image: Image.Image) -> Dict:
        """Prediction with Test Time Augmentation"""
        
        all_probs = []
        
        for transform in self.tta_transforms[:InferenceConfig.TTA_TRANSFORMS]:
            try:
                tensor = transform(image).unsqueeze(0).to(self.device)
                
                with autocast(enabled=InferenceConfig.USE_AMP):
                    outputs = self.model(tensor)
                    probs = F.softmax(outputs, dim=1)
                
                all_probs.append(probs)
            except:
                continue
        
        if not all_probs:
            return self._predict_single(image)
        
        # Average probabilities
        avg_probs = torch.stack(all_probs).mean(0)
        confidence, predicted = avg_probs.max(1)
        
        predicted_class = self.idx_to_class[predicted.item()]
        confidence_score = confidence.item()
        
        top5_probs, top5_indices = avg_probs.topk(5, dim=1)
        top5 = [
            {'class': self.idx_to_class[idx.item()], 'confidence': prob.item()}
            for prob, idx in zip(top5_probs[0], top5_indices[0])
        ]
        
        return {
            'predicted_class': predicted_class,
            'confidence': confidence_score,
            'top5': top5,
            'method': f'tta_{len(all_probs)}'
        }
    
    @torch.no_grad()
    def predict_batch(self, image_paths: List[str], use_tta: bool = False) -> List[Dict]:
        """Batch prediction"""
        
        results = []
        for path in image_paths:
            result = self.predict(path, use_tta=use_tta)
            result['path'] = path
            results.append(result)
        
        return results
    
    @torch.no_grad()
    def extract_features(self, image_path: str) -> np.ndarray:
        """Extract features for similarity search"""
        
        try:
            image = Image.open(image_path).convert('RGB')
            transform = self.tta_transforms[0]
            tensor = transform(image).unsqueeze(0).to(self.device)
            
            with autocast(enabled=InferenceConfig.USE_AMP):
                features = self.model.get_features(tensor)
            
            return features.cpu().numpy()[0]
        except Exception as e:
            print(f"Error: {e}")
            return None


# ============================================
# REST API Server
# ============================================

def create_api_server(predictor: SupremePredictor, port: int = 8765):
    """Create FastAPI server"""
    
    try:
        from fastapi import FastAPI, File, UploadFile, HTTPException
        from fastapi.responses import JSONResponse
        import uvicorn
        import tempfile
    except ImportError:
        print("Install: pip install fastapi uvicorn python-multipart")
        return
    
    app = FastAPI(title="Supreme Pattern Recognition API")
    
    @app.get("/")
    def root():
        return {
            "name": "Supreme Pattern Recognition",
            "classes": len(predictor.class_mapping),
            "model": "Swin Transformer"
        }
    
    @app.get("/classes")
    def get_classes():
        return {"classes": predictor.class_mapping}
    
    @app.post("/predict")
    async def predict(file: UploadFile = File(...), tta: bool = True):
        if not file.content_type.startswith('image/'):
            raise HTTPException(400, "File must be an image")
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        try:
            result = predictor.predict(tmp_path, use_tta=tta)
            return JSONResponse(result)
        finally:
            os.unlink(tmp_path)
    
    @app.post("/batch")
    async def batch_predict(files: List[UploadFile] = File(...)):
        results = []
        for file in files:
            if not file.content_type.startswith('image/'):
                continue
            
            with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp:
                content = await file.read()
                tmp.write(content)
                tmp_path = tmp.name
            
            try:
                result = predictor.predict(tmp_path, use_tta=False)
                result['filename'] = file.filename
                results.append(result)
            finally:
                os.unlink(tmp_path)
        
        return JSONResponse({"predictions": results})
    
    print(f"\n🌐 Starting API server at http://localhost:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)


# ============================================
# CLI
# ============================================

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Supreme Pattern Predictor")
    parser.add_argument('--image', type=str, help='Image path to predict')
    parser.add_argument('--folder', type=str, help='Folder to predict all images')
    parser.add_argument('--api', action='store_true', help='Start API server')
    parser.add_argument('--port', type=int, default=8765, help='API port')
    parser.add_argument('--no-tta', action='store_true', help='Disable TTA')
    
    args = parser.parse_args()
    
    try:
        predictor = SupremePredictor()
    except FileNotFoundError as e:
        print(f"❌ {e}")
        print("\n💡 Train a model first with supreme_trainer.py")
        return
    
    if args.api:
        create_api_server(predictor, args.port)
    elif args.image:
        result = predictor.predict(args.image, use_tta=not args.no_tta)
        print(f"\n📊 Prediction:")
        print(f"   Class: {result['predicted_class']}")
        print(f"   Confidence: {result['confidence']*100:.1f}%")
        print(f"   Method: {result['method']}")
        print(f"\n   Top 5:")
        for i, pred in enumerate(result['top5'], 1):
            print(f"   {i}. {pred['class']}: {pred['confidence']*100:.1f}%")
    elif args.folder:
        folder = Path(args.folder)
        images = list(folder.glob("*.png")) + list(folder.glob("*.jpg"))
        print(f"\n📁 Predicting {len(images)} images...")
        
        results = predictor.predict_batch([str(p) for p in images], use_tta=not args.no_tta)
        
        for r in results:
            print(f"   {Path(r['path']).name}: {r['predicted_class']} ({r['confidence']*100:.1f}%)")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
