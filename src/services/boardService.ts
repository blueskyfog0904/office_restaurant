import { supabase } from './supabaseClient';

export type BoardCode = 'restaurant_info' | 'civil_servant_spots' | 'civil_servant' | 'free' | 'notice' | 'suggestion';

export interface Board {
  id: string;
  code: BoardCode;
  name: string;
  description?: string | null;
  is_active: boolean;
  write_policy?: any;
}

export interface BoardCategory {
  id: string;
  board_id: string;
  code: string;
  name: string;
  display_order: number;
  is_active: boolean;
}

export interface Post {
  id: string;
  author_id: string;
  title: string;
  content: string;
  board_type: 'notice' | 'free' | 'suggestion';
  board_id?: string;
  category_id?: string | null;
  view_count: number;
  like_count: number;
  dislike_count: number;
  comment_count: number;
  is_pinned: boolean;
  status?: 'pending' | 'in_progress' | 'completed' | 'rejected';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    nickname: string;
    email: string;
  };
  user_reaction?: 'like' | 'dislike' | null;
}

export interface PostCreateRequest {
  title: string;
  content: string;
  board_type: 'notice' | 'free' | 'suggestion' | 'restaurant_info' | 'civil_servant';
  category_code?: string;
}

export interface RestaurantInfoMeta {
  post_id: string;
  restaurant_name: string;
  address_text: string | null;
  map_link: string | null;
  representative_menus: string[];
  price_range: string;
  one_line_review: string;
  visit_purpose?: string | null;
  parking?: string | null;
  waiting?: string | null;
  reservation?: string | null;
  recommended_for?: string | null;
  tags?: string[] | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface PostPhoto {
  id: string;
  post_id: string;
  photo_url: string;
  storage_path: string;
  display_order?: number | null;
  file_size?: number | null;
}

export interface RestaurantInfoPost extends Post {
  meta?: RestaurantInfoMeta | null;
  thumbnail_url?: string | null;
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

const getBoardIdByCode = async (boardCode: BoardCode): Promise<string> => {
  const { data, error } = await supabase.from('boards').select('id').eq('code', boardCode).single();
  if (error || !data) throw new Error(`게시판 조회 실패: ${error?.message || 'unknown'}`);
  return data.id;
};

const getCategoryIdByCode = async (boardId: string, categoryCode: string): Promise<string | null> => {
  if (!categoryCode) return null;
  const { data, error } = await supabase
    .from('board_categories')
    .select('id')
    .eq('board_id', boardId)
    .eq('code', categoryCode)
    .eq('is_active', true)
    .single();
  if (error || !data) return null;
  return data.id;
};

export const getBoardCategories = async (boardCode: BoardCode): Promise<BoardCategory[]> => {
  const boardId = await getBoardIdByCode(boardCode);
  const { data, error } = await supabase
    .from('board_categories')
    .select('id, board_id, code, name, display_order, is_active')
    .eq('board_id', boardId)
    .order('display_order', { ascending: true });
  if (error) throw new Error(`카테고리 조회 실패: ${error.message}`);
  return (data || []) as any;
};

export const getBoardPosts = async (
  boardCode: BoardCode,
  categoryCode: string | undefined,
  page: number = 1,
  size: number = 20
): Promise<PostListResponse> => {
  const boardId = await getBoardIdByCode(boardCode);
  const categoryId = categoryCode ? await getCategoryIdByCode(boardId, categoryCode) : null;

  const from = (page - 1) * size;
  const to = from + size - 1;

  let q = supabase
    .from('posts')
    .select('*', { count: 'exact' })
    .eq('board_id', boardId)
    .eq('is_active', true);

  if (categoryId) q = q.eq('category_id', categoryId);

  const { data, error, count } = await withTimeoutQuery<any>(
    q.order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to)
  );

  if (error) throw new Error(`게시글 조회 실패: ${error.message}`);

