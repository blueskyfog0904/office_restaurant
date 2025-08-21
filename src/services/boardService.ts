import { supabase } from './supabaseClient';

export interface Post {
  id: string;
  author_id: string;
  title: string;
  content: string;
  board_type: 'notice' | 'free' | 'suggestion';
  view_count: number;
  like_count: number;
  is_pinned: boolean;
  status?: 'pending' | 'in_progress' | 'completed' | 'rejected';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    nickname: string;
    email: string;
  };
}

export interface PostCreateRequest {
  title: string;
  content: string;
  board_type: 'notice' | 'free' | 'suggestion';
}

export interface PostUpdateRequest {
  title?: string;
  content?: string;
  board_type?: 'notice' | 'free' | 'suggestion';
  status?: 'pending' | 'in_progress' | 'completed' | 'rejected';
  is_pinned?: boolean;
  is_active?: boolean;
}

export interface PostListResponse {
  success: boolean;
  message: string;
  data: Post[];
  pagination: {
    page: number;
    size: number;
    total: number;
    pages: number;
  };
}

// 유틸: 타임아웃 래퍼(네트워크 고착 방지)
const withTimeout = async <T,>(promise: Promise<T>, ms = 12000): Promise<T> =>
  Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.')), ms))
  ]);

// Supabase 쿼리 빌더를 PromiseLike로 처리하기 위한 헬퍼
const withTimeoutQuery = async <T,>(builder: any, ms = 12000): Promise<T> =>
  withTimeout<T>(Promise.resolve(builder as any), ms);

// 게시글 목록 조회
export const getPosts = async (
  boardType: 'notice' | 'free' | 'suggestion',
  page: number = 1,
  size: number = 20
): Promise<PostListResponse> => {
  const from = (page - 1) * size;
  const to = from + size - 1;

  const { data, error, count } = await withTimeoutQuery<any>(
    supabase
      .from('posts')
      .select('*', { count: 'exact' })
      .eq('board_type', boardType)
      .eq('is_active', true)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to)
  );

  if (error) {
    throw new Error(`게시글 조회 실패: ${error.message}`);
  }

  // 작성자 정보 별도 조회
  const postsWithAuthors = await Promise.all(
    (data || []).map(async (post: any) => {
      const { data: profile } = await withTimeoutQuery<any>(
        supabase
          .from('profiles')
          .select('nickname, email')
          .eq('user_id', post.author_id)
          .single()
      );

      return {
        ...post,
        author: profile || { nickname: '알 수 없음', email: '' }
      };
    })
  );

  return {
    success: true,
    message: '게시글 조회 성공',
    data: postsWithAuthors,
    pagination: {
      page,
      size,
      total: count || 0,
      pages: Math.ceil((count || 0) / size),
    },
  };
};

// 공지사항 조회 (최신 5개)
export const getNotices = async (): Promise<Post[]> => {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('board_type', 'notice')
    .eq('is_active', true)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    throw new Error(`공지사항 조회 실패: ${error.message}`);
  }

  // 작성자 정보 별도 조회
  const postsWithAuthors = await Promise.all(
    (data || []).map(async (post) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('nickname, email')
        .eq('user_id', post.author_id)
        .single();

      return {
        ...post,
        author: profile || { nickname: '알 수 없음', email: '' }
      };
    })
  );

  return postsWithAuthors;
};

// 최신글 조회 (자유게시판 최신 10개)
export const getLatestPosts = async (): Promise<Post[]> => {
  const { data, error } = await withTimeoutQuery<any>(
    supabase
      .from('posts')
      .select('*')
      .eq('board_type', 'free')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10)
  );

  if (error) {
    throw new Error(`최신글 조회 실패: ${error.message}`);
  }

  // 작성자 정보 별도 조회
  const postsWithAuthors = await Promise.all(
    (data || []).map(async (post: any) => {
      const { data: profile } = await withTimeoutQuery<any>(
        supabase
          .from('profiles')
          .select('nickname, email')
          .eq('user_id', post.author_id)
          .single()
      );

      return {
        ...post,
        author: profile || { nickname: '알 수 없음', email: '' }
      };
    })
  );

  return postsWithAuthors;
};

// HOT게시글 조회 (조회수 10회 이상 또는 추천 10개 이상)
export const getHotPosts = async (): Promise<Post[]> => {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('is_active', true)
    .or('view_count.gte.10,like_count.gte.10')
    .order('view_count', { ascending: false })
    .order('like_count', { ascending: false })
    .limit(10);

  if (error) {
    throw new Error(`HOT게시글 조회 실패: ${error.message}`);
  }

  // 작성자 정보 별도 조회
  const postsWithAuthors = await Promise.all(
    (data || []).map(async (post) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('nickname, email')
        .eq('user_id', post.author_id)
        .single();

      return {
        ...post,
        author: profile || { nickname: '알 수 없음', email: '' }
      };
    })
  );

  return postsWithAuthors;
};

