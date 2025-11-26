import { supabase, getSupabaseAdmin } from './supabaseClient';
import { ReviewReply } from '../types';

const isLocalhost = () => {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
};

const LOCALHOST_USER_ID = '11111111-1111-1111-1111-111111111111';

const getClient = () => isLocalhost() ? getSupabaseAdmin() : supabase;

const getCurrentUserId = async (): Promise<string | null> => {
  if (isLocalhost()) {
    return LOCALHOST_USER_ID;
  }
  const { data: userData } = await supabase.auth.getUser();
  return userData.user?.id || null;
};

export const createReply = async (
  reviewId: string,
  content: string,
  parentId?: string
): Promise<ReviewReply> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('로그인이 필요합니다.');
  }

  const trimmedContent = content.trim();
  if (!trimmedContent) {
    throw new Error('답글 내용을 입력해주세요.');
  }
  if (trimmedContent.length > 1000) {
    throw new Error('답글은 1000자 이내로 작성해주세요.');
  }

  const client = getClient();

  // 답글 생성
  const { data, error } = await client
    .from('review_replies')
    .insert({
      review_id: reviewId,
      user_id: userId,
      content: trimmedContent,
      parent_id: parentId || null,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`답글 작성 실패: ${error.message}`);
  }

  // 프로필 정보 별도 조회
  const { data: profile } = await client
    .from('profiles')
    .select('nickname, avatar_url')
    .eq('user_id', userId)
    .single();

  return {
    ...data,
    nickname: profile?.nickname || null,
    avatar_url: profile?.avatar_url || null,
  };
};

export const updateReply = async (
  replyId: string,
  content: string
): Promise<ReviewReply> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('로그인이 필요합니다.');
  }

  const trimmedContent = content.trim();
  if (!trimmedContent) {
    throw new Error('답글 내용을 입력해주세요.');
  }
  if (trimmedContent.length > 1000) {
    throw new Error('답글은 1000자 이내로 작성해주세요.');
  }

  const client = getClient();

  const { data: existing, error: fetchError } = await client
    .from('review_replies')
    .select('user_id')
    .eq('id', replyId)
    .single();

  if (fetchError) {
    throw new Error(`답글 조회 실패: ${fetchError.message}`);
  }

  if (existing.user_id !== userId) {
    throw new Error('본인의 답글만 수정할 수 있습니다.');
  }

  const { data, error } = await client
    .from('review_replies')
    .update({
      content: trimmedContent,
      is_edited: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', replyId)
    .select('*')
    .single();

  if (error) {
    throw new Error(`답글 수정 실패: ${error.message}`);
  }

  // 프로필 정보 별도 조회
  const { data: profile } = await client
    .from('profiles')
    .select('nickname, avatar_url')
    .eq('user_id', userId)
    .single();

  return {
    ...data,
    nickname: profile?.nickname || null,
    avatar_url: profile?.avatar_url || null,
  };
};

export const deleteReply = async (replyId: string): Promise<void> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('로그인이 필요합니다.');
  }

  const client = getClient();

  const { data: existing, error: fetchError } = await client
    .from('review_replies')
    .select('user_id')
    .eq('id', replyId)
    .single();

  if (fetchError) {
    throw new Error(`답글 조회 실패: ${fetchError.message}`);
  }

  if (existing.user_id !== userId) {
    throw new Error('본인의 답글만 삭제할 수 있습니다.');
  }

  const { error } = await client
    .from('review_replies')
    .delete()
    .eq('id', replyId);

  if (error) {
    throw new Error(`답글 삭제 실패: ${error.message}`);
  }
};

export const getReplies = async (reviewId: string): Promise<ReviewReply[]> => {
  const { data, error } = await getClient()
    .from('v_review_replies_detailed')
    .select('*')
    .eq('review_id', reviewId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('답글 조회 실패:', error);
    return [];
  }

  const replies = data || [];
  
  const topLevel = replies.filter(r => !r.parent_id);
  const children = replies.filter(r => r.parent_id);

  return topLevel.map(parent => ({
    ...parent,
    replies: children.filter(c => c.parent_id === parent.id),
  }));
};

export const getRepliesForReviews = async (
  reviewIds: string[]
): Promise<Record<string, ReviewReply[]>> => {
  if (reviewIds.length === 0) return {};

  const { data, error } = await getClient()
    .from('v_review_replies_detailed')
    .select('*')
    .in('review_id', reviewIds)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('답글 목록 조회 실패:', error);
    return {};
  }

  const result: Record<string, ReviewReply[]> = {};
  reviewIds.forEach(id => { result[id] = []; });

  const replies = data || [];
  const topLevelByReview: Record<string, ReviewReply[]> = {};
  const childrenByReview: Record<string, ReviewReply[]> = {};

  replies.forEach(reply => {
    if (!reply.parent_id) {
      if (!topLevelByReview[reply.review_id]) {
        topLevelByReview[reply.review_id] = [];
      }
      topLevelByReview[reply.review_id].push(reply);
    } else {
      if (!childrenByReview[reply.review_id]) {
        childrenByReview[reply.review_id] = [];
      }
      childrenByReview[reply.review_id].push(reply);
    }
  });

  Object.keys(topLevelByReview).forEach(reviewId => {
    const parents = topLevelByReview[reviewId];
    const children = childrenByReview[reviewId] || [];
    
    result[reviewId] = parents.map(parent => ({
      ...parent,
      replies: children.filter(c => c.parent_id === parent.id),
    }));
  });

  return result;
};

export const getReplyCount = async (reviewId: string): Promise<number> => {
  const { count, error } = await getClient()
    .from('review_replies')
    .select('*', { count: 'exact', head: true })
    .eq('review_id', reviewId);

  if (error) {
    console.error('답글 수 조회 실패:', error);
    return 0;
  }

  return count || 0;
};

