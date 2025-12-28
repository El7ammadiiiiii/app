'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RefreshCw, Download, Upload, CheckCircle, AlertCircle, Zap, Brain } from 'lucide-react';

interface TrainingProgress {
  epoch: number;
  totalEpochs: number;
  trainLoss: number;
  trainAcc: number;
  valLoss: number;
  valAcc: number;
  bestAcc: number;
  status: 'idle' | 'training' | 'paused' | 'complete' | 'error';
}

interface DatasetStats {
  totalImages: number;
  totalClasses: number;
  classDistribution: { [key: string]: number };
  trainSize: number;
  valSize: number;
  testSize: number;
}

export default function MLTrainingInterface() {
  const [progress, setProgress] = useState<TrainingProgress>({
    epoch: 0,
    totalEpochs: 50,
    trainLoss: 0,
    trainAcc: 0,
    valLoss: 0,
    valAcc: 0,
    bestAcc: 0,
    status: 'idle'
  });
  
  const [datasetStats, setDatasetStats] = useState<DatasetStats | null>(null);
  const [lossHistory, setLossHistory] = useState<number[]>([]);
  const [accHistory, setAccHistory] = useState<number[]>([]);
  const [config, setConfig] = useState({
    epochs: 50,
    batchSize: 32,
    learningRate: 0.001,
    modelType: 'resnet50',
    augmentation: true,
    freezeLayers: true
  });
  
  // Simulate scanning dataset
  const scanDataset = useCallback(async () => {
    // This would call your Python backend
    setDatasetStats({
      totalImages: 21261,
      totalClasses: 47,
      classDistribution: {
        symmetrical_triangle: 3420,
        head_shoulders: 2150,
        double_bottom: 1890,
        ascending_triangle: 1650,
        bull_flag: 1420,
        unclear: 2100,
        not_chart: 1800,
        // ... more classes
      },
      trainSize: 15906,
      valSize: 3189,
      testSize: 2166
    });
  }, []);
  
  // Start training simulation
  const startTraining = () => {
    setProgress(p => ({ ...p, status: 'training' }));
    
    // Simulate training progress
    let epoch = 0;
    const interval = setInterval(() => {
      epoch++;
      const trainLoss = 2.5 * Math.exp(-epoch / 15) + 0.3;
      const trainAcc = 95 - 85 * Math.exp(-epoch / 12);
      const valLoss = trainLoss + Math.random() * 0.2;
      const valAcc = trainAcc - Math.random() * 5;
      
      setLossHistory(h => [...h, trainLoss]);
      setAccHistory(h => [...h, trainAcc]);
      
      setProgress(p => ({
        ...p,
        epoch,
        trainLoss: Math.round(trainLoss * 1000) / 1000,
        trainAcc: Math.round(trainAcc * 10) / 10,
        valLoss: Math.round(valLoss * 1000) / 1000,
        valAcc: Math.round(valAcc * 10) / 10,
        bestAcc: Math.max(p.bestAcc, Math.round(valAcc * 10) / 10)
      }));
      
      if (epoch >= config.epochs) {
        clearInterval(interval);
        setProgress(p => ({ ...p, status: 'complete' }));
      }
    }, 500);
  };
  
  useEffect(() => {
    scanDataset();
  }, [scanDataset]);
  
  const progressPercent = (progress.epoch / progress.totalEpochs) * 100;
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Brain className="w-10 h-10 text-purple-500" />
        <div>
          <h1 className="text-3xl font-bold">Pattern Recognition Training</h1>
          <p className="text-gray-400">Train CNN model on classified chart patterns</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dataset Stats */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-500" />
            Dataset Statistics
          </h2>
          
          {datasetStats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700 rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-400">
                    {datasetStats.totalImages.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400">Total Images</div>
                </div>
                <div className="bg-gray-700 rounded-lg p-3">
                  <div className="text-2xl font-bold text-purple-400">
                    {datasetStats.totalClasses}
                  </div>
                  <div className="text-sm text-gray-400">Classes</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Train</span>
                  <span className="text-green-400">{datasetStats.trainSize}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Validation</span>
                  <span className="text-yellow-400">{datasetStats.valSize}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Test</span>
                  <span className="text-blue-400">{datasetStats.testSize}</span>
                </div>
              </div>
              
              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-sm font-medium mb-2">Top Classes</h3>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {Object.entries(datasetStats.classDistribution)
                    .slice(0, 7)
                    .map(([cls, count]) => (
                      <div key={cls} className="flex justify-between text-xs">
                        <span className="text-gray-400">{cls}</span>
                        <span>{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-500" />
            </div>
          )}
        </div>
        
        {/* Training Config */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Training Configuration
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400">Model Architecture</label>
              <select 
                className="w-full bg-gray-700 rounded-lg p-2 mt-1"
                value={config.modelType}
                onChange={e => setConfig({...config, modelType: e.target.value})}
              >
                <option value="resnet18">ResNet-18 (Fast)</option>
                <option value="resnet34">ResNet-34 (Balanced)</option>
                <option value="resnet50">ResNet-50 (Accurate)</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400">Epochs</label>
                <input 
                  type="number"
                  className="w-full bg-gray-700 rounded-lg p-2 mt-1"
                  value={config.epochs}
                  onChange={e => setConfig({...config, epochs: Number(e.target.value)})}
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">Batch Size</label>
                <input 
                  type="number"
                  className="w-full bg-gray-700 rounded-lg p-2 mt-1"
                  value={config.batchSize}
                  onChange={e => setConfig({...config, batchSize: Number(e.target.value)})}
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm text-gray-400">Learning Rate</label>
              <input 
                type="number"
                step="0.0001"
                className="w-full bg-gray-700 rounded-lg p-2 mt-1"
                value={config.learningRate}
                onChange={e => setConfig({...config, learningRate: Number(e.target.value)})}
              />
            </div>
            
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input 
                  type="checkbox"
                  checked={config.augmentation}
                  onChange={e => setConfig({...config, augmentation: e.target.checked})}
                  className="rounded"
                />
                Data Augmentation
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input 
                  type="checkbox"
                  checked={config.freezeLayers}
                  onChange={e => setConfig({...config, freezeLayers: e.target.checked})}
                  className="rounded"
                />
                Freeze Backbone
              </label>
            </div>
          </div>
        </div>
        
        {/* Training Progress */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            {progress.status === 'complete' ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : progress.status === 'error' ? (
              <AlertCircle className="w-5 h-5 text-red-500" />
            ) : (
              <Brain className="w-5 h-5 text-purple-500" />
            )}
            Training Progress
          </h2>
          
          <div className="space-y-4">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Epoch {progress.epoch}/{progress.totalEpochs}</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            
            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="text-lg font-bold text-green-400">
                  {progress.trainAcc}%
                </div>
                <div className="text-xs text-gray-400">Train Accuracy</div>
              </div>
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="text-lg font-bold text-yellow-400">
                  {progress.valAcc}%
                </div>
                <div className="text-xs text-gray-400">Val Accuracy</div>
              </div>
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="text-lg font-bold text-blue-400">
                  {progress.trainLoss}
                </div>
                <div className="text-xs text-gray-400">Train Loss</div>
              </div>
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="text-lg font-bold text-purple-400">
                  {progress.bestAcc}%
                </div>
                <div className="text-xs text-gray-400">Best Accuracy</div>
              </div>
            </div>
            
            {/* Control Buttons */}
            <div className="flex gap-3">
              <button
                onClick={startTraining}
                disabled={progress.status === 'training'}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition ${
                  progress.status === 'training' 
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : 'bg-green-600 hover:bg-green-500'
                }`}
              >
                <Play className="w-5 h-5" />
                Start Training
              </button>
              
              {progress.status === 'complete' && (
                <button className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium bg-blue-600 hover:bg-blue-500 transition">
                  <Download className="w-5 h-5" />
                  Export
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Loss/Accuracy Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Loss Over Time</h3>
          <div className="h-48 flex items-end gap-1">
            {lossHistory.slice(-50).map((loss, i) => (
              <div 
                key={i}
                className="flex-1 bg-red-500 rounded-t opacity-80"
                style={{ height: `${Math.min(loss / 3 * 100, 100)}%` }}
              />
            ))}
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Accuracy Over Time</h3>
          <div className="h-48 flex items-end gap-1">
            {accHistory.slice(-50).map((acc, i) => (
              <div 
                key={i}
                className="flex-1 bg-green-500 rounded-t opacity-80"
                style={{ height: `${acc}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
