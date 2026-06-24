// TTS语音合成模块
// 使用浏览器原生Web Speech API实现文本转语音

export type Side = "pro" | "con";
export type Position = 1 | 2 | 3; // 一辩、二辩、三辩

export interface VoiceConfig {
  voice: SpeechSynthesisVoice | null;
  rate: number;    // 语速 0.1-10
  pitch: number;   // 音调 0-2
  volume: number;  // 音量 0-1
}

const MAX_TTS_TEXT_LENGTH = 500; // TTS单次最大文本长度

let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesLoaded = false;
let voicesLoadPromise: Promise<SpeechSynthesisVoice[]> | null = null;

// 加载系统语音
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (voicesLoaded && cachedVoices.length > 0) {
    return Promise.resolve(cachedVoices);
  }
  if (voicesLoadPromise) {
    return voicesLoadPromise;
  }

  voicesLoadPromise = new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      voicesLoaded = true;
      resolve([]);
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let resolved = false;

    const doResolve = (voices: SpeechSynthesisVoice[]) => {
      if (resolved) return;
      resolved = true;
      if (timeoutId) clearTimeout(timeoutId);
      cachedVoices = voices;
      voicesLoaded = true;
      resolve(voices);
    };

    const getVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        doResolve(voices);
      }
    };

    // 有些浏览器需要等待voiceschanged事件
    getVoices();
    if (!resolved) {
      window.speechSynthesis.addEventListener("voiceschanged", getVoices, {
        once: true,
      });
      // 兜底超时
      timeoutId = setTimeout(() => {
        if (!resolved) {
          doResolve(window.speechSynthesis.getVoices());
        }
      }, 2000);
    }
  });

  return voicesLoadPromise;
}

// 获取中文语音（优先选择女声/男声）
function getChineseVoice(
  preferredGender: "female" | "male" | "any" = "any"
): SpeechSynthesisVoice | null {
  if (cachedVoices.length === 0) {
    return null;
  }

  // 查找中文语音（包括zh-CN, zh-TW, zh-HK等）
  const zhVoices = cachedVoices.filter((v) => {
    const lang = v.lang.toLowerCase();
    return lang.startsWith("zh") || lang.includes("chinese");
  });

  // 如果没有中文语音，尝试使用任何可用的语音
  const candidateVoices = zhVoices.length > 0 ? zhVoices : cachedVoices;

  if (preferredGender === "any") {
    return candidateVoices[0] || null;
  }

  // 尝试按名称匹配性别（启发式）
  const femaleKeywords = [
    "female", "woman", "女", "xiaoxiao", "yating", "tracy", "maria",
    "hui", "mei", "ling", "tingting", "siri", "google", "microsoft yaoyao"
  ];
  const maleKeywords = [
    "male", "man", "男", "kangkang", "yunxi", "yunyang",
    "haoxiang", "kai", "siri", "google", "microsoft yunxi"
  ];

  const keywords = preferredGender === "female" ? femaleKeywords : maleKeywords;

  const matched = candidateVoices.find((v) =>
    keywords.some((k) => v.name.toLowerCase().includes(k))
  );

  return matched || candidateVoices[0] || null;
}

// 为每位辩手配置独特的声音风格
export function getVoiceConfig(side: Side, position: Position): VoiceConfig {
  let preferredGender: "female" | "male" | "any" = "any";
  let rate = 1.0;
  let pitch = 1.0;

  if (side === "pro") {
    preferredGender = "male";
    if (position === 1) {
      rate = 1.1;
      pitch = 1.0;
    } else if (position === 2) {
      rate = 1.15;
      pitch = 1.15;
    } else {
      rate = 1.05;
      pitch = 1.25;
    }
  } else {
    preferredGender = "female";
    if (position === 1) {
      rate = 1.0;
      pitch = 1.1;
    } else if (position === 2) {
      rate = 1.05;
      pitch = 1.25;
    } else {
      rate = 0.95;
      pitch = 1.35;
    }
  }

  // 限制参数范围
  rate = Math.max(0.5, Math.min(2.0, rate));
  pitch = Math.max(0, Math.min(2, pitch));

  const voice = getChineseVoice(preferredGender);

  return {
    voice,
    rate,
    pitch,
    volume: 1.0,
  };
}

/**
 * 清理TTS文本，移除可能导致问题的内容
 */
function sanitizeTtsText(text: string): string {
  if (!text) return "";
  // 移除HTML标签、特殊控制字符
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TTS_TEXT_LENGTH);
}

/**
 * 立即播放语音（必须在用户交互事件中同步调用）
 * 返回Promise，当语音播放完毕或出错时resolve
 */
export function speakNow(
  text: string,
  config: VoiceConfig,
  onStart?: () => void,
  onEnd?: () => void
): Promise<void> {
  return new Promise((resolve) => {
    let resolved = false;
    const done = () => {
      if (resolved) return;
      resolved = true;
      onEnd?.();
      resolve();
    };

    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      done();
      return;
    }

    const safeText = sanitizeTtsText(text);
    if (!safeText) {
      done();
      return;
    }

    try {
      // 取消之前未完成的语音
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(safeText);
      if (config.voice) {
        utterance.voice = config.voice;
      }
      utterance.lang = "zh-CN";
      utterance.rate = Math.max(0.1, Math.min(10, config.rate));
      utterance.pitch = Math.max(0, Math.min(2, config.pitch));
      utterance.volume = Math.max(0, Math.min(1, config.volume));

      utterance.onstart = () => {
        onStart?.();
      };

      utterance.onend = () => {
        done();
      };

      utterance.onerror = (e) => {
        console.warn("TTS error:", e);
        done();
      };

      // 兜底超时：根据文本长度估算播放时间，最长30秒
      const estimatedDuration = Math.min(30000, safeText.length * 200 + 3000);
      setTimeout(() => done(), estimatedDuration);

      // 立即调用，保留用户交互上下文
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("TTS speak error:", e);
      done();
    }
  });
}

// Promise版本的speak（保持向后兼容，已被speakNow替代）
export function speak(
  text: string,
  config: VoiceConfig,
  onStart?: () => void,
  onEnd?: () => void
): Promise<void> {
  return speakNow(text, config, onStart, onEnd);
}

// 停止所有语音
export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn("TTS stop error:", e);
    }
  }
}

// 暂停
export function pauseSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.pause();
    } catch (e) {
      console.warn("TTS pause error:", e);
    }
  }
}

// 恢复
export function resumeSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.resume();
    } catch (e) {
      console.warn("TTS resume error:", e);
    }
  }
}

// 解锁音频（必须在用户交互事件中调用一次）
export function unlockAudio(): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return false;
  }
  try {
    // 播放一个空utterance来解锁音频
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    u.lang = "zh-CN";
    window.speechSynthesis.speak(u);
    return true;
  } catch (e) {
    console.warn("TTS unlock error:", e);
    return false;
  }
}

// 检查TTS是否可用
export function isTtsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
