import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const nickname = searchParams.get('nickname')

  if (!nickname) {
    return NextResponse.json({ error: 'Nickname is required' }, { status: 400 })
  }

  const supabase = await createClient()

  // 닉네임 중복 체크 (대소문자 구분 없이 혹은 정확히 매치 등)
  const { data, error } = await supabase
    .from('profiles')
    .select('nickname')
    .eq('nickname', nickname)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "no rows returned", which means it's available!
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const isAvailable = !data // data가 없으면 사용 가능(true)

  return NextResponse.json({ isAvailable })
}
