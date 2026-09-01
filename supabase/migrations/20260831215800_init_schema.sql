-- ==========================================
-- 부산 커먼즈플랫폼 통합 DB 스키마 & RLS 정책
-- ==========================================

-- 1. 커스텀 ENUM 타입 정의
-- ==========================================
-- 사용자 역할
CREATE TYPE public.user_role AS ENUM (
  'citizen',            -- 일반시민
  'artist',             -- 독립예술가
  'worker',             -- 개별노동자
  'workers_team',       -- 워커스팀/협동조합
  'town_community',     -- 마을공동체
  'social_economy_org', -- 사회적경제조직
  'admin'               -- 관리자
);

-- 스페이스(공간/팀/상점) 카테고리
CREATE TYPE public.space_category AS ENUM (
  'market',  -- 커먼즈장터
  'artist',  -- 예술인포폴
  'workers', -- 워커스공동사업
  'town'     -- 마을거점공간
);

-- 빈고 프로젝트 상태
CREATE TYPE public.project_status AS ENUM (
  'review',    -- 심사중
  'funding',   -- 출자모집중
  'active',    -- 집행/진행중
  'completed'  -- 완료
);

-- ==========================================
-- 2. 테이블 스펙 정의
-- ==========================================

-- A. profiles (사용자 프로필)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role DEFAULT 'citizen',
  nickname text UNIQUE NOT NULL,
  avatar_url text,
  bio text,
  contact_info text,
  created_at timestamp with time zone DEFAULT now()
);

-- B. communities (사용자 자치형 소모임/커뮤니티)
CREATE TABLE public.communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  banner_url text,
  creator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- C. community_members (커뮤니티 가입 멤버 매핑 테이블)
CREATE TABLE public.community_members (
  community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (community_id, profile_id)
);

-- D. spaces (장터 상점 / 예술인 포폴 / 워커스 팀 / 마을 공간 통합 테이블)
CREATE TABLE public.spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category public.space_category NOT NULL,
  title text NOT NULL,
  description text,
  cover_image text,
  contact_link text,
  location text,
  extra_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- E. posts (커먼즈 이슈 및 커뮤니티 게시글 공통 테이블)
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE, -- null이면 전체 공개
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  images text[],
  is_announcement boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- F. comments (게시글 및 스페이스 양방향 소통 댓글 테이블)
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  space_id uuid REFERENCES public.spaces(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now()
);

-- G. bbingo_projects (빈고 공유자본 제안서 테이블)
CREATE TABLE public.bbingo_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proponent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  funding_goal numeric,
  current_funding numeric DEFAULT 0,
  status public.project_status DEFAULT 'review',
  applied_at timestamp with time zone DEFAULT now()
);

-- ==========================================
-- 3. 회원가입 자동 온보딩 트리거
-- ==========================================

-- 신규 사용자 가입 시 profiles 자동 생성 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname)
  VALUES (
    NEW.id,
    -- 이메일 앞부분을 임시 닉네임으로 사용하거나, 고유 난수 추가
    COALESCE(
      NEW.raw_user_meta_data->>'nickname',
      'user_' || substr(NEW.id::text, 1, 8)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.users에 신규 행 추가 시 트리거 실행
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ==========================================
-- 4. Row Level Security (RLS) 보안 정책
-- ==========================================

-- 모든 테이블에 RLS 활성화
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bbingo_projects ENABLE ROW LEVEL SECURITY;

-- [ profiles 정책 ]
-- 누구나 조회 가능
CREATE POLICY "Profiles are viewable by everyone" 
  ON public.profiles FOR SELECT USING (true);
-- 본인 레코드만 수정 가능
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- [ communities 정책 ]
-- 누구나 조회 가능
CREATE POLICY "Communities are viewable by everyone" 
  ON public.communities FOR SELECT USING (true);
-- 인증된 사용자만 생성 가능
CREATE POLICY "Authenticated users can create communities" 
  ON public.communities FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- 생성자만 수정/삭제 가능
CREATE POLICY "Creators can update own communities" 
  ON public.communities FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Creators can delete own communities" 
  ON public.communities FOR DELETE USING (auth.uid() = creator_id);

-- [ spaces 정책 ]
-- 누구나 조회 가능
CREATE POLICY "Spaces are viewable by everyone" 
  ON public.spaces FOR SELECT USING (true);
-- 'citizen'을 제외한 가치 주체들만 생성 및 수정 가능 (본인 소유의 space)
CREATE POLICY "Value subjects can create spaces" 
  ON public.spaces FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role != 'citizen'::public.user_role
    )
  );
CREATE POLICY "Value subjects can update own spaces" 
  ON public.spaces FOR UPDATE USING (
    auth.uid() = owner_id AND 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role != 'citizen'::public.user_role
    )
  );

-- [ posts 정책 ]
-- 누구나 조회 가능
CREATE POLICY "Posts are viewable by everyone" 
  ON public.posts FOR SELECT USING (true);
-- 인증된 사용자만 작성 가능
CREATE POLICY "Authenticated users can create posts" 
  ON public.posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- 작성자만 수정 및 삭제 가능
CREATE POLICY "Authors can update own posts" 
  ON public.posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors can delete own posts" 
  ON public.posts FOR DELETE USING (auth.uid() = author_id);

-- [ comments 정책 ]
-- 누구나 조회 가능
CREATE POLICY "Comments are viewable by everyone" 
  ON public.comments FOR SELECT USING (true);
-- 인증된 사용자만 작성 가능
CREATE POLICY "Authenticated users can create comments" 
  ON public.comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- 작성자만 수정 및 삭제 가능
CREATE POLICY "Authors can update own comments" 
  ON public.comments FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors can delete own comments" 
  ON public.comments FOR DELETE USING (auth.uid() = author_id);

-- bbingo_projects에 대한 기본 정책 추가 (명세에 명시되진 않았지만 RLS는 활성화되었으므로 기본 SELECT는 열어둡니다)
CREATE POLICY "Bbingo projects are viewable by everyone" 
  ON public.bbingo_projects FOR SELECT USING (true);
CREATE POLICY "Users can create bbingo projects" 
  ON public.bbingo_projects FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Proponents can update own bbingo projects" 
  ON public.bbingo_projects FOR UPDATE USING (auth.uid() = proponent_id);
