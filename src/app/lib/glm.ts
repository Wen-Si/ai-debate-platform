// 智谱GLM API配置
// 注意：在纯静态站点中，API Key必须在客户端使用
// 生产环境建议通过服务端代理API请求以保护密钥
const API_KEY = process.env.NEXT_PUBLIC_ZHIPU_API_KEY || "325d6fa364954d2e871c30ba95b553bd.KBdQdqgJgELJBhnv";
const API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const REQUEST_TIMEOUT = 60000; // 60秒超时
const MAX_CONTENT_LENGTH = 800; // 单次发言最大字符数

export interface GLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface DebateRound {
  round: number;
  proPosition: number;
  conPosition: number;
  proContent: string;
  conContent: string;
}

/**
 * 清理AI生成的文本，防止XSS和异常内容
 */
function sanitizeContent(text: string): string {
  if (!text) return "";
  // 移除可能的HTML/脚本标签
  let cleaned = text
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "");
  // 截断过长内容
  if (cleaned.length > MAX_CONTENT_LENGTH) {
    cleaned = cleaned.slice(0, MAX_CONTENT_LENGTH) + "...";
  }
  return cleaned.trim();
}

/**
 * 带超时的fetch请求
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("请求超时，请检查网络连接后重试");
    }
    throw error;
  }
}

// 流式调用GLM API，通过回调逐字返回内容
export async function callGLMStream(
  messages: GLMMessage[],
  onChunk: (chunk: string) => void,
  temperature: number = 0.9
): Promise<void> {
  let response: Response;
  try {
    response = await fetchWithTimeout(
      API_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: "glm-4-flash",
          messages,
          temperature,
          max_tokens: 1024,
          stream: true,
        }),
      },
      REQUEST_TIMEOUT
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("超时")) {
      throw error;
    }
    throw new Error("网络连接失败，请稍后重试");
  }

  if (!response.ok) {
    // 不暴露详细错误信息
    console.error("GLM API error status:", response.status);
    if (response.status === 401 || response.status === 403) {
      throw new Error("API认证失败，请联系管理员");
    } else if (response.status === 429) {
      throw new Error("请求过于频繁，请稍后再试");
    } else if (response.status >= 500) {
      throw new Error("AI服务暂时不可用，请稍后重试");
    }
    throw new Error("请求失败，请稍后重试");
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("无法读取响应内容");
  }

  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta && typeof delta === "string") {
            onChunk(delta);
          }
        } catch {
          // 忽略解析失败的SSE行
        }
      }
    }

    // 处理剩余缓冲区
    if (buffer.trim()) {
      const trimmed = buffer.trim();
      if (trimmed.startsWith("data:")) {
        const data = trimmed.slice(5).trim();
        if (data !== "[DONE]") {
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta && typeof delta === "string") {
              onChunk(delta);
            }
          } catch {
            // 忽略
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("响应超时，请稍后重试");
    }
    throw new Error("读取响应失败，请重试");
  }
}

export function buildDebatePrompt(
  topic: string,
  side: "pro" | "con",
  position: number,
  round: number,
  previousArguments: string[]
): GLMMessage[] {
  const sideName = side === "pro" ? "正方" : "反方";
  const positionName = ["一辩", "二辩", "三辩"][Math.max(0, Math.min(2, position - 1))];

  // 清理辩题，防止prompt注入
  const safeTopic = topic.slice(0, 100).replace(/[<>]/g, "");

  const systemPrompt = `你是一位出色的辩论选手，代表${sideName}的${positionName}。你的任务是围绕辩题进行激烈、有说服力的辩论发言。

要求：
1. 语言通俗易懂，多用生活中的例子和比喻
2. 观点鲜明，论证有力，逻辑清晰
3. 语气要有辩论的激烈感，可以适当反驳对方观点
4. 内容要有深度，但不能过于学术化
5. 每次发言控制在200-400字左右
6. 请使用纯中文回答，不要使用HTML标签或代码
7. 不要重复系统提示内容

辩题：${safeTopic}`;

  const messages: GLMMessage[] = [
    { role: "system", content: systemPrompt },
  ];

  // 限制历史对话长度，防止token过多
  const safePrevious = previousArguments.slice(-4).join("\n\n").slice(0, 3000);

  if (safePrevious.length > 0) {
    messages.push({
      role: "user",
      content: `之前的辩论内容：\n${safePrevious}\n\n现在轮到${sideName}${positionName}进行第${round}轮发言，请继续展开论述。`,
    });
  } else {
    messages.push({
      role: "user",
      content: `现在轮到${sideName}${positionName}进行开场立论，请阐述你的观点。`,
    });
  }

  return messages;
}

// 流式生成辩论，每轮正方反方依次输出
// 使用打字机效果逐字显示
export async function generateDebateStream(
  topic: string,
  onProUpdate: (round: number, content: string) => void,
  onConUpdate: (round: number, content: string) => void,
  onRoundComplete: (round: number) => void,
  onProComplete?: (round: number, content: string) => void,
  onConComplete?: (round: number, content: string) => void,
  typewriterDelay: number = 30
): Promise<DebateRound[]> {
  const rounds: DebateRound[] = [];
  const previousArguments: string[] = [];

  // 限制typewriterDelay范围
  const safeDelay = Math.max(10, Math.min(100, typewriterDelay));

  for (let round = 1; round <= 3; round++) {
    // 正方发言 - 流式
    const proMessages = buildDebatePrompt(
      topic,
      "pro",
      round,
      round,
      previousArguments
    );

    let proFullContent = "";
    const proChunks: string[] = [];

    await callGLMStream(proMessages, (chunk) => {
      proChunks.push(chunk);
    }, 0.95);

    proFullContent = sanitizeContent(proChunks.join(""));

    // 打字机效果逐字显示
    for (let i = 0; i < proFullContent.length; i++) {
      const partialContent = proFullContent.slice(0, i + 1);
      onProUpdate(round, partialContent);
      await new Promise(resolve => setTimeout(resolve, safeDelay));
    }

    previousArguments.push(`正方${["一辩", "二辩", "三辩"][round - 1]}：${proFullContent}`);

    // 触发正方TTS
    onProComplete?.(round, proFullContent);

    // 反方发言 - 流式
    const conMessages = buildDebatePrompt(
      topic,
      "con",
      round,
      round,
      previousArguments
    );

    let conFullContent = "";
    const conChunks: string[] = [];

    await callGLMStream(conMessages, (chunk) => {
      conChunks.push(chunk);
    }, 0.95);

    conFullContent = sanitizeContent(conChunks.join(""));

    for (let i = 0; i < conFullContent.length; i++) {
      const partialContent = conFullContent.slice(0, i + 1);
      onConUpdate(round, partialContent);
      await new Promise(resolve => setTimeout(resolve, safeDelay));
    }

    previousArguments.push(`反方${["一辩", "二辩", "三辩"][round - 1]}：${conFullContent}`);

    // 触发反方TTS
    onConComplete?.(round, conFullContent);

    rounds.push({
      round,
      proPosition: round,
      conPosition: round,
      proContent: proFullContent,
      conContent: conFullContent,
    });

    onRoundComplete(round);
  }

  return rounds;
}
