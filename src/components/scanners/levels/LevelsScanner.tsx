'use client';
import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import LevelsGrid from './LevelsGrid';
import { LevelResult } from '@/lib/scanners/levels-detector';

const LevelsScanner: React.FC = () => {
  const [results, setResults] = useState<LevelResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/data/levels_results.json');
      if (!response.ok) {
        throw new Error('Failed to fetch levels data');
      }
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Price Action Levels Scanner
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Automated detection of key support and resistance levels
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {loading && results.length === 0 ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <LevelsGrid results={results} favorites={new Set<string>()} onToggleFavorite={function (id: string): void {
            throw new Error('Function not implemented.');
          } } onExpand={function (result: LevelResult): void {
            throw new Error('Function not implemented.');
          } } isScanning={false} />
      )}
    </div>
  );
};

export default LevelsScanner;
