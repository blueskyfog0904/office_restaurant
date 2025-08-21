import { supabase } from './supabaseClient';

// 사용자 프로필 정보 가져오기
const getUserProfile = async (userId: string) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('nickname, avatar_url')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.warn('프로필 조회 실패:', error);
      return null;
    }
    
    return profile;
  } catch (error) {
    console.warn('프로필 조회 에러:', error);
    return null;
  }
};

// 댓글 타입 정의
export interface Comment {
  id: string;
  post_id: string;
  parent_id: string | null;
  user_id: string;
  content: string;
  content_html: string;
  status: 'published' | 'pending' | 'hidden' | 'deleted';
  like_count: number;
  reply_count: number;
  report_count: number;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  author_nickname: string;
  author_avatar: string | null;
  author_role: 'user' | 'moderator' | 'admin' | null;
  user_liked: boolean;
  user_reported: boolean;
}

export interface CommentWithReplies extends Comment {
  replies: Comment[];
}

export interface CreateCommentData {
  post_id: string;
  parent_id?: string;
  content: string;
}

export interface UpdateCommentData {
  content: string;
}

export interface ReportCommentData {
  reason: 'spam' | 'harassment' | 'inappropriate' | 'misinformation' | 'other';
  description?: string;
}

// Edge Functions 호출 헬퍼
async function callEdgeFunction(functionName: string, data: any) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Unknown error');
  }

  return response.json();
}

