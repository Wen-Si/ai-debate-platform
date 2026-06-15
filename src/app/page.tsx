"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Flame, Brain, TrendingUp, Users, BookOpen } from "lucide-react";
import { getTodayTopic, getAllTopics, DebateTopic, getTopicById } from "@/app/lib/topics";
import {
  addViewedTopic,
  saveCurrentTopic,
  getCurrentTopic,
  updateLastVisit,
  DebateRecord,
} from "@/app/lib/storage";
import TopicCard from "@/app/components/TopicCard";
import DebateArena from "@/app/components/DebateArena";
import HistoryPanel from "@/app/components/HistoryPanel";

export default function Home() {
  const [selectedTopic, setSelectedTopic] = useState<DebateTopic | null>(null);
  const todayTopic = getTodayTopic();
  const allTopics = getAllTopics();

  // 初始化：恢复上次浏览的话题和更新访问记录
  useEffect(() => {
    updateLastVisit();
    const savedTopicId = getCurrentTopic();
    if (savedTopicId) {
      const topic = getTopicById(savedTopicId);
      if (topic) {
        setSelectedTopic(topic);
      }
    }
  }, []);

  const handleSelectTopic = (topic: DebateTopic) => {
    setSelectedTopic(topic);
    addViewedTopic(topic.id);
    saveCurrentTopic(topic.id);
  };

  const handleSelectHistory = (record: DebateRecord) => {
    const topic = getTopicById(record.id);
    if (topic) {
      handleSelectTopic(topic);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-red-500/10 rounded-full blur-3xl" />
          <div className="absolute top-40 right-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-1/3 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          {/* 顶部导航 */}
          <motion.nav
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-16"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-blue-500 rounded-xl flex items-center justify-center">
                <Swords className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-red-400 to-blue-400 bg-clip-text text-transparent">
                智辩台
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Brain className="w-4 h-4" />
              <span>AI驱动的智能辩论平台</span>
            </div>
          </motion.nav>

          {/* 主标题 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              <span className="text-slate-100">每日一辩</span>
              <span className="block mt-2 bg-gradient-to-r from-red-400 via-amber-400 to-blue-400 bg-clip-text text-transparent">
                思想碰撞，智慧交锋
              </span>
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
              精选经济、社会、人文热点话题，AI辩手展开激烈辩论
              <br />
              用通俗语言和生动案例，带你领略思辨的魅力
            </p>
          </motion.div>

          {/* 统计数据 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex justify-center gap-8 sm:gap-16 mb-16"
          >
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <span className="text-2xl font-bold text-slate-100">10+</span>
              </div>
              <span className="text-slate-500 text-sm">精选辩题</span>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Users className="w-4 h-4 text-red-400" />
                <span className="text-2xl font-bold text-slate-100">6</span>
              </div>
              <span className="text-slate-500 text-sm">AI辩手</span>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-blue-400" />
                <span className="text-2xl font-bold text-slate-100">3</span>
              </div>
              <span className="text-slate-500 text-sm">大领域</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 今日辩题 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-slate-100">今日辩题</h2>
          </div>
          <p className="text-slate-500 text-sm">点击下方卡片开始辩论</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="md:col-span-2 lg:col-span-1"
          >
            <TopicCard
              topic={todayTopic}
              isActive={selectedTopic?.id === todayTopic.id}
              onClick={() => handleSelectTopic(todayTopic)}
            />
          </motion.div>
        </div>

        {/* 历史辩题 */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Swords className="w-5 h-5 text-slate-400" />
            <h2 className="text-xl font-bold text-slate-100">更多辩题</h2>
          </div>
          <p className="text-slate-500 text-sm">探索更多热点话题</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {allTopics.slice(1).map((topic, index) => (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <TopicCard
                topic={topic}
                isActive={selectedTopic?.id === topic.id}
                onClick={() => handleSelectTopic(topic)}
              />
            </motion.div>
          ))}
        </div>
      </section>

      {/* 辩论舞台 */}
      <AnimatePresence>
        {selectedTopic && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20"
          >
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-sm">
              {/* 辩题标题 */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-3 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full mb-4"
                >
                  <Swords className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-400 text-sm font-medium">
                    辩论主题
                  </span>
                </motion.div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-100">
                  {selectedTopic.title}
                </h2>
                <p className="mt-2 text-slate-400">{selectedTopic.description}</p>
              </div>

              {/* 辩论区域 */}
              <DebateArena
                topic={selectedTopic.title}
                topicId={selectedTopic.id}
                category={selectedTopic.category}
                date={selectedTopic.date}
              />
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* 页脚 */}
      <footer className="border-t border-slate-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-slate-500 text-sm">
            智辩台 - AI智能辩论平台 | 内容由AI生成，仅供思考参考
          </p>
        </div>
      </footer>

      {/* 历史面板 */}
      <HistoryPanel onSelectTopic={handleSelectHistory} />
    </main>
  );
}
