"use client";

const MAX_RECORDS = 50;
const MAX_SINGLE_RECORD_SIZE = 500000; // 单条记录最大500KB
const STORAGE_KEYS = {
  DEBATE_HISTORY: "debate_history",
  USER_PREFERENCE: "user_preference",
  CURRENT_TOPIC: "current_topic",
};

export interface DebateRound {
  round: number;
  proPosition: number;
  conPosition: number;
  proContent: string;
  conContent: string;
}

export interface DebateRecord {
  id: string;
  topic: string;
  category: string;
  date: string;
  rounds: DebateRound[];
  createdAt: number;
}

export interface UserPreference {
  favoriteTopics: string[];
  viewedTopics: string[];
  lastVisit: string;
}

/**
 * 安全地解析JSON，失败返回默认值
 */
function safeParseJSON<T>(json: string | null, defaultValue: T): T {
  if (!json) return defaultValue;
  try {
    const parsed = JSON.parse(json);
    return typeof parsed === typeof defaultValue ? parsed : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * 验证辩论记录的数据完整性
 */
function validateRecord(record: unknown): record is DebateRecord {
  if (typeof record !== "object" || record === null) return false;
  const r = record as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.topic === "string" &&
    typeof r.category === "string" &&
    typeof r.date === "string" &&
    typeof r.createdAt === "number" &&
    Array.isArray(r.rounds) &&
    r.rounds.length > 0
  );
}

/**
 * 清理辩论记录，限制内容长度
 */
function sanitizeRecord(record: DebateRecord): DebateRecord {
  const MAX_CONTENT = 1000; // 单条发言最大1000字
  return {
    ...record,
    id: String(record.id).slice(0, 50),
    topic: String(record.topic).slice(0, 200),
    category: String(record.category).slice(0, 20),
    date: String(record.date).slice(0, 20),
    rounds: record.rounds.map((r) => ({
      round: Math.max(1, Math.min(3, Number(r.round) || 1)),
      proPosition: Math.max(1, Math.min(3, Number(r.proPosition) || 1)),
      conPosition: Math.max(1, Math.min(3, Number(r.conPosition) || 1)),
      proContent: String(r.proContent || "").slice(0, MAX_CONTENT),
      conContent: String(r.conContent || "").slice(0, MAX_CONTENT),
    })),
    createdAt: Number(record.createdAt) || Date.now(),
  };
}

// 辩论历史记录
export function saveDebateRecord(record: DebateRecord): void {
  if (typeof window === "undefined") return;
  try {
    const sanitized = sanitizeRecord(record);
    const history = getDebateHistory();
    const existingIndex = history.findIndex((h) => h.id === sanitized.id);
    if (existingIndex >= 0) {
      history[existingIndex] = sanitized;
    } else {
      history.unshift(sanitized);
    }
    // 最多保存N条记录
    while (history.length > MAX_RECORDS) {
      history.pop();
    }
    // 检查总大小，超过则删除最早的记录
    let json = JSON.stringify(history);
    while (json.length > MAX_SINGLE_RECORD_SIZE * MAX_RECORDS && history.length > 1) {
      history.pop();
      json = JSON.stringify(history);
    }
    localStorage.setItem(STORAGE_KEYS.DEBATE_HISTORY, json);
  } catch (error) {
    console.warn("Failed to save debate record:", error);
    // 如果存储失败（可能是localStorage满了），清空后重试
    try {
      clearDebateHistory();
      localStorage.setItem(
        STORAGE_KEYS.DEBATE_HISTORY,
        JSON.stringify([sanitizeRecord(record)])
      );
    } catch {
      // 彻底失败则静默处理
    }
  }
}

export function getDebateHistory(): DebateRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.DEBATE_HISTORY);
    const records = safeParseJSON<unknown[]>(data, []);
    return records.filter(validateRecord).map(sanitizeRecord);
  } catch {
    return [];
  }
}

export function getDebateRecordById(id: string): DebateRecord | null {
  if (!id || typeof id !== "string") return null;
  const history = getDebateHistory();
  return history.find((h) => h.id === id) || null;
}

export function deleteDebateRecord(id: string): void {
  if (typeof window === "undefined" || !id) return;
  try {
    const history = getDebateHistory().filter((h) => h.id !== id);
    localStorage.setItem(STORAGE_KEYS.DEBATE_HISTORY, JSON.stringify(history));
  } catch (error) {
    console.warn("Failed to delete debate record:", error);
  }
}

export function clearDebateHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEYS.DEBATE_HISTORY);
  } catch (error) {
    console.warn("Failed to clear debate history:", error);
  }
}

// 用户偏好设置
export function getUserPreference(): UserPreference {
  if (typeof window === "undefined") {
    return { favoriteTopics: [], viewedTopics: [], lastVisit: "" };
  }
  try {
    const data = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCE);
    const pref = safeParseJSON<Partial<UserPreference>>(data, {});
    return {
      favoriteTopics: Array.isArray(pref.favoriteTopics)
        ? pref.favoriteTopics.slice(0, 100).map(String)
        : [],
      viewedTopics: Array.isArray(pref.viewedTopics)
        ? pref.viewedTopics.slice(0, 200).map(String)
        : [],
      lastVisit: typeof pref.lastVisit === "string" ? pref.lastVisit : "",
    };
  } catch {
    return { favoriteTopics: [], viewedTopics: [], lastVisit: "" };
  }
}

export function saveUserPreference(preference: UserPreference): void {
  if (typeof window === "undefined") return;
  try {
    // 限制数组长度
    const safe = {
      ...preference,
      favoriteTopics: preference.favoriteTopics.slice(0, 100),
      viewedTopics: preference.viewedTopics.slice(-200),
      lastVisit: String(preference.lastVisit || "").slice(0, 30),
    };
    localStorage.setItem(
      STORAGE_KEYS.USER_PREFERENCE,
      JSON.stringify(safe)
    );
  } catch (error) {
    console.warn("Failed to save user preference:", error);
  }
}

export function addViewedTopic(topicId: string): void {
  if (!topicId || typeof topicId !== "string") return;
  try {
    const pref = getUserPreference();
    if (!pref.viewedTopics.includes(topicId)) {
      pref.viewedTopics.push(topicId);
      saveUserPreference(pref);
    }
  } catch (error) {
    console.warn("Failed to add viewed topic:", error);
  }
}

export function toggleFavoriteTopic(topicId: string): boolean {
  if (!topicId || typeof topicId !== "string") return false;
  try {
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
  } catch (error) {
    console.warn("Failed to toggle favorite:", error);
    return false;
  }
}

export function isFavoriteTopic(topicId: string): boolean {
  if (!topicId || typeof topicId !== "string") return false;
  try {
    return getUserPreference().favoriteTopics.includes(topicId);
  } catch {
    return false;
  }
}

export function updateLastVisit(): void {
  try {
    const pref = getUserPreference();
    pref.lastVisit = new Date().toISOString();
    saveUserPreference(pref);
  } catch (error) {
    console.warn("Failed to update last visit:", error);
  }
}

// 当前话题缓存
export function saveCurrentTopic(topicId: string): void {
  if (typeof window === "undefined" || !topicId) return;
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_TOPIC, String(topicId).slice(0, 50));
  } catch (error) {
    console.warn("Failed to save current topic:", error);
  }
}

export function getCurrentTopic(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const id = localStorage.getItem(STORAGE_KEYS.CURRENT_TOPIC);
    return id || null;
  } catch {
    return null;
  }
}

export function clearCurrentTopic(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_TOPIC);
  } catch (error) {
    console.warn("Failed to clear current topic:", error);
  }
}