// 게시글 상세 조회
export const getPostById = async (id: string): Promise<Post> => {
  // 먼저 현재 게시글 정보를 가져옴
  const { data: currentPost, error: fetchError } = await supabase
    .from('posts')
    .select('view_count')
    .eq('id', id)
    .single();

  if (fetchError) {
    throw new Error(`게시글 조회 실패: ${fetchError.message}`);
  }

  // 조회수 증가
  await supabase
    .from('posts')
    .update({ view_count: (currentPost.view_count || 0) + 1 })
    .eq('id', id);

  // 전체 게시글 정보 조회
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (error) {
    throw new Error(`게시글 조회 실패: ${error.message}`);
  }

  // 작성자 정보 조회
  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, email')
    .eq('user_id', data.author_id)
    .single();

  return {
    ...data,
    author: profile || { nickname: '알 수 없음', email: '' }
  };
};

// 마지막 게시글 작성 시간 확인
export const checkPostCooldown = async (): Promise<{ canPost: boolean; remainingTime?: number }> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('로그인이 필요합니다.');
  }

  // 사용자의 마지막 게시글 작성 시간 조회
  const { data, error } = await supabase
    .from('posts')
    .select('created_at')
    .eq('author_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Cooldown check error:', error);
    return { canPost: true };
  }

  if (!data || data.length === 0) {
    return { canPost: true };
  }

  const lastPostTime = new Date(data[0].created_at);
  const now = new Date();
  const timeDiff = now.getTime() - lastPostTime.getTime();
  const cooldownTime = 60 * 1000; // 1분 (60초)

  if (timeDiff < cooldownTime) {
    const remainingTime = Math.ceil((cooldownTime - timeDiff) / 1000);
    return { canPost: false, remainingTime };
  }

  return { canPost: true };
};

// 게시글 작성
export const createPost = async (postData: PostCreateRequest): Promise<Post> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('로그인이 필요합니다.');
  }

  // 쿨다운 시간 확인
  const cooldownCheck = await checkPostCooldown();
  if (!cooldownCheck.canPost) {
    throw new Error(`게시글 작성은 ${cooldownCheck.remainingTime}초 후에 가능합니다.`);
  }

  console.log('Creating post with data:', {
    author_id: user.id,
    title: postData.title,
    content: postData.content,
    board_type: postData.board_type,
  });

  const { data, error } = await supabase
    .from('posts')
    .insert({
      author_id: user.id,
      title: postData.title,
      content: postData.content,
      board_type: postData.board_type,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Post creation error:', error);
    // RLS/권한/네트워크 등 오류 메시지를 사용자 친화적으로 변환
    const friendly = error.message?.includes('not authorized')
      ? '권한이 없습니다. 로그인 상태를 확인해주세요.'
      : error.message || '알 수 없는 오류가 발생했습니다.';
    throw new Error(`게시글 작성 실패: ${friendly}`);
  }

  console.log('Post created successfully:', data);

  // 작성자 정보 조회
  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, email')
    .eq('user_id', data.author_id)
    .single();

  return {
    ...data,
    author: profile || { nickname: '알 수 없음', email: '' }
  };
};

// 게시글 수정
export const updatePost = async (id: string, postData: PostUpdateRequest): Promise<Post> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('로그인이 필요합니다.');
  }

  const { data, error } = await supabase
    .from('posts')
    .update({
      ...postData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('author_id', user.id)
    .select('*')
    .single();

  if (error) {
    throw new Error(`게시글 수정 실패: ${error.message}`);
  }

  // 작성자 정보 조회
  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, email')
    .eq('user_id', data.author_id)
    .single();

  return {
    ...data,
    author: profile || { nickname: '알 수 없음', email: '' }
  };
};

// 게시글 삭제
export const deletePost = async (id: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('로그인이 필요합니다.');
  }

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id)
    .eq('author_id', user.id);

  if (error) {
    throw new Error(`게시글 삭제 실패: ${error.message}`);
  }
};

// 게시글 좋아요 토글
export const toggleLike = async (id: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('로그인이 필요합니다.');
  }

  // 먼저 현재 좋아요 수를 가져옴
  const { data: currentPost, error: fetchError } = await supabase
    .from('posts')
    .select('like_count')
    .eq('id', id)
    .single();

  if (fetchError) {
    throw new Error(`좋아요 실패: ${fetchError.message}`);
  }

  // 좋아요 수 증가
  const { error } = await supabase
    .from('posts')
    .update({ 
      like_count: (currentPost.like_count || 0) + 1 
    })
    .eq('id', id);

  if (error) {
    throw new Error(`좋아요 실패: ${error.message}`);
  }
};

// 관리자용 게시글 관리
export const adminUpdatePost = async (id: string, postData: PostUpdateRequest): Promise<Post> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('로그인이 필요합니다.');
  }

  // 관리자 권한 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('metadata')
    .eq('user_id', user.id)
    .single();

  if (!profile?.metadata?.is_admin) {
    throw new Error('관리자 권한이 필요합니다.');
  }

  const { data, error } = await supabase
    .from('posts')
    .update({
      ...postData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw new Error(`게시글 수정 실패: ${error.message}`);
  }

  // 작성자 정보 조회
  const { data: authorProfile } = await supabase
    .from('profiles')
    .select('nickname, email')
    .eq('user_id', data.author_id)
    .single();

  return {
    ...data,
    author: authorProfile || { nickname: '알 수 없음', email: '' }
  };
};