// 댓글 목록 조회 (키셋 페이지네이션)
export const getComments = async (
  postId: string,
  sortBy: 'latest' | 'popular' = 'latest',
  limit: number = 20,
  cursor?: { created_at: string; id: string }
): Promise<Comment[]> => {
  try {
    let query;

    if (sortBy === 'popular') {
      // RPC 함수 사용 (인기순)
      const { data, error } = await supabase.rpc('get_popular_comments', {
        p_post_id: postId,
        p_limit: limit,
        p_offset: cursor ? 0 : 0 // RPC에서는 offset 사용
      });

      if (error) throw error;
      return data || [];
    } else {
      // 일반 쿼리 (최신순)
      query = supabase
        .from('v_comments_with_details')
        .select('*')
        .eq('post_id', postId)
        .is('parent_id', null)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(limit);

      if (cursor) {
        query = query
          .lt('created_at', cursor.created_at)
          .neq('id', cursor.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  } catch (error) {
    console.error('댓글 조회 실패:', error);
    
    // Fallback: 뷰나 RPC가 없으면 직접 테이블에서 조회
    try {
      let fallbackQuery = supabase
        .from('comments')
        .select(`
          *,
          profiles!comments_user_id_fkey(nickname, avatar_url)
        `)
        .eq('post_id', postId)
        .is('parent_id', null)
        .eq('status', 'published');

      if (sortBy === 'popular') {
        fallbackQuery = fallbackQuery.order('like_count', { ascending: false });
        fallbackQuery = fallbackQuery.order('reply_count', { ascending: false });
        fallbackQuery = fallbackQuery.order('created_at', { ascending: false });
      } else {
        fallbackQuery = fallbackQuery.order('created_at', { ascending: false });
        fallbackQuery = fallbackQuery.order('id', { ascending: false });
      }

      if (cursor) {
        fallbackQuery = fallbackQuery.lt('created_at', cursor.created_at);
      }

      fallbackQuery = fallbackQuery.limit(limit);

      const { data: fallbackData, error: queryError } = await fallbackQuery;
      if (queryError) throw queryError;

      // 데이터 변환
      return (fallbackData || []).map((comment: any) => ({
        ...comment,
        author_nickname: comment.profiles?.nickname || 'Unknown',
        author_avatar: comment.profiles?.avatar_url || null,
        author_role: null,
        user_liked: false,
        user_reported: false
      }));
    } catch (fallbackError) {
      console.error('Fallback 댓글 조회도 실패, 로컬 스토리지에서 조회:', fallbackError);
      
      // 최종 fallback: 로컬 스토리지에서 임시 댓글 조회
      try {
        console.log('💾 로컬 스토리지에서 댓글 조회 시도...');
        const localComments = JSON.parse(localStorage.getItem('temp_comments') || '[]');
        console.log('📊 로컬 스토리지 전체 댓글:', localComments.length);
        
        const filteredComments = localComments.filter((comment: any) => 
          comment.post_id === postId && !comment.parent_id
        );
        console.log('🔍 필터링된 댓글 (post_id=' + postId + '):', filteredComments.length);

        // 각 댓글의 사용자 정보를 profiles 테이블에서 최신 정보로 업데이트
        const updatedComments = await Promise.all(
          filteredComments.map(async (comment: any) => {
            const userProfile = await getUserProfile(comment.user_id);
            return {
              ...comment,
              author_nickname: userProfile?.nickname || comment.author_nickname || 'Unknown',
              author_avatar: userProfile?.avatar_url || comment.author_avatar || null
            };
          })
        );

        if (sortBy === 'popular') {
          updatedComments.sort((a: any, b: any) => b.like_count - a.like_count);
        } else {
          updatedComments.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }

        const result = updatedComments.slice(0, limit);
        console.log('✅ 로컬 스토리지 댓글 조회 성공:', result.length);
        return result;
      } catch (localError) {
        console.error('❌ 로컬 스토리지 조회도 실패:', localError);
        return []; // 빈 배열 반환
      }
    }
  }
};

// 대댓글 조회
export const getReplies = async (
  parentId: string,
  limit: number = 10,
  cursor?: { created_at: string; id: string }
): Promise<Comment[]> => {
  try {
    let query = supabase
      .from('v_comments_with_details')
      .select('*')
      .eq('parent_id', parentId)
      .eq('status', 'published')
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(limit);

    if (cursor) {
      query = query
        .gt('created_at', cursor.created_at)
        .neq('id', cursor.id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('대댓글 조회 실패, 로컬 스토리지에서 조회:', error);
    
    // 로컬 스토리지에서 대댓글 조회
    try {
      const localComments = JSON.parse(localStorage.getItem('temp_comments') || '[]');
      const replies = localComments.filter((comment: any) => 
        comment.parent_id === parentId
      );

      // 각 대댓글의 사용자 정보를 profiles 테이블에서 최신 정보로 업데이트
      const updatedReplies = await Promise.all(
        replies.map(async (comment: any) => {
          const userProfile = await getUserProfile(comment.user_id);
          return {
            ...comment,
            author_nickname: userProfile?.nickname || comment.author_nickname || 'Unknown',
            author_avatar: userProfile?.avatar_url || comment.author_avatar || null
          };
        })
      );

      // 시간순 정렬
      updatedReplies.sort((a: any, b: any) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      return updatedReplies.slice(0, limit);
    } catch (localError) {
      console.error('로컬 스토리지 대댓글 조회도 실패:', localError);
      return [];
    }
  }
};

// 댓글 작성
export const createComment = async (commentData: CreateCommentData): Promise<Comment> => {
  console.log('💬 댓글 작성 시작:', commentData);
  
  try {
    console.log('🚀 Edge Function 시도 중...');
    const result = await callEdgeFunction('create-comment', {
      ...commentData,
      honeypot: '' // 허니팟 필드
    });
    console.log('✅ Edge Function 성공:', result);
    return result.data;
  } catch (error) {
    console.warn('❌ Edge Function 실패, DB 직접 접근 시도:', error);
    
    // 사용자 인증 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ 사용자 인증 실패');
      throw new Error('Authentication required');
    }
    console.log('✅ 사용자 인증 성공:', user.id);

    try {
      console.log('🗄️ comments 테이블 직접 접근 시도...');
      const { data: comment, error: insertError } = await supabase
        .from('comments')
        .insert({
          post_id: commentData.post_id,
          parent_id: commentData.parent_id || null,
          user_id: user.id,
          content: commentData.content,
          content_html: commentData.content,
          status: 'published'
        })
        .select('*')
        .single();

      if (!insertError && comment) {
        console.log('✅ DB 직접 삽입 성공:', comment);
        // 사용자 정보와 함께 반환
        const { data: profile } = await supabase
          .from('profiles')
          .select('nickname, avatar_url')
          .eq('id', user.id)
          .single();

        return {
          ...comment,
          author_nickname: profile?.nickname || 'Unknown',
          author_avatar: profile?.avatar_url || null,
          author_role: null,
          user_liked: false,
          user_reported: false
        };
      } else {
        console.warn('❌ DB 직접 삽입 실패:', insertError);
      }
    } catch (tableError) {
      console.warn('❌ comments 테이블 없음, 로컬 스토리지 사용:', tableError);
    }

    // 로컬 스토리지 fallback
    console.log('💾 로컬 스토리지 임시 댓글 생성...');
    
    // profiles 테이블에서 nickname 가져오기
    const userProfile = await getUserProfile(user.id);
    
    const tempComment: Comment = {
      id: crypto.randomUUID(),
      post_id: commentData.post_id,
      parent_id: commentData.parent_id || null,
      user_id: user.id,
      content: commentData.content,
      content_html: commentData.content,
      status: 'published' as const,
      like_count: 0,
      reply_count: 0,
      report_count: 0,
      is_edited: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      author_nickname: userProfile?.nickname || user.email?.split('@')[0] || 'Unknown',
      author_avatar: userProfile?.avatar_url || null,
      author_role: null,
      user_liked: false,
      user_reported: false
    };

    // 로컬 스토리지에 임시 저장
    try {
      const localComments = JSON.parse(localStorage.getItem('temp_comments') || '[]');
      localComments.push(tempComment);
      localStorage.setItem('temp_comments', JSON.stringify(localComments));
      console.log('✅ 로컬 스토리지 저장 성공:', tempComment);
      console.log('📊 현재 로컬 댓글 수:', localComments.length);
      return tempComment;
    } catch (localError) {
      console.error('❌ 로컬 스토리지 저장 실패:', localError);
      throw new Error('모든 댓글 저장 방법이 실패했습니다.');
    }
  }
};

// 댓글 수정
export const updateComment = async (commentId: string, updateData: UpdateCommentData): Promise<Comment> => {
  try {
    const result = await callEdgeFunction('edit-comment', {
      comment_id: commentId,
      ...updateData,
      honeypot: '' // 허니팟 필드
    });
    return result.data;
  } catch (error) {
    console.error('댓글 수정 실패:', error);
    throw error;
  }
};

// 댓글 삭제 (소프트 삭제)
export const deleteComment = async (commentId: string): Promise<void> => {
  try {
    await callEdgeFunction('delete-comment', {
      comment_id: commentId
    });
  } catch (error) {
    console.error('댓글 삭제 실패:', error);
    throw error;
  }
};

// 댓글 좋아요 토글
export const toggleCommentLike = async (commentId: string): Promise<{ is_liked: boolean; like_count: number }> => {
  try {
    const result = await callEdgeFunction('toggle-comment-like', {
      comment_id: commentId
    });
    return result.data;
  } catch (error) {
    console.error('댓글 좋아요 실패:', error);
    throw error;
  }
};

// 댓글 신고
export const reportComment = async (commentId: string, reportData: ReportCommentData): Promise<void> => {
  try {
    await callEdgeFunction('report-comment', {
      comment_id: commentId,
      ...reportData
    });
  } catch (error) {
    console.error('댓글 신고 실패:', error);
    throw error;
  }
};

// 사용자 검색 (멘션용)
export const searchUsers = async (query: string, limit: number = 10): Promise<Array<{ id: string; nickname: string; avatar_url: string | null }>> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nickname, avatar_url')
      .ilike('nickname', `%${query}%`)
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('사용자 검색 실패:', error);
    throw error;
  }
};

// 실시간 댓글 구독
export const subscribeToComments = (
  postId: string,
  onComment: (comment: Comment) => void,
  onUpdate: (comment: Comment) => void,
  onDelete: (commentId: string) => void
) => {
  const channel = supabase
    .channel(`comments:${postId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
        filter: `post_id=eq.${postId}`,
      },
      (payload: any) => {
        // 새 댓글이 추가되면 상세 정보와 함께 조회
        getCommentById(payload.new.id).then(onComment).catch(console.error);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'comments',
        filter: `post_id=eq.${postId}`,
      },
      (payload: any) => {
        if (payload.new.status === 'deleted') {
          onDelete(payload.new.id);
        } else {
          getCommentById(payload.new.id).then(onUpdate).catch(console.error);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// 댓글 상세 조회 (실시간 업데이트용)
const getCommentById = async (commentId: string): Promise<Comment> => {
  const { data, error } = await supabase
    .from('v_comments_with_details')
    .select('*')
    .eq('id', commentId)
    .single();

  if (error) throw error;
  return data;
};
