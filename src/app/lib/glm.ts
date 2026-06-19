const API_KEY = "325d6fa364954d2e871c30ba95b553bd.KBdQdqgJgELJBhnv";
const API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

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

// 流式调用GLM API，通过回调逐字返回内容
export async function callGLMStream(
  messages: GLMMessage[],
  onChunk: (chunk: string) => void,
  temperature: number = 0.9
): Promise<void> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "glm-4-flash",
      messages,
      temperature,
      max_tokens: 2048,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GLM API error: ${error}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("无法读取响应流");
  }

  const decoder = new TextDecoder("utf-8");
  let buffer = "";

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
        if (delta) {
          onChunk(delta);
        }
      } catch {
        // 忽略解析失败的行
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
          if (delta) {
            onChunk(delta);
          }
        } catch {
          // 忽略
        }
      }
    }
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
  const positionName = ["一辩", "二辩", "三辩"][position - 1];

  const systemPrompt = `你是一位出色的辩论选手，代表${sideName}的${positionName}。你的任务是围绕辩题进行激烈、有说服力的辩论发言。

要求：
1. 语言通俗易懂，多用生活中的例子和比喻
2. 观点鲜明，论证有力，逻辑清晰
3. 语气要有辩论的激烈感，可以适当反驳对方观点
4. 内容要有深度，但不能过于学术化
5. 每次发言控制在200-400字左右
6. 要用中文回答

辩题：${topic}`;

  const messages: GLMMessage[] = [
    { role: "system", content: systemPrompt },
  ];

  if (previousArguments.length > 0) {
    messages.push({
      role: "user",
      content: `之前的辩论内容：\n${previousArguments.join("\n\n")}\n\n现在轮到${sideName}${positionName}进行第${round}轮发言，请继续展开论述。`,
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

    proFullContent = proChunks.join("");

    // 打字机效果逐字显示
    for (let i = 0; i < proFullContent.length; i++) {
      const partialContent = proFullContent.slice(0, i + 1);
      onProUpdate(round, partialContent);
      await new Promise(resolve => setTimeout(resolve, typewriterDelay));
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

    conFullContent = conChunks.join("");

    for (let i = 0; i < conFullContent.length; i++) {
      const partialContent = conFullContent.slice(0, i + 1);
      onConUpdate(round, partialContent);
      await new Promise(resolve => setTimeout(resolve, typewriterDelay));
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