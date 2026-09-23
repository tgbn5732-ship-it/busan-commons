import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const { apiKey } = await req.json();

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json(
        { error: "API 키를 입력해주세요." },
        { status: 400 }
      );
    }

    const cleanKey = apiKey.trim();
    if (!cleanKey.startsWith("AIzaSy") && !cleanKey.startsWith("AQ.") && cleanKey.length < 20) {
      return NextResponse.json(
        { error: "유효한 Google Gemini API 키 형식이 아닙니다 (AIzaSy 또는 AQ. 로 시작해야 합니다)." },
        { status: 400 }
      );
    }

    // Set in runtime process.env immediately
    process.env.GEMINI_API_KEY = cleanKey;

    // Persist to .env.local on the server
    const envPath = path.join(process.cwd(), ".env.local");
    let envContent = "";
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf-8");
    }

    // Replace existing GEMINI_API_KEY or append
    if (envContent.includes("GEMINI_API_KEY=")) {
      envContent = envContent.replace(
        /GEMINI_API_KEY=.*/g,
        `GEMINI_API_KEY="${cleanKey}"`
      );
    } else {
      envContent += `\nGEMINI_API_KEY="${cleanKey}"\n`;
    }

    fs.writeFileSync(envPath, envContent, "utf-8");

    return NextResponse.json({
      success: true,
      message: "서버에 Google Gemini API 키가 안전하게 영구 저장되었습니다. 이제 스마트폰에서도 자동으로 AI 비전이 작동합니다!",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "키 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function GET() {
  const hasKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  return NextResponse.json({ hasKey });
}
