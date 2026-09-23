import { NextRequest, NextResponse } from "next/server";

interface PillDetectionResult {
  id: number;
  x: number; // 0 to 100 (%)
  y: number; // 0 to 100 (%)
  radius?: number;
  label?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, apiKey: clientApiKey } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: "이미지 데이터가 전달되지 않았습니다." },
        { status: 400 }
      );
    }

    // Determine API Key: server environment or client-provided key
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      clientApiKey;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "API_KEY_REQUIRED",
          message:
            "Google Gemini API 키가 필요합니다. 상단 [AI 설정]에서 무료 API 키를 등록해 주세요.",
        },
        { status: 401 }
      );
    }

    // Extract raw base64 data and mime type
    let mimeType = "image/jpeg";
    let cleanBase64 = imageBase64;
    if (imageBase64.includes(";base64,")) {
      const parts = imageBase64.split(";base64,");
      mimeType = parts[0].replace("data:", "");
      cleanBase64 = parts[1];
    }

    const systemPrompt = `You are a high-speed pharmacy dispensing assistant and pill counter.
Your task is to locate and count EVERY SINGLE pill, tablet, or capsule in the image with 100% precision.

CRITICAL INSTRUCTIONS:
1. Count ALL pills, tablets, and capsules, even if touching, slightly overlapping, or different colors.
2. Ignore shadows, knife marks, glare, reflections, or empty tray surfaces.
3. For maximum speed, return ONLY this compact JSON format:
{
  "count": <total integer number of pills>,
  "pills": [
    [<x 0-100>, <y 0-100>]
  ]
}
where each item in pills is a 2-element integer array [x, y] representing center percentages from 0 to 100.`;

    // Call modern Gemini Flash Vision models (fallback order)
    const modelsToTry = [
      "gemini-3.5-flash",
      "gemini-3.6-flash",
      "gemini-flash-latest",
      "gemini-2.5-flash"
    ];
    let lastError: unknown = null;

    for (const model of modelsToTry) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: systemPrompt },
                    {
                      inlineData: {
                        mimeType: mimeType,
                        data: cleanBase64,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1,
                thinkingConfig: {
                  thinkingBudget: 0,
                },
              },
            }),
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          lastError = new Error(`Gemini API Error (${model}): ${response.status} - ${errText}`);
          continue;
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        const contentText = candidate?.content?.parts?.[0]?.text;

        if (!contentText) {
          lastError = new Error("AI로부터 텍스트 응답을 수신하지 못했습니다.");
          continue;
        }

        const parsed = JSON.parse(contentText);
        const pills: PillDetectionResult[] = (parsed.pills || []).map(
          (p: unknown, idx: number) => {
            let x = 0;
            let y = 0;
            if (Array.isArray(p)) {
              x = Math.round(Number(p[0]));
              y = Math.round(Number(p[1]));
            } else if (p && typeof p === "object") {
              const obj = p as { x?: number; y?: number };
              x = Math.round(Number(obj.x) || 0);
              y = Math.round(Number(obj.y) || 0);
            }
            return {
              id: idx + 1,
              x,
              y,
              radius: 14,
              label: "알약",
            };
          }
        );

        return NextResponse.json({
          count: parsed.count || pills.length,
          pills,
          modelUsed: model,
          success: true,
        });
      } catch (err) {
        lastError = err;
      }
    }

    return NextResponse.json(
      {
        error: "AI_PROCESSING_FAILED",
        message: lastError instanceof Error ? lastError.message : "AI 비전 분석 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: "SERVER_ERROR",
        message: err instanceof Error ? err.message : "서버 처리 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
