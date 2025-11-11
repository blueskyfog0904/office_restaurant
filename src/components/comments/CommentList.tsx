import React, { useState, useEffect, useCallback, useRef } from 'react';
import CommentItem from './CommentItem';
import CommentForm from './CommentForm';
import ReportModal from './ReportModal';
import {
  Comment,
  CommentWithReplies,
  getComments,
  getReplies,
  createComment,
  updateComment,
  deleteComment,
  toggleCommentLike,
  subscribeToComments
} from '../../services/commentApi';
import { useAuth } from '../../contexts/AuthContext';

interface CommentListProps {
  postId: string;
  initialSortBy?: 'latest' | 'popular';
}

const CommentList: React.FC<CommentListProps> = ({
  postId,
  initialSortBy = 'latest'
}) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>(initialSortBy);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [reportingComment, setReportingComment] = useState<Comment | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [repliesData, setRepliesData] = useState<Record<string, Comment[]>>({});
  const [cursor, setCursor] = useState<{ created_at: string; id: string } | null>(null);
  
  const observerRef = useRef<HTMLDivElement>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const stateRef = useRef({ hasMore, loading, loadingMore, cursor });

  // stateRef 업데이트
  useEffect(() => {
    stateRef.current = { hasMore, loading, loadingMore, cursor };
  }, [hasMore, loading, loadingMore, cursor]);

  // 댓글 목록 로드
  const loadComments = useCallback(async (reset = false) => {
    if (!reset && !hasMore) return;

    try {
      if (reset) {
        setLoading(true);
        setCursor(null);
      } else {
        setLoadingMore(true);
      }

      const newComments = await getComments(
        postId,
        sortBy,
        20,
        reset ? undefined : cursor || undefined
      );

      if (reset) {
        setComments(newComments.map(comment => ({ ...comment, replies: [] })));
      } else {
        setComments(prev => [
          ...prev,
          ...newComments.map(comment => ({ ...comment, replies: [] }))
        ]);
      }

      // 커서 업데이트
      if (newComments.length > 0) {
        const lastComment = newComments[newComments.length - 1];
        setCursor({ created_at: lastComment.created_at, id: lastComment.id });
      }

      setHasMore(newComments.length === 20);
    } catch (error) {
      console.error('댓글 로드 실패:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, sortBy]);

  // 정렬 방식 변경
  const handleSortChange = (newSortBy: 'latest' | 'popular') => {
    if (newSortBy !== sortBy) {
      setSortBy(newSortBy);
      setHasMore(true);
      loadComments(true);
    }
  };

  // 무한 스크롤
  useEffect(() => {
    const currentObserverRef = observerRef.current;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const { hasMore, loading, loadingMore, cursor } = stateRef.current;
          
          if (!hasMore || loading || loadingMore) return;

          setLoadingMore(true);
          
          getComments(postId, sortBy, 20, cursor || undefined)
            .then(newComments => {
              setComments(prev => [
                ...prev,
                ...newComments.map(comment => ({ ...comment, replies: [] }))
              ]);

              if (newComments.length > 0) {
                const lastComment = newComments[newComments.length - 1];
                setCursor({ created_at: lastComment.created_at, id: lastComment.id });
              }

              setHasMore(newComments.length === 20);
            })
            .catch(error => {
              console.error('추가 댓글 로드 실패:', error);
            })
            .finally(() => {
              setLoadingMore(false);
            });
        }
      },
      { threshold: 0.1 }
    );

    if (currentObserverRef) {
      observer.observe(currentObserverRef);
    }

    return () => {
      observer.disconnect();
    };
  }, [postId, sortBy]);

  // 실시간 구독
  useEffect(() => {
    if (!postId) return;

    const unsubscribe = subscribeToComments(
      postId,
      (newComment) => {
        // 새 댓글 추가 (낙관적 업데이트)
        if (newComment.parent_id) {
          // 대댓글인 경우
          setRepliesData(prev => ({
            ...prev,
            [newComment.parent_id!]: [
              ...(prev[newComment.parent_id!] || []),
              newComment
            ]
          }));
        } else {
          // 일반 댓글인 경우
          setComments(prev => [
            { ...newComment, replies: [] },
            ...prev
          ]);
        }
      },
      (updatedComment) => {
        // 댓글 업데이트
        if (updatedComment.parent_id) {
          setRepliesData(prev => ({
            ...prev,
            [updatedComment.parent_id!]: (prev[updatedComment.parent_id!] || []).map(
              reply => reply.id === updatedComment.id ? updatedComment : reply
            )
          }));
        } else {
          setComments(prev => prev.map(
            comment => comment.id === updatedComment.id 
              ? { ...updatedComment, replies: comment.replies }
              : comment
          ));
        }
      },
      (deletedCommentId) => {
        // 댓글 삭제
        setComments(prev => prev.filter(comment => comment.id !== deletedCommentId));
        // 대댓글에서도 제거
        setRepliesData(prev => {
          const newData = { ...prev };
          Object.keys(newData).forEach(parentId => {
            newData[parentId] = newData[parentId].filter(reply => reply.id !== deletedCommentId);
          });
          return newData;
        });
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [postId]);

  // 초기 로드
  useEffect(() => {
    loadComments(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  // 댓글 작성
  const handleCreateComment = async (content: string) => {
    try {
      const newComment = await createComment({
        post_id: postId,
        content
      });
      
      // 로컬 스토리지 기반일 때는 수동으로 상태 업데이트
      console.log('✅ 댓글 작성 성공, 화면 업데이트:', newComment);
      const commentWithReplies = { ...newComment, replies: [] };
      setComments(prevComments => [commentWithReplies, ...prevComments]);
      
    } catch (error) {
      console.error('❌ 댓글 작성 실패:', error);
      throw error;
    }
  };

  // 대댓글 작성
  const handleCreateReply = async (parentId: string, content: string) => {
    try {
      const newReply = await createComment({
        post_id: postId,
        parent_id: parentId,
        content
      });
      
      // 로컬 스토리지 기반일 때는 수동으로 상태 업데이트
      console.log('✅ 대댓글 작성 성공, 화면 업데이트:', newReply);
      setRepliesData(prevReplies => ({
        ...prevReplies,
        [parentId]: [...(prevReplies[parentId] || []), newReply]
      }));
      
      // 부모 댓글의 reply_count 업데이트
      setComments(prevComments => 
        prevComments.map(comment => 
          comment.id === parentId 
            ? { ...comment, reply_count: comment.reply_count + 1 }
            : comment
        )
      );
      
      setReplyingTo(null);
    } catch (error) {
      console.error('❌ 대댓글 작성 실패:', error);
      throw error;
    }
  };

  // 댓글 수정
  const handleEditComment = async (content: string) => {
    if (!editingComment) return;

    try {
      await updateComment(editingComment.id, { content });
      setEditingComment(null);
    } catch (error) {
      throw error;
    }
  };

  // 댓글 삭제
  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deleteComment(commentId);
    } catch (error) {
      console.error('댓글 삭제 실패:', error);
      alert('댓글 삭제에 실패했습니다.');
    }
  };

  // 댓글 좋아요
  const handleLikeComment = async (commentId: string) => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      const result = await toggleCommentLike(commentId);
      
      // 낙관적 업데이트
      setComments(prev => prev.map(comment => 
        comment.id === commentId 
          ? { 
              ...comment, 
              user_liked: result.is_liked,
              like_count: result.like_count
            }
          : comment
      ));

      // 대댓글도 업데이트
      setRepliesData(prev => {
        const newData = { ...prev };
        Object.keys(newData).forEach(parentId => {
          newData[parentId] = newData[parentId].map(reply => 
            reply.id === commentId 
              ? { 
                  ...reply, 
                  user_liked: result.is_liked,
                  like_count: result.like_count
                }
              : reply
          );
        });
        return newData;
      });
    } catch (error) {
      console.error('좋아요 실패:', error);
    }
  };

  // 대댓글 토글
  const handleToggleReplies = async (commentId: string) => {
    const isExpanded = expandedReplies.has(commentId);
    
    if (isExpanded) {
      setExpandedReplies(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
    } else {
      setExpandedReplies(prev => new Set(prev).add(commentId));
      
      // 대댓글 로드
      if (!repliesData[commentId]) {
        try {
          const replies = await getReplies(commentId);
          setRepliesData(prev => ({
            ...prev,
            [commentId]: replies
          }));
        } catch (error) {
          console.error('대댓글 로드 실패:', error);
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-24 mb-1" />
                <div className="h-3 bg-gray-200 rounded w-16" />
              </div>
            </div>
            <div className="space-y-2 mb-3">
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </div>
            <div className="flex gap-4">
              <div className="h-6 bg-gray-200 rounded w-12" />
              <div className="h-6 bg-gray-200 rounded w-12" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 댓글 작성 폼 */}
      <CommentForm
        postId={postId}
        onSubmit={handleCreateComment}
        placeholder="댓글을 작성해주세요..."
        submitText="댓글 작성"
      />

      {/* 정렬 탭 */}
      <div className="flex items-center gap-4 border-b border-gray-200">
        <button
          onClick={() => handleSortChange('latest')}
          className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
            sortBy === 'latest'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          최신순
        </button>
        <button
          onClick={() => handleSortChange('popular')}
          className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
            sortBy === 'popular'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          인기순
        </button>
        <span className="text-sm text-gray-500 ml-auto">
          댓글 {comments.length}개
        </span>
      </div>

      {/* 댓글 목록 */}
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id}>
            {editingComment?.id === comment.id ? (
              <CommentForm
                postId={postId}
                initialContent={editingComment.content}
                onSubmit={handleEditComment}
                onCancel={() => setEditingComment(null)}
                placeholder="댓글을 수정해주세요..."
                submitText="수정 완료"
              />
            ) : (
              <CommentItem
                comment={comment}
                onReply={(parentId) => setReplyingTo(parentId)}
                onEdit={(comment) => setEditingComment(comment)}
                onDelete={handleDeleteComment}
                onLike={handleLikeComment}
                onReport={(comment) => setReportingComment(comment)}
                onToggleReplies={handleToggleReplies}
                showReplies={expandedReplies.has(comment.id)}
              >
                {/* 답글 작성 폼 */}
                {replyingTo === comment.id && (
                  <div className="mt-3">
                    <CommentForm
                      postId={postId}
                      parentId={comment.id}
                      onSubmit={(content) => handleCreateReply(comment.id, content)}
                      onCancel={() => setReplyingTo(null)}
                      placeholder={`@${comment.author_nickname}님에게 답글...`}
                      submitText="답글 작성"
                    />
                  </div>
                )}

                {/* 대댓글 목록 */}
                {expandedReplies.has(comment.id) && repliesData[comment.id] && (
                  <div className="space-y-3">
                    {repliesData[comment.id].map((reply) => (
                      <CommentItem
                        key={reply.id}
                        comment={reply}
                        onReply={() => {}} // 대댓글의 대댓글은 지원하지 않음
                        onEdit={(comment) => setEditingComment(comment)}
                        onDelete={handleDeleteComment}
                        onLike={handleLikeComment}
                        onReport={(comment) => setReportingComment(comment)}
                        isReply={true}
                      />
                    ))}
                  </div>
                )}
              </CommentItem>
            )}
          </div>
        ))}

        {/* 더 불러오기 표시 */}
        {hasMore && (
          <div ref={observerRef} className="py-4">
            {loadingMore ? (
              <div className="flex justify-center">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="text-center text-gray-500 text-sm">
                스크롤하여 더 많은 댓글 보기
              </div>
            )}
          </div>
        )}

        {/* 댓글이 없는 경우 */}
        {!loading && comments.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">💬</div>
            <p className="text-lg font-medium mb-2">아직 댓글이 없습니다</p>
            <p className="text-sm">첫 번째 댓글을 작성해보세요!</p>
          </div>
        )}
      </div>

      {/* 신고 모달 */}
      {reportingComment && (
        <ReportModal
          comment={reportingComment}
          onClose={() => setReportingComment(null)}
        />
      )}
    </div>
  );
};

export default CommentList;
