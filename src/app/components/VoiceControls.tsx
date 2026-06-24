"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, Pause, Play, Settings, AlertCircle, CheckCircle } from "lucide-react";
import {
  loadVoices,
  getVoiceConfig,
  speakNow,
  stopSpeaking,
  pauseSpeaking,
  resumeSpeaking,
  unlockAudio,
  isTtsSupported,
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
  const [notice, setNotice] = useState<{ type: "error" | "success"; msg: string } | null>(null);

  const showNotice = useCallback((type: "error" | "success", msg: string) => {
    setNotice({ type, msg });
    setTimeout(() => setNotice(null), 3000);
  }, []);

  useEffect(() => {
    // 检测浏览器支持
    const supported = isTtsSupported();
    setHasSupport(supported);

    if (supported) {
      // 预加载语音
      loadVoices().then((voices) => {
        setVoicesReady(voices.length > 0);
      });
    }
  }, []);

  const handleToggleTTS = () => {
    if (!hasSupport) {
      showNotice("error", "您的浏览器不支持语音播报，请使用Chrome、Edge或Safari");
      return;
    }

    const newEnabled = !ttsEnabled;
    onTtsEnabledChange(newEnabled);

    if (newEnabled) {
      // 开启时立即解锁音频 + 测试播放
      const unlocked = unlockAudio();
      // 延迟一点播放测试语音，确保voices已加载
      setTimeout(() => {
        const config = getVoiceConfig("pro", 1);
        config.rate = voiceRate;
        speakNow("语音播报已开启", config).then(() => {
          // 播放完测试音后不做额外处理
        });
        if (!unlocked && voicesReady === false) {
          showNotice("success", "语音播报已开启");
        } else {
          showNotice("success", "语音播报已开启");
        }
      }, 150);
    } else {
      stopSpeaking();
      setIsPaused(false);
      setShowSettings(false);
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

  const handleTestVoice = (side: "pro" | "con") => {
    if (!hasSupport) {
      showNotice("error", "您的浏览器不支持语音播报");
      return;
    }
    unlockAudio();
    const config = getVoiceConfig(side, 1);
    config.rate = voiceRate;
    const text = side === "pro"
      ? "各位观众大家好，我是正方一辩，今天我们来探讨这个话题。"
      : "各位观众大家好，我是反方一辩，请允许我陈述我方观点。";
    speakNow(text, config);
  };

  return (
    <div className="flex items-center gap-2 relative">
      {/* 提示消息 */}
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className={`absolute bottom-full mb-2 right-0 px-3 py-2 rounded-lg text-xs whitespace-nowrap flex items-center gap-2 shadow-lg z-50 ${
              notice.type === "error"
                ? "bg-red-500/90 text-white"
                : "bg-emerald-500/90 text-white"
            }`}
          >
            {notice.type === "error" ? (
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
            ) : (
              <CheckCircle className="w-3 h-3 flex-shrink-0" />
            )}
            {notice.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 浏览器不支持提示 */}
      {!hasSupport && (
        <div className="flex items-center gap-1 text-xs text-amber-400" title="浏览器不支持语音播报">
          <AlertCircle className="w-3 h-3" />
        </div>
      )}

      {/* 主开关 */}
      <motion.button
        whileHover={{ scale: hasSupport ? 1.05 : 1 }}
        whileTap={{ scale: hasSupport ? 0.95 : 1 }}
        onClick={handleToggleTTS}
        disabled={!hasSupport}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          !hasSupport
            ? "bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed opacity-60"
            : ttsEnabled
            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg"
            : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600"
        }`}
        title={
          !hasSupport
            ? "浏览器不支持"
            : ttsEnabled
            ? "语音播报已开启，点击关闭"
            : "点击开启语音播报"
        }
        aria-label={ttsEnabled ? "关闭语音播报" : "开启语音播报"}
      >
        {ttsEnabled ? (
          <Volume2 className="w-4 h-4" />
        ) : (
          <VolumeX className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">语音播报</span>
      </motion.button>

      {/* 暂停/恢复 */}
      {ttsEnabled && hasSupport && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleTogglePause}
          className="p-2 bg-slate-800 text-slate-300 rounded-full border border-slate-700 hover:border-slate-600"
          title={isPaused ? "恢复播报" : "暂停播报"}
          aria-label={isPaused ? "恢复播报" : "暂停播报"}
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
          aria-label="停止播报"
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
          className={`p-2 rounded-full border transition-colors ${
            showSettings
              ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
              : "bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600"
          }`}
          title="语音设置"
          aria-label="语音设置"
        >
          <Settings className="w-4 h-4" />
        </motion.button>
      )}

      {/* 设置面板 */}
      <AnimatePresence>
        {showSettings && ttsEnabled && hasSupport && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
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
                  aria-label="语速调节"
                />
                <div className="flex justify-between text-xs text-slate-600 mt-0.5">
                  <span>慢</span>
                  <span>快</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleTestVoice("pro")}
                  disabled={!voicesReady}
                  className="py-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                >
                  测试正方声
                </button>
                <button
                  onClick={() => handleTestVoice("con")}
                  disabled={!voicesReady}
                  className="py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs rounded-lg hover:bg-blue-500/20 disabled:opacity-50 transition-colors"
                >
                  测试反方声
                </button>
              </div>

              <div className="text-xs text-slate-500 pt-2 border-t border-slate-800">
                <p className="mb-1 text-slate-400">辩手声音配置：</p>
                <ul className="space-y-0.5">
                  <li>• 正方：男声，激昂有力</li>
                  <li>• 反方：女声，理性思辨</li>
                  <li>• 三辩音调最高（一辩最低）</li>
                </ul>
                <p className="mt-2 text-amber-400/70">
                  💡 若无声，请检查系统音量和浏览器音频权限
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
