"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  History,
  Trash2,
  X,
  Clock,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import {
  getDebateHistory,
  deleteDebateRecord,
  clearDebateHistory,
  DebateRecord,
} from "@/app/lib/storage";

interface HistoryPanelProps {
  onSelectTopic?: (record: DebateRecord) => void;
}

export default function HistoryPanel({ onSelectTopic }: HistoryPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<DebateRecord[]>([]);

  useEffect(() => {
    if (isOpen) {
      setHistory(getDebateHistory());
    }
  }, [isOpen]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteDebateRecord(id);
    setHistory(getDebateHistory());
  };

  const handleClearAll = () => {
    if (confirm("确定要清空所有历史记录吗？")) {
      clearDebateHistory();
      setHistory([]);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      {/* 触发按钮 */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded-full shadow-lg flex items-center justify-center hover:border-amber-500/50 transition-colors"
      >
        <History className="w-5 h-5 text-slate-300" />
        {history.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full text-xs text-white flex items-center justify-center font-bold">
            {history.length}
          </span>
        )}
      </motion.button>

      {/* 面板 */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* 遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            />

            {/* 侧边栏 */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-slate-900 border-l border-slate-800 z-50 flex flex-col"
            >
              {/* 头部 */}
              <div className="flex items-center justify-between p-6 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <History className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-bold text-slate-100">辩论历史</h2>
                </div>
                <div className="flex items-center gap-2">
                  {history.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="清空历史"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* 历史列表 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                    <Clock className="w-12 h-12 mb-4 opacity-50" />
                    <p>暂无辩论历史</p>
                    <p className="text-sm mt-1">开始一场辩论，记录将显示在这里</p>
                  </div>
                ) : (
                  history.map((record) => (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl cursor-pointer hover:border-amber-500/30 hover:bg-slate-800 transition-all"
                      onClick={() => {
                        onSelectTopic?.(record);
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-slate-200 truncate pr-2">
                            {record.topic}
                          </h3>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="px-2 py-0.5 bg-slate-700 text-slate-400 text-xs rounded-full">
                              {record.category}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <MessageSquare className="w-3 h-3" />
                              {record.rounds.length}轮
                            </span>
                            <span className="text-xs text-slate-500">
                              {formatDate(record.createdAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleDelete(record.id, e)}
                            className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-slate-600" />
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
