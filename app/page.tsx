import PillCameraUploader from "./components/PillCameraUploader";
import ReloadButton from "./components/ReloadButton";
import { Pill, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-start p-0 sm:p-4 md:py-8 font-sans antialiased text-slate-800">
      {/* Mobile-sized Screen Frame */}
      <main className="w-full sm:max-w-md bg-white sm:rounded-3xl shadow-sm sm:shadow-md border-0 sm:border border-slate-200/80 min-h-screen sm:min-h-[820px] flex flex-col overflow-hidden">
        
        {/* App Header (Top Title) */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <Pill className="w-5 h-5 -rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  알약 렌즈
                </h1>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200 flex items-center gap-0.5">
                  <Zap className="w-2.5 h-2.5 text-emerald-600 fill-emerald-600" />
                  <span>약국 고속 카운터</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                스마트폰 카메라로 빠르게 알약 개수 카운팅
              </p>
            </div>
          </div>

          <div className="flex items-center">
            <ReloadButton />
          </div>
        </header>

        {/* Center Content Area */}
        <section className="flex-1 px-5 py-5 flex flex-col justify-start">
          <div className="mb-3.5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800">조제 알약 촬영</h2>
              <p className="text-xs text-slate-500">
                촬영 즉시 개수가 카운트되며 반복 작업이 가능합니다.
              </p>
            </div>
          </div>

          {/* Pill Camera & Gallery Uploader with Fast Repetitive Controls */}
          <PillCameraUploader />
        </section>

        {/* Concise Footer */}
        <footer className="mt-auto px-5 py-3.5 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400">
            약국 조제 및 재고 검수용 고속 알약 카운팅 시스템
          </p>
        </footer>
      </main>
    </div>
  );
}
