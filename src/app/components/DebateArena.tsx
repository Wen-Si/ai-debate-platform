"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, User, Sparkles, Play, RotateCcw, Clock, Trash2, Volume2 } from "lucide-react";
import { generateDebateStream, DebateRound } from "@/app/lib/glm";
import {
  saveDebateRecord,
  getDebateHistory,
  deleteDebateRecord,
  DebateRecord,
} from "@/app/lib/storage";
import {
  loadVoices,
  getVoiceConfig,
  speakNow,
  stopSpeaking,
  unlockAudio,
} from "@/app/lib/tts";
import VoiceControls from "./VoiceControls";

interface DebateArenaProps {
  topic: string;
  topicId: string;
  category: string;
  date: string;
}

interface StreamingContent {
  [round: number]: {
    pro: string;
    con: string;
  };
}

export default function DebateArena({ topic, topicId, category, date }: DebateArenaProps) {
  const [rounds, setRounds] = useState<DebateRound[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<DebateRecord[]>([]);
  const [streaming, setStreaming] = useState<StreamingContent>({});
  const [activeSpeaker, setActiveSpeaker] = useState<"pro" | "con" | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [voiceRate, setVoiceRate] = useState(1.0);
  const ttsEnabledRef = useRef(ttsEnabled);
  const voiceRateRef = useRef(voiceRate);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ttsEnabledRef.current = ttsEnabled;
  }, [ttsEnabled]);

  useEffect(() => {
    voiceRateRef.current = voiceRate;
  }, [voiceRate]);

  useEffect(() => {
    setHistory(getDebateHistory());
    // 预加载语音
    loadVoices();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [streaming, currentRound]);

  // 播放单条发言（用户主动点击）
  const playSingleSpeech = (text: string, side: "pro" | "con", position: 1 | 2 | 3) => {
    if (!ttsEnabledRef.current) {
      alert('请先点击"语音播报"按钮开启功能');
      return;
    }
    if (!text) return;
    unlockAudio();
    const config = getVoiceConfig(side, position);
    config.rate = voiceRateRef.current;
    stopSpeaking();
    speakNow(text, config);
  };

  // 播放完整辩论（按时间线）
  const startDebate = async () => {
    setIsLoading(true);
    setError("");
    setRounds([]);
    setCurrentRound(0);
    setIsComplete(false);
    setStreaming({});
    stopSpeaking();

    // 如果开启了TTS，解锁音频
    if (ttsEnabledRef.current) {
      unlockAudio();
    }

    // 收集所有发言用于串行TTS播放
    const ttsQueue: Array<{ text: string; side: "pro" | "con"; position: number }> = [];

    try {
      const finalRounds = await generateDebateStream(
        topic,
        // 正方更新回调
        (round, content) => {
          setActiveSpeaker("pro");
          setStreaming((prev) => ({
            ...prev,
            [round]: { ...prev[round], pro: content },
          }));
          setCurrentRound(round);
        },
        // 反方更新回调
        (round, content) => {
          setActiveSpeaker("con");
          setStreaming((prev) => ({
            ...prev,
            [round]: { ...prev[round], con: content },
          }));
          setCurrentRound(round);
        },
        // 轮次完成回调
        (round) => {
          setActiveSpeaker(null);
        },
        // 正方完成回调 - 加入TTS队列
        (round, content) => {
          ttsQueue.push({ text: content, side: "pro", position: round });
        },
        // 反方完成回调 - 加入TTS队列
        (round, content) => {
          ttsQueue.push({ text: content, side: "con", position: round });
        },
        30
      );

      setRounds(finalRounds);
      setIsComplete(true);
      setActiveSpeaker(null);

      // 辩论内容全部生成后，串行播放TTS
      if (ttsEnabledRef.current && ttsQueue.length > 0) {
        for (const item of ttsQueue) {
          if (!ttsEnabledRef.current) break; // 用户中途关闭
          await new Promise<void>((resolve) => {
            const config = getVoiceConfig(item.side, item.position as 1 | 2 | 3);
            config.rate = voiceRateRef.current;
            speakNow(item.text, config, undefined, () => resolve());
            // 兜底超时
            setTimeout(() => resolve(), Math.max(10000, item.text.length * 200));
          });
        }
      }

      // 保存到Local Storage
      const record: DebateRecord = {
        id: topicId,
        topic,
        category,
        date,
        rounds: finalRounds,
        createdAt: Date.now(),
      };
      saveDebateRecord(record);
      setHistory(getDebateHistory());
    } catch (err) {
      console.error("Debate error:", err);
      setError("辩论生成失败，请稍后重试");
    } finally {
      setIsLoading(false);
      setActiveSpeaker(null);
    }
  };

  const loadHistory = (record: DebateRecord) => {
    setRounds(record.rounds);
    setCurrentRound(record.rounds.length);
    setIsComplete(true);
    setError("");
    setStreaming({});
    setActiveSpeaker(null);
    stopSpeaking();
  };

  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteDebateRecord(id);
    setHistory(getDebateHistory());
    if (id === topicId) {
      resetDebate();
    }
  };

  const resetDebate = () => {
    setRounds([]);
    setCurrentRound(0);
    setIsComplete(false);
    setError("");
    setStreaming({});
    setActiveSpeaker(null);
    stopSpeaking();
  };

  const positionNames = ["一辩", "二辩", "三辩"];

  const getDisplayContent = (round: number, side: "pro" | "con") => {
    if (streaming[round]?.[side]) {
      return streaming[round][side];
    }
    const roundData = rounds.find((r) => r.round === round);
    if (roundData) {
      return side === "pro" ? roundData.proContent : roundData.conContent;
    }
    return "";
  };

  const isStreaming = (round: number, side: "pro" | "con") => {
    return activeSpeaker === side && currentRound === round && isLoading;
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* 顶部工具栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        {/* 历史记录侧边栏触发区 */}
        {history.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Clock className="w-4 h-4" />
              <span>历史辩论:</span>
            </div>
            {history.map((record) => (
              <button
                key={record.id}
                onClick={() => loadHistory(record)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                  record.id === topicId && isComplete
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                }`}
              >
                <span className="truncate max-w-[150px]">{record.topic}</span>
                <span
                  onClick={(e) => handleDeleteHistory(record.id, e)}
                  className="p-0.5 hover:bg-red-500/20 rounded-full transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </span>
              </button>
            ))}
          </div>
        )}

        {/* TTS控制 - 靠右 */}
        <div className="relative ml-auto">
          <VoiceControls
            ttsEnabled={ttsEnabled}
            onTtsEnabledChange={setTtsEnabled}
            voiceRate={voiceRate}
            onVoiceRateChange={setVoiceRate}
          />
        </div>
      </div>

      {/* 控制按钮 */}
      <div className="flex justify-center gap-4 mb-8">
        {!isLoading && rounds.length === 0 && Object.keys(streaming).length === 0 && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startDebate}
            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-red-500 to-blue-500 rounded-full text-white font-bold text-lg shadow-lg hover:shadow-xl transition-shadow"
          >
            <Play className="w-5 h-5" />
            开始辩论
          </motion.button>
        )}

        {isComplete && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={resetDebate}
            className="flex items-center gap-2 px-8 py-4 bg-slate-700 rounded-full text-white font-bold text-lg hover:bg-slate-600 transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            重新辩论
          </motion.button>
        )}
      </div>

      {/* 加载状态 - 初始 */}
      {isLoading && Object.keys(streaming).length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Swords className="w-16 h-16 text-amber-400" />
          </motion.div>
          <p className="mt-4 text-slate-400 text-lg">AI辩手正在准备中...</p>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="text-center py-8 text-red-400 bg-red-900/20 rounded-xl border border-red-800">
          {error}
        </div>
      )}

      {/* 辩论内容 */}
      <div ref={scrollRef} className="space-y-6 max-h-[70vh] overflow-y-auto scrollbar-hide pb-8">
        <AnimatePresence>
          {[1, 2, 3].map((roundNum) => {
            const proContent = getDisplayContent(roundNum, "pro");
            const conContent = getDisplayContent(roundNum, "con");
            const hasContent = proContent || conContent;
            if (!hasContent) return null;

            return (
              <motion.div
                key={roundNum}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-4"
              >
                {/* 轮次标题 */}
                <div className="flex items-center justify-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
                  <span className="text-amber-400 font-bold text-sm tracking-wider">
                    第{roundNum}轮交锋
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
                </div>

                {/* 正方发言 */}
                {proContent && (
                  <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="flex gap-4"
                  >
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center ${
                        isStreaming(roundNum, "pro") ? "animate-pulse-glow" : ""
                      }`}>
                        <User className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-red-400 font-bold text-sm">
                          正方{positionNames[roundNum - 1]}
                        </span>
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30">
                          支持方
                        </span>
                        {isStreaming(roundNum, "pro") && (
                          <span className="flex items-center gap-1 text-xs text-amber-400 animate-pulse">
                            <Sparkles className="w-3 h-3" />
                            思考中...
                          </span>
                        )}
                        {ttsEnabled && !isStreaming(roundNum, "pro") && (
                          <button
                            onClick={() => playSingleSpeech(proContent, "pro", roundNum as 1 | 2 | 3)}
                            className="ml-auto p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-500 hover:text-amber-400"
                            title="播放语音"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="bg-gradient-to-r from-red-950/50 to-transparent border-l-4 border-red-500 rounded-r-xl p-5">
                        <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {proContent}
                          {isStreaming(roundNum, "pro") && (
                            <span className="inline-block w-2 h-4 bg-amber-400 ml-1 animate-pulse" />
                          )}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 反方发言 */}
                {conContent && (
                  <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="flex gap-4 flex-row-reverse"
                  >
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center ${
                        isStreaming(roundNum, "con") ? "animate-pulse-glow-blue" : ""
                      }`}>
                        <User className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 justify-end">
                        {ttsEnabled && !isStreaming(roundNum, "con") && (
                          <button
                            onClick={() => playSingleSpeech(conContent, "con", roundNum as 1 | 2 | 3)}
                            className="ml-auto p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-500 hover:text-amber-400"
                            title="播放语音"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isStreaming(roundNum, "con") && (
                          <span className="flex items-center gap-1 text-xs text-amber-400 animate-pulse">
                            <Sparkles className="w-3 h-3" />
                            思考中...
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30">
                          反对方
                        </span>
                        <span className="text-blue-400 font-bold text-sm">
                          反方{positionNames[roundNum - 1]}
                        </span>
                      </div>
                      <div className="bg-gradient-to-l from-blue-950/50 to-transparent border-r-4 border-blue-500 rounded-l-xl p-5">
                        <p className="text-slate-200 leading-relaxed whitespace-pre-wrap text-right">
                          {conContent}
                          {isStreaming(roundNum, "con") && (
                            <span className="inline-block w-2 h-4 bg-amber-400 ml-1 animate-pulse" />
                          )}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* 辩论结束 */}
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-full">
              <Swords className="w-5 h-5 text-amber-400" />
              <span className="text-amber-400 font-bold">辩论结束</span>
              <Swords className="w-5 h-5 text-amber-400" />
            </div>
            <p className="mt-4 text-slate-400 text-sm">
              以上观点均由AI生成，仅供思考参考
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
