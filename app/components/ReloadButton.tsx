"use client";

import React from "react";
import { RotateCcw } from "lucide-react";

export default function ReloadButton() {
  const handleReload = () => {
    window.location.href = window.location.pathname + "?t=" + Date.now();
  };

  return (
    <button
      type="button"
      onClick={handleReload}
      onTouchEnd={(e) => {
        e.preventDefault();
        handleReload();
      }}
      style={{
        WebkitUserSelect: "none",
        userSelect: "none",
        WebkitTouchCallout: "none",
      }}
      className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 px-2.5 py-1.5 rounded-xl border border-slate-200 transition-all active:scale-95 cursor-pointer select-none touch-manipulation"
      title="최신 코드로 새로고침"
    >
      <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
      <span>새로고침(v4.0 - AI 비전)</span>
    </button>
  );
}
