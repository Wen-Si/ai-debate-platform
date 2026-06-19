"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Volume2, VolumeX, Pause, Play, Settings } from "lucide-react";
import { loadVoices, getVoiceConfig, speak, stopSpeaking, pauseSpeaking, resumeSpeaking } from "@/app/lib/tts";

interface VoiceControlsProps {
  ttsEnabled: boolean;
  onTtsEnabledChange: (enabled: boolean) => void;
  voiceRate: number;
  onVoiceRateChange: (rate: number) => void;
}

export default function VoiceControls({
  ttsEnabled,
  onTtsEnabledChange,
  voiceRate,
  onVoiceRateChange,
}: VoiceControlsProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // 预加载语音
    loadVoices().then(() => {
      setVoicesReady(true);
    });
  }, []);

  const handleTogglePause = () => {
    if (isPaused) {
      resumeSpeaking();
      setIsPaused(false);
    } else {
      pauseSpeaking();
      setIsPaused(true);
    }
  };

  const handleTestVoice = async () => {
    const config = getVoiceConfig("pro", 1);
    config.rate = voiceRate;
    await speak("各位观众大家好，我是正方一辩，今天我们来探讨这个话题。", config);
  };

  return (
    <div className="flex items-center gap-2">
      {/* 主开关 */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onTtsEnabledChange(!ttsEnabled)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          ttsEnabled
            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg"
            : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600"
        }`}
        title={ttsEnabled ? "语音播报已开启" : "语音播报已关闭"}
      >
        {ttsEnabled ? (
          <Volume2 className="w-4 h-4" />
        ) : (
          <VolumeX className="w-4 h-4" />
        )}
        <span>语音播报</span>
      </motion.button>

      {/* 暂停/恢复 */}
      {ttsEnabled && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleTogglePause}
          className="p-2 bg-slate-800 text-slate-300 rounded-full border border-slate-700 hover:border-slate-600"
          title={isPaused ? "恢复" : "暂停"}
        >
          {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </motion.button>
      )}

      {/* 停止 */}
      {ttsEnabled && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            stopSpeaking();
            setIsPaused(false);
          }}
          className="p-2 bg-slate-800 text-slate-300 rounded-full border border-slate-700 hover:border-red-500/50"
          title="停止播报"
        >
          <VolumeX className="w-4 h-4" />
        </motion.button>
      )}

      {/* 设置 */}
      {ttsEnabled && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 bg-slate-800 text-slate-300 rounded-full border border-slate-700 hover:border-slate-600"
          title="语音设置"
        >
          <Settings className="w-4 h-4" />
        </motion.button>
      )}

      {/* 设置面板 */}
      {showSettings && ttsEnabled && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full mt-2 right-0 z-50 bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-2xl w-64"
        >
          <h4 className="text-sm font-bold text-slate-200 mb-3">语音设置</h4>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                语速: {voiceRate.toFixed(1)}x
              </label>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={voiceRate}
                onChange={(e) => onVoiceRateChange(parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <button
              onClick={handleTestVoice}
              disabled={!voicesReady}
              className="w-full py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs rounded-lg hover:bg-amber-500/20 disabled:opacity-50"
            >
              测试语音
            </button>

            <div className="text-xs text-slate-500 pt-2 border-t border-slate-800">
              <p className="mb-1">辩手声音配置：</p>
              <ul className="space-y-1">
                <li>• 正方：男声，激昂有力</li>
                <li>• 反方：女声，理性思辨</li>
                <li>• 三辩音调最高（一辩最低）</li>
              </ul>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}