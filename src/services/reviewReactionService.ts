import { supabase, getSupabaseAdmin } from './supabaseClient';
import { ReviewReaction } from '../types';

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

export const toggleReaction = async (
  reviewId: string,
  reactionType: 'like' | 'dislike'
): Promise<{ action: 'added' | 'removed' | 'changed'; reaction?: ReviewReaction }> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('로그인이 필요합니다.');
  }

  const client = getClient();

  const { data: existing, error: fetchError } = await client
    .from('review_reactions')
    .select('*')
    .eq('review_id', reviewId)
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`반응 조회 실패: ${fetchError.message}`);
  }

  if (existing) {
    if (existing.reaction_type === reactionType) {
      const { error: deleteError } = await client
        .from('review_reactions')
        .delete()
        .eq('id', existing.id);

      if (deleteError) {
        throw new Error(`반응 취소 실패: ${deleteError.message}`);
      }
      return { action: 'removed' };
    } else {
      const { data: updated, error: updateError } = await client
        .from('review_reactions')
        .update({ reaction_type: reactionType })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`반응 변경 실패: ${updateError.message}`);
      }
      return { action: 'changed', reaction: updated };
    }
  } else {
    const { data: created, error: insertError } = await client
      .from('review_reactions')
      .insert({
        review_id: reviewId,
        user_id: userId,
        reaction_type: reactionType,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`반응 추가 실패: ${insertError.message}`);
    }
    return { action: 'added', reaction: created };
  }
};

export const getMyReaction = async (reviewId: string): Promise<ReviewReaction | null> => {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data, error } = await getClient()
    .from('review_reactions')
    .select('*')
    .eq('review_id', reviewId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('내 반응 조회 실패:', error);
    return null;
  }
  return data;
};

export const getMyReactionsForReviews = async (
  reviewIds: string[]
): Promise<Record<string, ReviewReaction>> => {
  const userId = await getCurrentUserId();
  if (!userId || reviewIds.length === 0) return {};

  const { data, error } = await getClient()
    .from('review_reactions')
    .select('*')
    .eq('user_id', userId)
    .in('review_id', reviewIds);

  if (error) {
    console.error('반응 목록 조회 실패:', error);
    return {};
  }

  const result: Record<string, ReviewReaction> = {};
  data?.forEach((reaction) => {
    result[reaction.review_id] = reaction;
  });
  return result;
};

export const getReactionCounts = async (
  reviewId: string
): Promise<{ like_count: number; dislike_count: number }> => {
  const { data, error } = await getClient()
    .from('reviews')
    .select('like_count, dislike_count')
    .eq('id', reviewId)
    .single();

  if (error) {
    console.error('반응 카운트 조회 실패:', error);
    return { like_count: 0, dislike_count: 0 };
  }

  return {
    like_count: data?.like_count || 0,
    dislike_count: data?.dislike_count || 0,
  };
};

