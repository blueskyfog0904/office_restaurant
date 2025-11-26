import React, { useState } from 'react';
import { HandThumbUpIcon, HandThumbDownIcon } from '@heroicons/react/24/outline';
import { HandThumbUpIcon as HandThumbUpSolid, HandThumbDownIcon as HandThumbDownSolid } from '@heroicons/react/24/solid';
import { toggleReaction } from '../services/reviewReactionService';

interface ReviewReactionButtonsProps {
  reviewId: string;
  initialLikeCount: number;
  initialDislikeCount: number;
  userReaction?: 'like' | 'dislike' | null;
  isLoggedIn: boolean;
  onReactionChange?: (likeCount: number, dislikeCount: number, userReaction: 'like' | 'dislike' | null) => void;
}

const ReviewReactionButtons: React.FC<ReviewReactionButtonsProps> = ({
  reviewId,
  initialLikeCount,
  initialDislikeCount,
  userReaction: initialUserReaction,
  isLoggedIn,
  onReactionChange,
}) => {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [dislikeCount, setDislikeCount] = useState(initialDislikeCount);
  const [userReaction, setUserReaction] = useState<'like' | 'dislike' | null>(initialUserReaction || null);
  const [loading, setLoading] = useState(false);

  const handleReaction = async (type: 'like' | 'dislike') => {
    if (!isLoggedIn) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (loading) return;

    setLoading(true);
    try {
      const result = await toggleReaction(reviewId, type);
      
      let newLikeCount = likeCount;
      let newDislikeCount = dislikeCount;
      let newUserReaction: 'like' | 'dislike' | null = null;

      if (result.action === 'added') {
        if (type === 'like') {
          newLikeCount = likeCount + 1;
        } else {
          newDislikeCount = dislikeCount + 1;
        }
        newUserReaction = type;
      } else if (result.action === 'removed') {
        if (type === 'like') {
          newLikeCount = Math.max(0, likeCount - 1);
        } else {
          newDislikeCount = Math.max(0, dislikeCount - 1);
        }
        newUserReaction = null;
      } else if (result.action === 'changed') {
        if (type === 'like') {
          newLikeCount = likeCount + 1;
          newDislikeCount = Math.max(0, dislikeCount - 1);
        } else {
          newDislikeCount = dislikeCount + 1;
          newLikeCount = Math.max(0, likeCount - 1);
        }
        newUserReaction = type;
      }

      setLikeCount(newLikeCount);
      setDislikeCount(newDislikeCount);
      setUserReaction(newUserReaction);
      onReactionChange?.(newLikeCount, newDislikeCount, newUserReaction);
    } catch (error) {
      console.error('반응 처리 실패:', error);
      alert(error instanceof Error ? error.message : '반응 처리에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={() => handleReaction('like')}
        disabled={loading}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-all ${
          userReaction === 'like'
            ? 'bg-blue-100 text-blue-600 border border-blue-300'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        title="공감"
      >
        {userReaction === 'like' ? (
          <HandThumbUpSolid className="h-4 w-4" />
        ) : (
          <HandThumbUpIcon className="h-4 w-4" />
        )}
        <span>{likeCount}</span>
      </button>

      <button
        onClick={() => handleReaction('dislike')}
        disabled={loading}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-all ${
          userReaction === 'dislike'
            ? 'bg-red-100 text-red-600 border border-red-300'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        title="비공감"
      >
        {userReaction === 'dislike' ? (
          <HandThumbDownSolid className="h-4 w-4" />
        ) : (
          <HandThumbDownIcon className="h-4 w-4" />
        )}
        <span>{dislikeCount}</span>
      </button>
    </div>
  );
};

export default ReviewReactionButtons;

