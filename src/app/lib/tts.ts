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

let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesLoaded = false;

// 加载系统语音
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve([]);
      return;
    }

    const getVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        cachedVoices = voices;
        voicesLoaded = true;
        resolve(voices);
      }
    };

    // 有些浏览器需要等待voiceschanged事件
    getVoices();
    if (cachedVoices.length === 0) {
      window.speechSynthesis.addEventListener("voiceschanged", getVoices, {
        once: true,
      });
      // 兜底超时
      setTimeout(() => {
        if (!voicesLoaded) {
          cachedVoices = window.speechSynthesis.getVoices();
          voicesLoaded = true;
          resolve(cachedVoices);
        }
      }, 1500);
    } else {
      resolve(cachedVoices);
    }
  });
}

// 获取中文语音（优先选择女声/男声）
function getChineseVoice(
  preferredGender: "female" | "male" | "any" = "any"
): SpeechSynthesisVoice | null {
  const zhVoices = cachedVoices.filter((v) =>
    v.lang.toLowerCase().startsWith("zh")
  );

  if (zhVoices.length === 0) {
    // 兜底：使用默认语音
    return cachedVoices[0] || null;
  }

  if (preferredGender === "any") {
    return zhVoices[0];
  }

  // 尝试按名称匹配性别（启发式）
  const femaleKeywords = ["female", "woman", "女", "xiaoxiao", "yating", "tracy", "maria"];
  const maleKeywords = ["male", "man", "男", "kangkang", "yunxi", "yunyang"];

  const keywords = preferredGender === "female" ? femaleKeywords : maleKeywords;

  const matched = zhVoices.find((v) =>
    keywords.some((k) => v.name.toLowerCase().includes(k))
  );

  return matched || zhVoices[0];
}

// 为每位辩手配置独特的声音风格
export function getVoiceConfig(side: Side, position: Position): VoiceConfig {
  // 正方：男声为主（激昂有力）
  // 反方：女声为主（理性思辨）
  // 位置影响音调和语速，形成差异

  let preferredGender: "female" | "male" | "any" = "any";
  let rate = 1.0;
  let pitch = 1.0;

  if (side === "pro") {
    // 正方：男声，更激昂
    preferredGender = "male";
    if (position === 1) {
      // 一辩：开篇立论，语速中等偏快，音调正常
      rate = 1.1;
      pitch = 1.0;
    } else if (position === 2) {
      // 二辩：深入论述，语速稍快，音调略高
      rate = 1.15;
      pitch = 1.15;
    } else {
      // 三辩：总结陈词，语速适中，音调较高以增强感染力
      rate = 1.05;
      pitch = 1.25;
    }
  } else {
    // 反方：女声，理性
    preferredGender = "female";
    if (position === 1) {
      // 一辩：开篇立论
      rate = 1.0;
      pitch = 1.1;
    } else if (position === 2) {
      // 二辩：深入论述
      rate = 1.05;
      pitch = 1.25;
    } else {
      // 三辩：总结陈词
      rate = 0.95;
      pitch = 1.35;
    }
  }

  const voice = getChineseVoice(preferredGender);

  return {
    voice,
    rate,
    pitch,
    volume: 1.0,
  };
}

// 语音播报队列
let speechQueue: Promise<void> = Promise.resolve();

export function speak(
  text: string,
  config: VoiceConfig,
  onStart?: () => void,
  onEnd?: () => void
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    if (config.voice) {
      utterance.voice = config.voice;
    }
    utterance.lang = "zh-CN";
    utterance.rate = config.rate;
    utterance.pitch = config.pitch;
    utterance.volume = config.volume;

    utterance.onstart = () => {
      onStart?.();
    };

    utterance.onend = () => {
      onEnd?.();
      resolve();
    };

    utterance.onerror = () => {
      onEnd?.();
      resolve();
    };

    // 串行队列，避免语音重叠
    speechQueue = speechQueue.then(() => {
      window.speechSynthesis.speak(utterance);
    });
  });
}

// 停止所有语音
export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    speechQueue = Promise.resolve();
  }
}

// 暂停/恢复
export function pauseSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.pause();
  }
}

export function resumeSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.resume();
  }
}