  const postsWithAuthors = await Promise.all(
    (data || []).map(async (post: any) => {
      const { data: profile } = await withTimeoutQuery<any>(
        supabase.from('profiles').select('nickname, email').eq('user_id', post.author_id).single()
      );
      return { ...post, author: profile || { nickname: '알 수 없음', email: '' } };
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

export const getHotPostsByBoardCode = async (
  boardCode: BoardCode,
  hours: number = 48,
  limit: number = 10,
  categoryCode?: string
): Promise<Post[]> => {
  // 카테고리 필터링 시 더 많은 데이터를 가져와서 필터링 후 제한
  const fetchLimit = categoryCode ? limit * 3 : limit;
  
  const { data, error } = await supabase.rpc('get_hot_posts', {
    p_hours: hours,
    p_limit: fetchLimit,
    p_board_code: boardCode,
  });

  if (error) throw new Error(`HOT게시글 조회 실패: ${error.message}`);

  let filteredData = (data || []) as any[];
  
  // 카테고리 필터링
  if (categoryCode) {
    filteredData = filteredData.filter((post: any) => post.category_code === categoryCode);
  }
  
  // 제한 적용
  filteredData = filteredData.slice(0, limit);

  const postsWithAuthors = await Promise.all(
    filteredData.map(async (post: any) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('nickname, email')
        .eq('user_id', post.author_id)
        .single();

      return {
        ...post,
        author: profile || { nickname: '알 수 없음', email: '' },
      };
    })
  );

  return postsWithAuthors;
};

export const getRestaurantInfoPosts = async (
  categoryCode: string,
  page: number = 1,
  size: number = 20
): Promise<{ data: RestaurantInfoPost[]; pagination: PostListResponse['pagination'] }> => {
  const base = await getBoardPosts('restaurant_info', categoryCode, page, size);
  const ids = (base.data || []).map((p) => p.id);

  if (!ids.length) {
    return { data: [], pagination: base.pagination };
  }

  const [{ data: metas }, { data: photos }] = await Promise.all([
    supabase
      .from('restaurant_info_post_meta')
      .select('*')
      .in('post_id', ids),
    supabase
      .from('post_photos')
      .select('id, post_id, photo_url, storage_path, display_order, file_size')
      .in('post_id', ids),
  ]);

  const metaMap = new Map<string, any>();
  (metas || []).forEach((m: any) => metaMap.set(m.post_id, m));

  const photoMap = new Map<string, any[]>();
  (photos || []).forEach((ph: any) => {
    const list = photoMap.get(ph.post_id) || [];
    list.push(ph);
    photoMap.set(ph.post_id, list);
  });

  const merged: RestaurantInfoPost[] = (base.data as any[]).map((p: any) => {
    const meta = metaMap.get(p.id) || null;
    const ph = (photoMap.get(p.id) || []).slice().sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
    const thumbnail_url = ph.length ? ph[0].photo_url : null;
    return { ...p, meta, thumbnail_url };
  });

  return { data: merged, pagination: base.pagination };
};

export const getRestaurantInfoMeta = async (postId: string): Promise<RestaurantInfoMeta> => {
  const { data, error } = await supabase.from('restaurant_info_post_meta').select('*').eq('post_id', postId).single();
  if (error || !data) throw new Error(`맛집정보 메타 조회 실패: ${error?.message || 'unknown'}`);
  return data as any;
};

export const getPostPhotos = async (postId: string): Promise<PostPhoto[]> => {
  const { data, error } = await supabase
    .from('post_photos')
    .select('id, post_id, photo_url, storage_path, display_order, file_size')
    .eq('post_id', postId)
    .order('display_order', { ascending: true });
  if (error) throw new Error(`사진 조회 실패: ${error.message}`);
  return (data || []) as any;
};

export type CreatePostByEdgeRequest = {
  board_code: BoardCode;
  category_code?: string;
  title: string;
  content: string;
  honeypot?: string;
  restaurant_info?: any;
  photos?: Array<{ storage_path: string; photo_url?: string; file_size?: number; display_order?: number }>;
};

export const createPostByEdge = async (payload: CreatePostByEdgeRequest): Promise<Post> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('로그인이 필요합니다.');

  const resp = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/create-post`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json.error || '작성 실패');

  const post = json?.data?.post as any;
  if (!post?.id) throw new Error('작성 결과를 확인할 수 없습니다.');

  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, email')
    .eq('user_id', post.author_id)
    .single();

  return { ...post, author: profile || { nickname: '알 수 없음', email: '' } };
};

export const reportPostByEdge = async (postId: string, reason: string, description?: string) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('로그인이 필요합니다.');

  const resp = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/report-post`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ post_id: postId, reason, description }),
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json.error || '신고 실패');
  return json;
};

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
  const { data, error } = await supabase.rpc('get_hot_posts', {
    p_hours: 48,
    p_limit: 10,
    p_board_code: null,
  });

  if (error) {
    throw new Error(`HOT게시글 조회 실패: ${error.message}`);
  }

  // 작성자 정보 별도 조회
  const postsWithAuthors = await Promise.all(
    ((data || []) as any[]).map(async (post: any) => {
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

  // 로그인한 경우 사용자의 반응 조회
  let userReaction: 'like' | 'dislike' | null = null;
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    const { data: reactions } = await supabase
      .from('post_reactions')
      .select('reaction_type')
      .eq('post_id', id)
      .eq('user_id', user.id)
      .limit(1);
    
    if (reactions && reactions.length > 0) {
      userReaction = reactions[0].reaction_type as 'like' | 'dislike';
    }
  }

  return {
    ...data,
    author: profile || { nickname: '알 수 없음', email: '' },
    user_reaction: userReaction
  };
};

// 게시글 반응 토글 (좋아요/비공감)
export const togglePostReaction = async (id: string, type: 'like' | 'dislike'): Promise<{ like_count: number; dislike_count: number; user_reaction: 'like' | 'dislike' | null }> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('로그인이 필요합니다.');
  }

  // 기존 반응 조회
  const { data: reactions } = await supabase
    .from('post_reactions')
    .select('*')
    .eq('post_id', id)
    .eq('user_id', user.id)
    .limit(1);

  const existingReaction = reactions && reactions.length > 0 ? reactions[0] : null;

  if (existingReaction) {
    if (existingReaction.reaction_type === type) {
      // 같은 반응이면 삭제 (취소)
      await supabase
        .from('post_reactions')
        .delete()
        .eq('id', existingReaction.id);
    } else {
      // 다른 반응이면 업데이트
      await supabase
        .from('post_reactions')
        .update({ reaction_type: type })
        .eq('id', existingReaction.id);
    }
  } else {
    // 반응이 없으면 생성
    await supabase
      .from('post_reactions')
      .insert({
        post_id: id,
        user_id: user.id,
        reaction_type: type
      });
  }

  // 업데이트된 카운트 조회
  const { data: updatedPost, error } = await supabase
    .from('posts')
    .select('like_count, dislike_count')
    .eq('id', id)
    .single();

  if (error || !updatedPost) {
    throw new Error('반응 업데이트 후 조회 실패');
  }

  // 업데이트된 사용자 반응 상태 결정
  let newUserReaction: 'like' | 'dislike' | null = null;
  if (existingReaction) {
    newUserReaction = existingReaction.reaction_type === type ? null : type;
  } else {
    newUserReaction = type;
  }

  return {
    like_count: updatedPost.like_count,
    dislike_count: updatedPost.dislike_count,
    user_reaction: newUserReaction
  };
};

