export interface DebateTopic {
  id: string;
  title: string;
  category: "经济" | "社会" | "人文";
  date: string;
  description: string;
}

const topics: DebateTopic[] = [
  {
    id: "1",
    title: "远程办公是否会彻底取代传统办公模式",
    category: "社会",
    date: "2026-06-15",
    description:
      "疫情后远程办公迅速普及，但传统办公模式依然根深蒂固。未来哪种模式会成为主流？",
  },
  {
    id: "2",
    title: "人工智能的发展最终会创造更多就业还是导致大规模失业",
    category: "经济",
    date: "2026-06-14",
    description:
      "AI技术日新月异，一方面提升效率，另一方面也引发了对就业市场的担忧。",
  },
  {
    id: "3",
    title: "网红经济对社会价值观的影响是正面还是负面",
    category: "人文",
    date: "2026-06-13",
    description:
      "网红文化盛行，年轻人纷纷效仿。这是多元表达的进步，还是浮躁风气的蔓延？",
  },
  {
    id: "4",
    title: "大学教育是否应该完全免费",
    category: "社会",
    date: "2026-06-12",
    description:
      "教育公平是社会公平的基石，但免费教育是否会影响教学质量和资源分配？",
  },
  {
    id: "5",
    title: "数字货币是否会取代传统纸币",
    category: "经济",
    date: "2026-06-11",
    description:
      "数字人民币试点推进，现金使用逐渐减少。无现金社会是便利还是风险？",
  },
  {
    id: "6",
    title: "短视频的流行是丰富了文化还是稀释了深度",
    category: "人文",
    date: "2026-06-10",
    description:
      "短视频占据人们大量时间，是文化传播的新形式，还是碎片化阅读的陷阱？",
  },
  {
    id: "7",
    title: "996工作制是否应该被法律明确禁止",
    category: "社会",
    date: "2026-06-09",
    description:
      "加班文化盛行，劳动者权益如何保障？禁止996是否会影响企业竞争力？",
  },
  {
    id: "8",
    title: "预制菜的普及对传统餐饮业是机遇还是威胁",
    category: "经济",
    date: "2026-06-08",
    description:
      "预制菜方便快捷，但也有人担忧食品安全和饮食文化的流失。",
  },
  {
    id: "9",
    title: "游戏是否应被视为一种正当的职业选择",
    category: "人文",
    date: "2026-06-07",
    description:
      "电竞产业蓬勃发展，但社会对游戏职业的认可度仍然存在分歧。",
  },
  {
    id: "10",
    title: "城市限购政策对房价调控是否有效",
    category: "经济",
    date: "2026-06-06",
    description:
      "限购限贷政策频出，但房价依然高企。行政手段能否真正解决住房问题？",
  },
];

export function getTodayTopic(): DebateTopic {
  const today = new Date().toISOString().split("T")[0];
  const topic = topics.find((t) => t.date === today);
  if (topic) return topic;
  return topics[0];
}

export function getAllTopics(): DebateTopic[] {
  return topics;
}

export function getTopicById(id: string): DebateTopic | undefined {
  return topics.find((t) => t.id === id);
}
