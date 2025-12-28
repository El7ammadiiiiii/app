# 🤖 ML Pattern Recognition API

**Version:** 1.0.0  
**Models:** Supreme V7 + Elite 95  
**Framework:** PyTorch + timm

---

## 🎯 Overview

Machine Learning-powered pattern recognition for technical analysis using computer vision.

**Key Features:**
- 🧠 Supreme V7 model (highest accuracy)
- 🎖️ Elite 95 model (3-stage classification)
- 📸 Image-based pattern detection
- ⚡ Batch processing
- 🔥 GPU acceleration

---

## 🚀 Quick Start

### Installation

```bash
cd ml
pip install torch torchvision timm pillow
```

### Download Models

Place trained models in:
- `supreme-v7-model.pth`
- `elite-95-model.pth`

### Run Servers

```bash
# Supreme V7 API
python supreme-api.py --port 8765

# Elite API
python elite-api.py --port 8766
```

---

## 📡 API Endpoints

### Supreme V7 API (Port 8765)

#### 1. Model Info

**GET** `/model/info`

```json
{
  "model": "Supreme V7",
  "version": "1.0.0",
  "classes": 77,
  "accuracy": 0.95,
  "input_size": [224, 224]
}
```

#### 2. Predict from Image

**POST** `/predict/image`

```json
{
  "image": "base64_encoded_image_data"
}
```

**Response:**

```json
{
  "prediction": "Head and Shoulders",
  "confidence": 0.87,
  "probabilities": {
    "Head and Shoulders": 0.87,
    "Double Top": 0.08,
    "Triple Top": 0.03,
    "...": "..."
  },
  "processing_time": 0.12
}
```

#### 3. Batch Prediction

**POST** `/predict/batch`

```json
{
  "images": [
    "base64_image_1",
    "base64_image_2",
    "base64_image_3"
  ]
}
```

**Response:**

```json
{
  "predictions": [
    {
      "image_index": 0,
      "prediction": "Bull Flag",
      "confidence": 0.92
    },
    {
      "image_index": 1,
      "prediction": "Double Bottom",
      "confidence": 0.85
    }
  ],
  "total_time": 0.35,
  "avg_time_per_image": 0.12
}
```

---

### Elite API (Port 8766)

#### 4. Get Classes

**GET** `/classes`

```json
{
  "total": 77,
  "categories": {
    "reversal": 12,
    "continuation": 8,
    "candlestick": 20,
    "harmonic": 5,
    "elliott": 5,
    "wyckoff": 4,
    "supply_demand": 6,
    "volume": 5,
    "market_structure": 4,
    "fibonacci": 4,
    "divergence": 3,
    "custom": 1
  }
}
```

#### 5. Predict Pattern

**POST** `/predict/image`

Same format as Supreme V7.

#### 6. Batch Processing

**POST** `/predict/batch`

Same format as Supreme V7.

---

## 🧠 Models Comparison

| Feature | Supreme V7 | Elite 95 |
|---------|-----------|----------|
| **Accuracy** | 95%+ | 93%+ |
| **Speed** | Fast | Medium |
| **Classes** | 77 | 77 |
| **Approach** | Single-stage | 3-stage |
| **Best For** | Production | High precision |

---

## 💡 Usage Examples

### Example 1: Single Prediction (Python)

```python
import requests
import base64

# Load image
with open('chart.png', 'rb') as f:
    image_b64 = base64.b64encode(f.read()).decode()

# Predict
response = requests.post(
    'http://localhost:8765/predict/image',
    json={'image': image_b64}
)

result = response.json()
print(f"Pattern: {result['prediction']}")
print(f"Confidence: {result['confidence']}")
```

### Example 2: Batch Processing

```python
import os
import base64
import requests

# Load multiple images
images = []
for filename in os.listdir('charts/'):
    if filename.endswith('.png'):
        with open(f'charts/{filename}', 'rb') as f:
            images.append(base64.b64encode(f.read()).decode())

# Batch predict
response = requests.post(
    'http://localhost:8765/predict/batch',
    json={'images': images}
)

for pred in response.json()['predictions']:
    print(f"Image {pred['image_index']}: {pred['prediction']} ({pred['confidence']:.2f})")
```

### Example 3: JavaScript/TypeScript

