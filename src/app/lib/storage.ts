"use client";

export interface DebateRecord {
  id: string;
  topic: string;
  category: string;
  date: string;
  rounds: {
    round: number;
    proPosition: number;
    conPosition: number;
    proContent: string;
    conContent: string;
  }[];
  createdAt: number;
}

export interface UserPreference {
  favoriteTopics: string[];
  viewedTopics: string[];
  lastVisit: string;
}

const STORAGE_KEYS = {
  DEBATE_HISTORY: "debate_history",
  USER_PREFERENCE: "user_preference",
  CURRENT_TOPIC: "current_topic",
};

// 辩论历史记录
export function saveDebateRecord(record: DebateRecord): void {
  if (typeof window === "undefined") return;
  const history = getDebateHistory();
  const existingIndex = history.findIndex((h) => h.id === record.id);
  if (existingIndex >= 0) {
    history[existingIndex] = record;
  } else {
    history.unshift(record);
  }
  // 最多保存50条记录
  if (history.length > 50) {
    history.pop();
  }
  localStorage.setItem(STORAGE_KEYS.DEBATE_HISTORY, JSON.stringify(history));
}

export function getDebateHistory(): DebateRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.DEBATE_HISTORY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function getDebateRecordById(id: string): DebateRecord | null {
  const history = getDebateHistory();
  return history.find((h) => h.id === id) || null;
}

export function deleteDebateRecord(id: string): void {
  if (typeof window === "undefined") return;
  const history = getDebateHistory().filter((h) => h.id !== id);
  localStorage.setItem(STORAGE_KEYS.DEBATE_HISTORY, JSON.stringify(history));
}

export function clearDebateHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEYS.DEBATE_HISTORY);
}

// 用户偏好设置
export function getUserPreference(): UserPreference {
  if (typeof window === "undefined") {
    return { favoriteTopics: [], viewedTopics: [], lastVisit: "" };
  }
  try {
    const data = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCE);
    if (data) {
      return JSON.parse(data);
    }
  } catch {
    // ignore
  }
  return { favoriteTopics: [], viewedTopics: [], lastVisit: "" };
}

export function saveUserPreference(preference: UserPreference): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    STORAGE_KEYS.USER_PREFERENCE,
    JSON.stringify(preference)
  );
}

export function addViewedTopic(topicId: string): void {
  const pref = getUserPreference();
  if (!pref.viewedTopics.includes(topicId)) {
    pref.viewedTopics.push(topicId);
    saveUserPreference(pref);
  }
}

export function toggleFavoriteTopic(topicId: string): boolean {
  const pref = getUserPreference();
  const index = pref.favoriteTopics.indexOf(topicId);
  if (index >= 0) {
    pref.favoriteTopics.splice(index, 1);
    saveUserPreference(pref);
    return false;
  } else {
    pref.favoriteTopics.push(topicId);
    saveUserPreference(pref);
    return true;
  }
}

export function isFavoriteTopic(topicId: string): boolean {
  return getUserPreference().favoriteTopics.includes(topicId);
}

export function updateLastVisit(): void {
  const pref = getUserPreference();
  pref.lastVisit = new Date().toISOString();
  saveUserPreference(pref);
}

// 当前话题缓存
export function saveCurrentTopic(topicId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.CURRENT_TOPIC, topicId);
}

export function getCurrentTopic(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.CURRENT_TOPIC);
}

export function clearCurrentTopic(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEYS.CURRENT_TOPIC);
}
