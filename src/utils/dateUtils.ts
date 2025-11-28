import { format, isToday, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

/**
 * 게시판용 날짜 포맷터
 * 오늘이면 HH:mm:ss, 아니면 yyyy-MM-dd
 */
export const formatBoardDate = (dateString: string): string => {
  const date = parseISO(dateString);
  
  if (isToday(date)) {
    return format(date, 'HH:mm:ss');
  } else {
    return format(date, 'yyyy-MM-dd');
  }
};

/**
 * 상세 페이지용 날짜 포맷터
 * yyyy.MM.dd HH:mm:ss
 */
export const formatDetailDate = (dateString: string): string => {
  const date = parseISO(dateString);
  return format(date, 'yyyy.MM.dd HH:mm:ss');
};



