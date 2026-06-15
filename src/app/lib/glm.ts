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

export async function callGLM(
  messages: GLMMessage[],
  temperature: number = 0.9
): Promise<string> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "glm-4.5-flash",
      messages,
      temperature,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GLM API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
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

// 客户端直接调用GLM API生成完整辩论
export async function generateDebate(topic: string): Promise<DebateRound[]> {
  const rounds: DebateRound[] = [];
  const previousArguments: string[] = [];

  for (let round = 1; round <= 3; round++) {
    // 正方发言
    const proMessages = buildDebatePrompt(
      topic,
      "pro",
      round,
      round,
      previousArguments
    );
    const proContent = await callGLM(proMessages, 0.95);

    previousArguments.push(`正方${["一辩", "二辩", "三辩"][round - 1]}：${proContent}`);

    // 反方发言
    const conMessages = buildDebatePrompt(
      topic,
      "con",
      round,
      round,
      previousArguments
    );
    const conContent = await callGLM(conMessages, 0.95);

    previousArguments.push(`反方${["一辩", "二辩", "三辩"][round - 1]}：${conContent}`);

    rounds.push({
      round,
      proPosition: round,
      conPosition: round,
      proContent,
      conContent,
    });
  }

  return rounds;
}
