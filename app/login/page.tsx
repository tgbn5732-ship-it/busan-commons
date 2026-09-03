'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { Mail, Lock, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/onboarding')
    router.refresh()
  }

  const handleOAuthLogin = async (provider: 'kakao' | 'github') => {
    // Note: Naver requires custom setup, using github as a placeholder if needed, 
    // or just 'kakao' for now.
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-8">
          부산 커먼즈플랫폼 로그인
        </h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="hello@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && <div className="text-red-500 text-sm text-center">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex justify-center items-center"
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : '이메일로 로그인'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center space-x-4">
          <div className="h-px bg-gray-300 flex-1"></div>
          <span className="text-gray-500 text-sm">또는</span>
          <div className="h-px bg-gray-300 flex-1"></div>
        </div>

        <div className="mt-6 space-y-3">
          <button
            onClick={() => handleOAuthLogin('kakao')}
            disabled
            title="현재 카카오 로그인 연동 준비 중입니다."
            className="w-full bg-[#FEE500] text-[#000000] p-3 rounded-xl font-semibold transition flex justify-center items-center opacity-50 cursor-not-allowed"
          >
            카카오로 시작하기 (준비 중)
          </button>
          {/* 네이버는 Supabase OAuth에서 공식 지원하지 않아 커스텀 혹은 다른 프로바이더 사용이 필요할 수 있습니다. */}
        </div>

        <div className="mt-8 text-center text-sm text-gray-600">
          계정이 없으신가요?{' '}
          <Link href="/register" className="text-blue-600 font-semibold hover:underline">
            회원가입
          </Link>
        </div>
      </div>
    </div>
  )
}
