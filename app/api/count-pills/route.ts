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

    const systemPrompt = `You are a professional pharmacy dispensing AI and precision pill counter.
Your task is to locate and count EVERY SINGLE pill, tablet, or capsule in the image with 100% precision. In pharmacy dispensing, missing even a single pill is a serious dispensing hazard.

CRITICAL DISPENSING RULES:
1. TOUCHING & CLUSTERED PILLS (CRITICAL):
   Pills often lie side-by-side, touch each other, or slightly overlap on dispensing trays.
   Look closely at individual pill contours, rounded ends, seams, bevels, and division lines.
   If two or more pills touch or lie adjacent, EACH individual pill MUST be counted separately with its own center coordinate.
   NEVER combine two touching pills into one.
2. HIGH-DENSITY & LARGE BATCHES (Up to 100+ PILLS):
   Scan the image methodically row by row from top to bottom, left to right.
   Ensure every single pill body is located without omitting any pills near edges, in shadows, or tightly clustered.
3. ALL PILL TYPES & COLORS:
   Count all pills regardless of whether they are capsules, round tablets, oblong caplets, white, pink, green, yellow, or clear.
4. EXCLUDE NON-PILLS:
   Ignore reflections, glare, knife marks, shadows, or background tray textures.
5. RETURN FORMAT:
   Return ONLY valid JSON in this format:
{
  "count": <exact total integer number of pills>,
  "pills": [
    [<x 0-100>, <y 0-100>]
  ]
}
Rule: The "count" MUST strictly match the exact number of coordinate items in the "pills" array.`;

    // High-accuracy models only (exclude lightweight models that hallucinate pill counts)
    const modelsToTry = [
      "gemini-3.5-flash",
      "gemini-3.6-flash",
      "gemini-3-flash-preview",
      "gemini-flash-latest",
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
                temperature: 0.0,
                thinkingConfig: {
                  thinkingBudget: 64,
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
        let pillsRaw: unknown[] = [];
        let parsedCount = 0;

        if (Array.isArray(parsed)) {
          pillsRaw = parsed;
          parsedCount = parsed.length;
        } else if (parsed && typeof parsed === "object") {
          const obj = parsed as Record<string, unknown>;
          if (Array.isArray(obj.pills)) {
            pillsRaw = obj.pills;
          }
          if (typeof obj.count === "number") {
            parsedCount = obj.count;
          }
        }

        const pills: PillDetectionResult[] = pillsRaw.map(
          (p: unknown, idx: number) => {
            let x = 50;
            let y = 50;
            if (Array.isArray(p)) {
              x = Number(p[0]) || 0;
              y = Number(p[1]) || 0;
            } else if (p && typeof p === "object") {
              const item = p as Record<string, unknown>;
              if (Array.isArray(item.point)) {
                // [y, x] or [x, y]
                const p0 = Number(item.point[0]) || 0;
                const p1 = Number(item.point[1]) || 0;
                y = p0;
                x = p1;
              } else {
                x = Number(item.x) || 0;
                y = Number(item.y) || 0;
              }
            }

            // Normalize coordinates from 0-1000 scale to 0-100%
            if (x > 100) x = Math.round(x / 10);
            if (y > 100) y = Math.round(y / 10);

            return {
              id: idx + 1,
              x: Math.min(100, Math.max(0, Math.round(x))),
              y: Math.min(100, Math.max(0, Math.round(y))),
              radius: 14,
              label: "알약",
            };
          }
        );

        // Authoritative count matches the detected pills if available
        const finalCount = pills.length > 0 ? pills.length : parsedCount;

        return NextResponse.json({
          count: finalCount,
          pills,
          modelUsed: model,
          success: true,
        });
      } catch (err) {
        lastError = err;
      }
    }

    const errMsg = lastError instanceof Error ? lastError.message : String(lastError);
    const isQuota =
      errMsg.includes("429") ||
      errMsg.includes("quota") ||
      errMsg.includes("RESOURCE_EXHAUSTED");

    return NextResponse.json(
      {
        error: isQuota ? "QUOTA_EXCEEDED" : "AI_PROCESSING_FAILED",
        message: isQuota
          ? "구글 AI 무료 계정의 일일 호출 한도(20회)가 모두 소진되었습니다. 결제 계정 등록 시 무제한(1,000회당 약 40원) 이용이 가능합니다."
          : errMsg,
      },
      { status: isQuota ? 429 : 500 }
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
