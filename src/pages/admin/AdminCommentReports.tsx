import React, { useState, useEffect } from 'react';
import { 
  FlagIcon, 
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeSlashIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { supabase } from '../../services/supabaseClient';

interface CommentReport {
  id: string;
  comment_id: string;
  reporter_id: string;
  reason: string;
  description: string | null;
  status: 'pending' | 'reviewed' | 'dismissed';
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  comment: {
    id: string;
    content: string;
    content_html: string;
    status: string;
    user_id: string;
    created_at: string;
    author_nickname: string;
    author_avatar: string | null;
    post_id: string;
    post_title: string;
  };
  reporter: {
    nickname: string;
    avatar_url: string | null;
  };
}

const AdminCommentReports: React.FC = () => {
  const [reports, setReports] = useState<CommentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed' | 'dismissed'>('pending');

  // 신고 목록 로드
  const loadReports = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('comment_reports')
        .select(`
          *,
          comment:comment_id (
            id,
            content,
            content_html,
            status,
            user_id,
            created_at,
            post_id,
            profiles:user_id (
              nickname,
              avatar_url
            ),
            posts:post_id (
              title
            )
          ),
          reporter:reporter_id (
            nickname,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('신고 목록 로드 실패:', error);
        return;
      }

      // 데이터 변환
      const transformedReports = data?.map((report: any) => ({
        ...report,
        comment: {
          ...report.comment,
          author_nickname: report.comment.profiles?.nickname || '탈퇴한 사용자',
          author_avatar: report.comment.profiles?.avatar_url || null,
          post_title: report.comment.posts?.title || '삭제된 게시글'
        }
      })) || [];

      setReports(transformedReports);
    } catch (error) {
      console.error('신고 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 신고 상태 변경
  const handleStatusChange = async (reportId: string, newStatus: 'reviewed' | 'dismissed') => {
    try {
      const { error } = await supabase
        .from('comment_reports')
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', reportId);

      if (error) {
        console.error('신고 상태 변경 실패:', error);
        alert('상태 변경에 실패했습니다.');
        return;
      }

      loadReports();
      alert(`신고가 ${newStatus === 'reviewed' ? '검토 완료' : '기각'}되었습니다.`);
    } catch (error) {
      console.error('신고 상태 변경 실패:', error);
      alert('상태 변경에 실패했습니다.');
    }
  };

  // 댓글 상태 변경 (숨김/복원/삭제)
  const handleCommentAction = async (commentId: string, action: 'hide' | 'show' | 'delete') => {
    try {
      let updateData: any = {};
      
      switch (action) {
        case 'hide':
          updateData = { status: 'hidden' };
          break;
        case 'show':
          updateData = { status: 'published' };
          break;
        case 'delete':
          updateData = { 
            status: 'deleted',
            deleted_at: new Date().toISOString(),
            content: '[관리자에 의해 삭제된 댓글입니다]',
            content_html: '[관리자에 의해 삭제된 댓글입니다]'
          };
          break;
      }

      const { error } = await supabase
        .from('comments')
        .update(updateData)
        .eq('id', commentId);

      if (error) {
        console.error('댓글 상태 변경 실패:', error);
        alert('댓글 상태 변경에 실패했습니다.');
        return;
      }

      loadReports();
      alert(`댓글이 ${action === 'hide' ? '숨겨졌습니다' : action === 'show' ? '복원되었습니다' : '삭제되었습니다'}.`);
    } catch (error) {
      console.error('댓글 상태 변경 실패:', error);
      alert('댓글 상태 변경에 실패했습니다.');
    }
  };

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">대기중</span>;
      case 'reviewed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">검토완료</span>;
      case 'dismissed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">기각</span>;
      default:
        return null;
    }
  };

  const getReasonText = (reason: string) => {
    const reasonMap = {
      spam: '스팸/광고',
      harassment: '괴롭힘/욕설',
      inappropriate: '부적절한 내용',
      misinformation: '허위정보',
      other: '기타'
    };
    return reasonMap[reason as keyof typeof reasonMap] || reason;
  };

  const getCommentStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">게시중</span>;
      case 'hidden':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">숨김</span>;
      case 'deleted':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">삭제됨</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">댓글 신고 관리</h1>
        <p className="text-gray-600">사용자가 신고한 댓글을 검토하고 조치할 수 있습니다.</p>
      </div>

      {/* 필터 */}
      <div className="mb-6">
        <div className="flex space-x-4">
          {[
            { key: 'pending', label: '대기중', icon: ClockIcon },
            { key: 'reviewed', label: '검토완료', icon: CheckCircleIcon },
            { key: 'dismissed', label: '기각', icon: XCircleIcon },
            { key: 'all', label: '전체', icon: FlagIcon }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === key
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 신고 목록 */}
      <div className="space-y-4">
        {reports.length === 0 ? (
          <div className="text-center py-12">
            <FlagIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">신고가 없습니다</h3>
            <p className="text-gray-500">
              {filter === 'pending' ? '검토 대기 중인 신고가 없습니다.' : '해당 상태의 신고가 없습니다.'}
            </p>
          </div>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <FlagIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {getReasonText(report.reason)}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>신고자: {report.reporter.nickname}</span>
                      <span>•</span>
                      <span>{new Date(report.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(report.status)}
                  {getCommentStatusBadge(report.comment.status)}
                </div>
              </div>

              {/* 신고 설명 */}
              {report.description && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{report.description}</p>
                </div>
              )}

              {/* 신고된 댓글 */}
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                    {report.comment.author_avatar ? (
                      <img
                        src={report.comment.author_avatar}
                        alt={report.comment.author_nickname}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{report.comment.author_nickname}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(report.comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">게시글: {report.comment.post_title}</p>
                    <div 
                      className="text-sm text-gray-800"
                      dangerouslySetInnerHTML={{ __html: report.comment.content_html }}
                    />
                  </div>
                </div>
              </div>

              {/* 액션 버튼 */}
              {report.status === 'pending' && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStatusChange(report.id, 'reviewed')}
                      className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                      검토 완료
                    </button>
                    <button
                      onClick={() => handleStatusChange(report.id, 'dismissed')}
                      className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      <XCircleIcon className="w-4 h-4" />
                      기각
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {report.comment.status === 'published' && (
                      <button
                        onClick={() => handleCommentAction(report.comment.id, 'hide')}
                        className="flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition-colors"
                      >
                        <EyeSlashIcon className="w-4 h-4" />
                        숨기기
                      </button>
                    )}
                    {report.comment.status === 'hidden' && (
                      <button
                        onClick={() => handleCommentAction(report.comment.id, 'show')}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                      >
                        <EyeIcon className="w-4 h-4" />
                        복원
                      </button>
                    )}
                    {report.comment.status !== 'deleted' && (
                      <button
                        onClick={() => {
                          if (window.confirm('댓글을 완전히 삭제하시겠습니까?')) {
                            handleCommentAction(report.comment.id, 'delete');
                          }
                        }}
                        className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                        삭제
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminCommentReports;
