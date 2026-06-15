import { NextRequest, NextResponse } from "next/server";
import { callGLM, buildDebatePrompt } from "@/app/lib/glm";

export interface DebateRound {
  round: number;
  proPosition: number;
  conPosition: number;
  proContent: string;
  conContent: string;
}

export async function POST(request: NextRequest) {
  try {
    const { topic } = await request.json();

    if (!topic) {
      return NextResponse.json({ error: "缺少辩题" }, { status: 400 });
    }

    const rounds: DebateRound[] = [];
    const previousArguments: string[] = [];

    for (let round = 1; round <= 3; round++) {
      const proMessages = buildDebatePrompt(
        topic,
        "pro",
        round,
        round,
        previousArguments
      );
      const proContent = await callGLM(proMessages, 0.95);

      previousArguments.push(`正方${["一辩", "二辩", "三辩"][round - 1]}：${proContent}`);

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

    return NextResponse.json({ rounds });
  } catch (error) {
    console.error("Debate API error:", error);
    return NextResponse.json(
      { error: "辩论生成失败，请稍后重试" },
      { status: 500 }
    );
  }
}
