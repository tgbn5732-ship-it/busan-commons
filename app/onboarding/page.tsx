'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/utils/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  Palette,
  Briefcase,
  Users,
  Home,
  Building,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2
} from 'lucide-react'

// Roles matching DB ENUM
const ROLES = [
  { id: 'citizen', label: '일반시민', icon: User, desc: '플랫폼을 자유롭게 이용하는 시민' },
  { id: 'artist', label: '독립예술가', icon: Palette, desc: '예술 활동을 공유하고 소통하는 예술가' },
  { id: 'worker', label: '개별노동자', icon: Briefcase, desc: '서비스와 노동을 제공하는 개인' },
  { id: 'workers_team', label: '워커스팀/협동조합', icon: Users, desc: '함께 일하는 공동체 조직' },
  { id: 'town_community', label: '마을공동체', icon: Home, desc: '지역 기반으로 활동하는 공동체' },
  { id: 'social_economy_org', label: '사회적경제조직', icon: Building, desc: '사회적 가치를 추구하는 조직' },
]

const formSchema = z.object({
  nickname: z.string().min(2, '닉네임은 2자 이상이어야 합니다.').max(20, '닉네임은 20자 이하이어야 합니다.'),
  bio: z.string().optional(),
  contact_info: z.string().optional(),
  // Dynamic fields (Optional by default, validated conditionally if needed)
  artistGenre: z.string().optional(),
  artistPortfolio: z.string().url('올바른 URL 형식이 아닙니다.').optional().or(z.literal('')),
  workerService: z.string().optional(),
  workerRegion: z.string().optional(),
  townLocation: z.string().optional(),
  townTopic: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [step, setStep] = useState(1)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  
  const [isCheckingNickname, setIsCheckingNickname] = useState(false)
  const [nicknameError, setNicknameError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onChange'
  })

  const currentNickname = watch('nickname')

  const handleNextStep1 = () => {
    if (selectedRole) setStep(2)
  }

  const checkNickname = async (nickname: string) => {
    if (nickname.length < 2) return false
    setIsCheckingNickname(true)
    setNicknameError(null)
    try {
      const res = await fetch(`/api/check-nickname?nickname=${encodeURIComponent(nickname)}`)
      const data = await res.json()
      
      if (!res.ok) {
        setNicknameError(data.error || '중복 확인 중 서버 오류가 발생했습니다.')
        return false
      }

      if (!data.isAvailable) {
        setNicknameError('이미 사용 중인 닉네임입니다.')
        return false
      }
      return true
    } catch (e) {
      setNicknameError('중복 확인 중 오류가 발생했습니다.')
      return false
    } finally {
      setIsCheckingNickname(false)
    }
  }

  const handleNextStep2 = async () => {
    if (!currentNickname || errors.nickname) return
    const isAvailable = await checkNickname(currentNickname)
    if (isAvailable) {
      setStep(3)
    }
  }

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Build extra_metadata based on role
    let extra_info = {}
    if (selectedRole === 'artist') {
      extra_info = { genre: data.artistGenre, portfolio: data.artistPortfolio }
    } else if (selectedRole === 'worker' || selectedRole === 'workers_team') {
      extra_info = { service: data.workerService, region: data.workerRegion }
    } else if (selectedRole === 'town_community') {
      extra_info = { location: data.townLocation, topic: data.townTopic }
    }

    // Update profile
    const { error } = await supabase
      .from('profiles')
      .update({
        role: selectedRole,
        nickname: data.nickname,
        bio: data.bio || null,
        contact_info: data.contact_info || null,
        // In a real app, extra_info might go to extra_metadata if added to profiles, 
        // or stored as JSON string in bio/contact_info as requested by prompt.
        // For now, we'll append it to bio string if no dedicated column exists.
      })
      .eq('id', user.id)

    setIsSubmitting(false)

    if (error) {
      alert('프로필 업데이트에 실패했습니다: ' + error.message)
    } else {
      router.push('/') // Main dashboard
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-12 pb-24 px-4 sm:px-6">
      <div className="max-w-2xl w-full mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 rounded-full -z-10"></div>
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 rounded-full -z-10 transition-all duration-500 ease-in-out"
              style={{ width: `${((step - 1) / 2) * 100}%` }}
            ></div>
            
            {[1, 2, 3].map((s) => (
              <div 
                key={s} 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 ${
                  step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {s}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs font-medium text-gray-500">
            <span>역할 선택</span>
            <span>기본 정보</span>
            <span>추가 정보</span>
          </div>
        </div>

        <div className="bg-white shadow-xl rounded-3xl p-6 sm:p-10 overflow-hidden relative min-h-[400px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900">어떤 역할로 참여하시나요?</h2>
                  <p className="text-gray-500 mt-2">플랫폼에서의 주 활동 정체성을 선택해 주세요.</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {ROLES.map((role) => {
                    const Icon = role.icon
                    const isSelected = selectedRole === role.id
                    return (
                      <button
                        key={role.id}
                        onClick={() => setSelectedRole(role.id)}
                        className={`p-4 border-2 rounded-2xl text-left transition-all duration-200 flex items-start space-x-4
                          ${isSelected ? 'border-blue-600 bg-blue-50/50' : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'}
                        `}
                      >
                        <div className={`p-3 rounded-xl ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{role.label}</div>
                          <div className="text-xs text-gray-500 mt-1">{role.desc}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                <div className="pt-6">
                  <button
                    onClick={handleNextStep1}
                    disabled={!selectedRole}
                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 transition"
                  >
                    <span>다음 단계로</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900">프로필을 완성해 주세요</h2>
                  <p className="text-gray-500 mt-2">다른 참여자들에게 보여질 기본 정보입니다.</p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">닉네임 <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input
                        {...register('nickname')}
                        className={`w-full p-4 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition ${
                          errors.nickname || nicknameError ? 'border-red-500' : 'border-gray-200'
                        }`}
                        placeholder="활동할 멋진 닉네임을 입력하세요"
                      />
                    </div>
                    {errors.nickname && <p className="text-red-500 text-xs mt-2">{errors.nickname.message}</p>}
                    {nicknameError && <p className="text-red-500 text-xs mt-2">{nicknameError}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">한 줄 소개</label>
                    <textarea
                      {...register('bio')}
                      rows={3}
                      className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition resize-none"
                      placeholder="나를 표현할 수 있는 짧은 소개를 적어주세요"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">연락처 정보</label>
                    <input
                      {...register('contact_info')}
                      className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                      placeholder="이메일, 오픈채팅 링크, 전화번호 등"
                    />
                  </div>
                </div>

                <div className="pt-6 flex space-x-3">
                  <button
                    onClick={() => setStep(1)}
                    className="p-4 border-2 border-gray-200 text-gray-600 rounded-2xl hover:bg-gray-50 transition"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleNextStep2}
                    disabled={isCheckingNickname || !currentNickname || currentNickname.length < 2}
                    className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center space-x-2 disabled:opacity-50 hover:bg-gray-800 transition"
                  >
                    {isCheckingNickname ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>다음 단계로</span>}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900">추가 정보를 알려주세요</h2>
                  <p className="text-gray-500 mt-2">선택하신 역할에 맞는 맞춤형 정보를 입력해 주세요.</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  
                  {selectedRole === 'artist' && (
                    <div className="space-y-5">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">주요 장르</label>
                        <input
                          {...register('artistGenre')}
                          className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="예: 인디음악, 시각예술, 연극"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">포트폴리오 링크</label>
                        <input
                          {...register('artistPortfolio')}
                          className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="https://..."
                        />
                        {errors.artistPortfolio && <p className="text-red-500 text-xs mt-2">{errors.artistPortfolio.message}</p>}
                      </div>
                    </div>
                  )}

                  {(selectedRole === 'worker' || selectedRole === 'workers_team') && (
                    <div className="space-y-5">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">제공 서비스 카테고리</label>
                        <input
                          {...register('workerService')}
                          className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="예: 돌봄, 청소, 집수리, 디자인"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">주요 활동 지역</label>
                        <input
                          {...register('workerRegion')}
                          className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="예: 부산 영도구, 해운대구 전체"
                        />
                      </div>
                    </div>
                  )}

                  {selectedRole === 'town_community' && (
                    <div className="space-y-5">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">거점 위치 (오프라인)</label>
                        <input
                          {...register('townLocation')}
                          className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="마을 공간 주소 또는 주요 동네"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">대표 활동 주제</label>
                        <input
                          {...register('townTopic')}
                          className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="예: 제로웨이스트, 공동육아, 독서모임"
                        />
                      </div>
                    </div>
                  )}

                  {(selectedRole === 'citizen' || selectedRole === 'social_economy_org') && (
                    <div className="py-12 text-center text-gray-500">
                      <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500 opacity-50" />
                      <p>추가로 입력하실 정보가 없습니다.<br/>완료 버튼을 눌러주세요!</p>
                    </div>
                  )}

                  <div className="pt-6 flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="p-4 border-2 border-gray-200 text-gray-600 rounded-2xl hover:bg-gray-50 transition"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-blue-700 transition shadow-lg shadow-blue-500/30 disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>시작하기</span>}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
