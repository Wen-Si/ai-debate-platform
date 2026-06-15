"use client";

import { motion } from "framer-motion";
import { Calendar, Tag, MessageCircle, Heart } from "lucide-react";
import { DebateTopic } from "@/app/lib/topics";
import { isFavoriteTopic, toggleFavoriteTopic } from "@/app/lib/storage";
import { useState } from "react";

interface TopicCardProps {
  topic: DebateTopic;
  isActive?: boolean;
  onClick?: () => void;
}

const categoryColors = {
  经济: "from-amber-500 to-orange-500",
  社会: "from-emerald-500 to-teal-500",
  人文: "from-purple-500 to-pink-500",
};

const categoryBgColors = {
  经济: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  社会: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  人文: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export default function TopicCard({ topic, isActive, onClick }: TopicCardProps) {
  const [isFav, setIsFav] = useState(isFavoriteTopic(topic.id));

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    const result = toggleFavoriteTopic(topic.id);
    setIsFav(result);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative p-6 rounded-2xl border cursor-pointer transition-all duration-300 ${
        isActive
          ? "bg-slate-800/80 border-amber-500/50 shadow-lg shadow-amber-500/10"
          : "bg-slate-800/40 border-slate-700/50 hover:border-slate-600"
      }`}
    >
      {/* 收藏按钮 */}
      <button
        onClick={handleFavorite}
        className="absolute top-4 right-4 z-10 p-1.5 rounded-full hover:bg-slate-700/50 transition-colors"
      >
        <Heart
          className={`w-4 h-4 transition-colors ${
            isFav ? "text-red-400 fill-red-400" : "text-slate-500"
          }`}
        />
      </button>

      {/* 分类标签 */}
      <div className="flex items-center justify-between mb-4">
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium border ${
            categoryBgColors[topic.category]
          }`}
        >
          {topic.category}
        </span>
        <div className="flex items-center gap-1 text-slate-500 text-xs">
          <Calendar className="w-3 h-3" />
          {topic.date}
        </div>
      </div>

      {/* 标题 */}
      <h3 className="text-lg font-bold text-slate-100 mb-3 leading-snug pr-8">
        {topic.title}
      </h3>

      {/* 描述 */}
      <p className="text-slate-400 text-sm leading-relaxed mb-4">
        {topic.description}
      </p>

      {/* 底部信息 */}
      <div className="flex items-center gap-2 text-slate-500 text-xs">
        <MessageCircle className="w-3 h-3" />
        <span>点击开始辩论</span>
      </div>

      {/* 活跃指示器 */}
      {isActive && (
        <motion.div
          layoutId="activeIndicator"
          className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
    </motion.div>
  );
}
