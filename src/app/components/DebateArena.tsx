"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, User, Sparkles, Play, RotateCcw, Clock, Trash2 } from "lucide-react";
import { DebateRound } from "@/app/api/debate/route";
import {
  saveDebateRecord,
  getDebateHistory,
  deleteDebateRecord,
  DebateRecord,
} from "@/app/lib/storage";

interface DebateArenaProps {
  topic: string;
  topicId: string;
  category: string;
  date: string;
}

export default function DebateArena({ topic, topicId, category, date }: DebateArenaProps) {
  const [rounds, setRounds] = useState<DebateRound[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<DebateRecord[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHistory(getDebateHistory());
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [rounds, currentRound]);

  const startDebate = async () => {
    setIsLoading(true);
    setError("");
    setRounds([]);
    setCurrentRound(0);
    setIsComplete(false);

    try {
      const response = await fetch("/api/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      if (!response.ok) {
        throw new Error("辩论生成失败");
      }

      const data = await response.json();
      setRounds(data.rounds);

      for (let i = 0; i < data.rounds.length; i++) {
        setCurrentRound(i + 1);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      setIsComplete(true);

      // 保存到Local Storage
      const record: DebateRecord = {
        id: topicId,
        topic,
        category,
        date,
        rounds: data.rounds,
        createdAt: Date.now(),
      };
      saveDebateRecord(record);
      setHistory(getDebateHistory());
    } catch (err) {
      setError("辩论生成失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistory = (record: DebateRecord) => {
    setRounds(record.rounds);
    setCurrentRound(record.rounds.length);
    setIsComplete(true);
    setError("");
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
  };

  const positionNames = ["一辩", "二辩", "三辩"];

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* 历史记录侧边栏 */}
      {history.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-300">历史辩论</span>
          </div>
          <div className="flex flex-wrap gap-2">
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
        </motion.div>
      )}

      {/* 控制按钮 */}
      <div className="flex justify-center gap-4 mb-8">
        {!isLoading && rounds.length === 0 && (
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

      {/* 加载状态 */}
      {isLoading && rounds.length === 0 && (
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
          {rounds.map((round, index) => {
            if (index >= currentRound) return null;
            return (
              <motion.div
                key={round.round}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-4"
              >
                {/* 轮次标题 */}
                <div className="flex items-center justify-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
                  <span className="text-amber-400 font-bold text-sm tracking-wider">
                    第{round.round}轮交锋
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
                </div>

                {/* 正方发言 */}
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="flex gap-4"
                >
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center animate-pulse-glow">
                      <User className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-red-400 font-bold text-sm">
                        正方{positionNames[round.proPosition - 1]}
                      </span>
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30">
                        支持方
                      </span>
                    </div>
                    <div className="bg-gradient-to-r from-red-950/50 to-transparent border-l-4 border-red-500 rounded-r-xl p-5">
                      <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {round.proContent}
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* 反方发言 */}
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="flex gap-4 flex-row-reverse"
                >
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center animate-pulse-glow-blue">
                      <User className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 justify-end">
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30">
                        反对方
                      </span>
                      <span className="text-blue-400 font-bold text-sm">
                        反方{positionNames[round.conPosition - 1]}
                      </span>
                    </div>
                    <div className="bg-gradient-to-l from-blue-950/50 to-transparent border-r-4 border-blue-500 rounded-l-xl p-5">
                      <p className="text-slate-200 leading-relaxed whitespace-pre-wrap text-right">
                        {round.conContent}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* 正在加载下一轮 */}
        {isLoading && currentRound > 0 && currentRound < 3 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center py-4"
          >
            <div className="flex items-center gap-2 text-amber-400">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span className="text-sm">AI辩手正在激烈交锋中...</span>
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
          </motion.div>
        )}

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
