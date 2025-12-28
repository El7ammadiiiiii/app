"use client";

import { motion } from "framer-motion";
import { Shapes } from "lucide-react";
import PatternScanner from "@/components/patterns/PatternScanner";

export default function PatternsPage() {
  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Pattern Scanner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-panel"
      >
        <PatternScanner 
          symbol="BTCUSDT"
          timeframe="1h"
          autoScan={false}
        />
      </motion.div>

    </div>
  );
}
