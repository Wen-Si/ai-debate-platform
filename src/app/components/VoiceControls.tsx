"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Volume2, VolumeX, Pause, Play, Settings, AlertCircle } from "lucide-react";
import {
  loadVoices,
  getVoiceConfig,
  speakNow,
  stopSpeaking,
  pauseSpeaking,
  resumeSpeaking,
  unlockAudio,
} from "@/app/lib/tts";

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
  const [hasSupport, setHasSupport] = useState(true);

  useEffect(() => {
    // 检测浏览器支持
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setHasSupport(false);
      return;
    }
    setHasSupport(true);

    // 预加载语音
    loadVoices().then((voices) => {
      setVoicesReady(voices.length > 0);
    });
  }, []);

  const handleToggleTTS = () => {
    if (!hasSupport) {
      alert("您的浏览器不支持语音播报功能，请使用Chrome、Edge或Safari等现代浏览器。");
      return;
    }

    const newEnabled = !ttsEnabled;
    onTtsEnabledChange(newEnabled);

    if (newEnabled) {
      // 开启时立即解锁音频 + 测试播放
      unlockAudio();
      // 延迟一点播放测试语音，确保voices已加载
      setTimeout(() => {
        const config = getVoiceConfig("pro", 1);
        config.rate = voiceRate;
        speakNow("语音播报已开启", config);
      }, 100);
    } else {
      stopSpeaking();
      setIsPaused(false);
    }
  };

  const handleTogglePause = () => {
    if (isPaused) {
      resumeSpeaking();
      setIsPaused(false);
    } else {
      pauseSpeaking();
      setIsPaused(true);
    }
  };

  const handleTestVoice = () => {
    if (!hasSupport) {
      alert("您的浏览器不支持语音播报功能。");
      return;
    }
    unlockAudio();
    const config = getVoiceConfig("pro", 1);
    config.rate = voiceRate;
    speakNow("各位观众大家好，我是正方一辩，今天我们来探讨这个话题。", config);
  };

  const handleTestConVoice = () => {
    if (!hasSupport) {
      alert("您的浏览器不支持语音播报功能。");
      return;
    }
    unlockAudio();
    const config = getVoiceConfig("con", 1);
    config.rate = voiceRate;
    speakNow("各位观众大家好，我是反方一辩，请允许我陈述我方观点。", config);
  };

  return (
    <div className="flex items-center gap-2 relative">
      {/* 浏览器不支持提示 */}
      {!hasSupport && (
        <div className="flex items-center gap-1 text-xs text-amber-400">
          <AlertCircle className="w-3 h-3" />
          <span>浏览器不支持</span>
        </div>
      )}

      {/* 主开关 */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleToggleTTS}
        disabled={!hasSupport}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          !hasSupport
            ? "bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed"
            : ttsEnabled
            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg"
            : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600"
        }`}
        title={
          !hasSupport
            ? "浏览器不支持"
            : ttsEnabled
            ? "语音播报已开启"
            : "点击开启语音播报"
        }
      >
        {ttsEnabled ? (
          <Volume2 className="w-4 h-4" />
        ) : (
          <VolumeX className="w-4 h-4" />
        )}
        <span>语音播报</span>
      </motion.button>

      {/* 暂停/恢复 */}
      {ttsEnabled && hasSupport && (
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
      {ttsEnabled && hasSupport && (
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
      {ttsEnabled && hasSupport && (
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
      {showSettings && ttsEnabled && hasSupport && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full mt-2 right-0 z-50 bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-2xl w-72"
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

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleTestVoice}
                disabled={!voicesReady}
                className="py-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg hover:bg-red-500/20 disabled:opacity-50"
              >
                测试正方声
              </button>
              <button
                onClick={handleTestConVoice}
                disabled={!voicesReady}
                className="py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs rounded-lg hover:bg-blue-500/20 disabled:opacity-50"
              >
                测试反方声
              </button>
            </div>

            <div className="text-xs text-slate-500 pt-2 border-t border-slate-800">
              <p className="mb-1">辩手声音配置：</p>
              <ul className="space-y-1">
                <li>• 正方：男声，激昂有力</li>
                <li>• 反方：女声，理性思辨</li>
                <li>• 三辩音调最高（一辩最低）</li>
              </ul>
              <p className="mt-2 text-amber-400/80">
                💡 提示：若无声，请检查系统音量和浏览器音频权限
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