```typescript
async function predictPattern(imageFile: File) {
  // Convert to base64
  const base64 = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      resolve(base64String.split(',')[1]);
    };
    reader.readAsDataURL(imageFile);
  });

  // Predict
  const response = await fetch('http://localhost:8765/predict/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64 })
  });

  return await response.json();
}

// Usage
const result = await predictPattern(chartImage);
console.log(`Pattern: ${result.prediction}`);
```

---

## 🎨 Supported Patterns (77)

### Reversal (12)
- Head and Shoulders
- Inverse Head and Shoulders
- Double Top / Bottom
- Triple Top / Bottom
- Rising / Falling Wedge
- Rounding Top / Bottom
- Broadening Top / Bottom

### Continuation (8)
- Bull / Bear Flag
- Bull / Bear Pennant
- Triangles (Ascending, Descending, Symmetrical)
- Rectangle

### Candlestick (20)
- Doji, Hammer, Shooting Star
- Engulfing, Harami, Morning/Evening Star
- Three White Soldiers / Black Crows
- And 13 more...

### Harmonic (5)
- Gartley, Butterfly, Bat, Crab, AB=CD

### Elliott Wave (5)
- Impulse, Corrective, Extensions, Diagonals

### Wyckoff (4)
- Accumulation, Distribution, Re-accumulation, Re-distribution

### Supply & Demand (6)
- Support/Resistance, Order Blocks, Fair Value Gaps

### Volume (5)
- Spikes, Divergence, Climax, Confirmations

### Market Structure (4)
- BOS, CHoCH, Higher/Lower Highs/Lows

### Fibonacci (4)
- Retracements, Extensions, Expansions, Time Zones

### Divergence (3)
- RSI, MACD, Volume Divergences

### Custom (1)
- Multi-Pattern Confluence

---

## 🔧 Configuration

### Model Parameters

```python
# supreme-api.py
MODEL_PATH = 'supreme-v7-model.pth'
IMAGE_SIZE = 224
NUM_CLASSES = 77
DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'
```

### GPU Acceleration

```bash
# Check CUDA availability
python -c "import torch; print(torch.cuda.is_available())"

# If True, GPU will be used automatically
```

---

## 📊 Performance

### Supreme V7
- **Single Prediction:** ~0.1s (GPU) / ~0.3s (CPU)
- **Batch (10 images):** ~0.5s (GPU) / ~2s (CPU)
- **Accuracy:** 95%+
- **Memory:** ~500MB

### Elite 95
- **Single Prediction:** ~0.15s (GPU) / ~0.5s (CPU)
- **Batch (10 images):** ~0.8s (GPU) / ~3s (CPU)
- **Accuracy:** 93%+
- **Memory:** ~700MB

---

## 🎯 Training (Optional)

To retrain models:

```bash
# Supreme V7
cd ../../ml_training
python supreme_v7_stable.py

# Elite
python elite_classifier_95.py
```

**Requirements:**
- Dataset of labeled chart images
- GPU recommended (NVIDIA with CUDA)
- ~20GB disk space for checkpoints

---

## 🔒 Security

- Input validation (base64, file size)
- Rate limiting (100 req/min)
- Error handling
- Memory cleanup

---

## 🆘 Troubleshooting

**Issue:** Model file not found  
**Solution:** Download or train model, place in `ml/` directory

**Issue:** CUDA out of memory  
**Solution:** Reduce batch size or use CPU

**Issue:** Low accuracy  
**Solution:** Ensure image is clear chart, correct size (224x224 recommended)

---

## 📚 Integration with Technical API

Combine ML predictions with technical analysis:

```python
# 1. Get live data
live_data = requests.get(
    'http://localhost:8001/live/binance/BTC/USDT/1h'
).json()['data']

# 2. Generate chart image (using matplotlib or TradingView screenshot)
chart_image = generate_chart(live_data)

# 3. ML prediction
ml_result = requests.post(
    'http://localhost:8765/predict/image',
    json={'image': chart_image}
).json()

# 4. Technical analysis
ta_result = requests.post(
    'http://localhost:8001/analyze',
    json={'data': live_data}
).json()

# 5. Combine results
if ml_result['confidence'] > 0.8 and ta_result['trend']['direction'] == 'bullish':
    print("STRONG BUY signal!")
```

---

**Models:** Trained on 100k+ chart images  
**Support:** Create issue in repository  
**Updates:** Check for new model versions