// 게시글 좋아요 토글 (Deprecated: togglePostReaction 사용 권장)
export const toggleLike = async (id: string): Promise<void> => {
  await togglePostReaction(id, 'like');
};
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

  // board_id와 category_id 조회
  let boardId: string | undefined;
  let categoryId: string | null = null;

  // board_type을 DB에 저장할 코드로 매핑
  const boardCodeMap: Record<string, string> = {
    'free': 'free',
    'suggestion': 'suggestion',
    'restaurant_info': 'restaurant_info',
    'civil_servant': 'civil_servant',
  };
  
  const boardCode = boardCodeMap[postData.board_type];
  if (boardCode) {
    boardId = await getBoardIdByCode(boardCode as BoardCode);
    if (postData.category_code && boardId) {
      categoryId = await getCategoryIdByCode(boardId, postData.category_code);
    }
  }

  console.log('Creating post with data:', {
    author_id: user.id,
    title: postData.title,
    content: postData.content,
    board_type: postData.board_type,
    board_id: boardId,
    category_id: categoryId,
  });

  const insertData: any = {
    author_id: user.id,
    title: postData.title,
    content: postData.content,
    board_type: postData.board_type,
  };

  if (boardId) {
    insertData.board_id = boardId;
  }
  if (categoryId) {
    insertData.category_id = categoryId;
  }

  const { data, error } = await supabase
    .from('posts')
    .insert(insertData)
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
