import React, { useMemo } from 'react';

type Props = {
  markdown: string;
};

// HTML인지 확인하는 함수
const isHTML = (str: string): boolean => {
  if (!str) return false;
  return /<[a-z][\s\S]*>/i.test(str);
};

// 안전한 URL인지 확인
const isSafeUrl = (url: string): boolean => {
  try {
    const u = new URL(url, window.location.origin);
    const p = u.protocol.toLowerCase();
    return p === 'http:' || p === 'https:' || p === 'data:' || p === 'blob:';
  } catch {
    return false;
  }
};

// HTML 콘텐츠 정리 (XSS 방지)
const sanitizeHTML = (html: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const scriptProtocol = 'javascript';
  
  // 스크립트 태그 제거
  doc.querySelectorAll('script').forEach(el => el.remove());
  
  // on* 이벤트 핸들러 제거
  doc.querySelectorAll('*').forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    });
  });
  
  // 안전하지 않은 href/src 제거
  doc.querySelectorAll('a[href]').forEach(el => {
    const href = el.getAttribute('href') || '';
    try {
      const protocol = new URL(href, window.location.origin).protocol.toLowerCase().replace(':', '');
      if (protocol === scriptProtocol) {
        el.removeAttribute('href');
      }
    } catch {
      // ignore malformed href
    }
  });
  
  doc.querySelectorAll('img[src]').forEach(el => {
    const src = el.getAttribute('src') || '';
    if (!isSafeUrl(src)) {
      el.removeAttribute('src');
    }
  });
  
  return doc.body.innerHTML;
};

export default function PostContent({ markdown }: Props) {
  const content = useMemo(() => {
    if (!markdown) return '';
    
    // HTML인 경우 sanitize 후 반환
    if (isHTML(markdown)) {
      return sanitizeHTML(markdown);
    }
    
    // 일반 텍스트인 경우 줄바꿈 처리
    return markdown
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br />');
  }, [markdown]);

  return (
    <>
      <style>{`
        .post-content h1 {
          font-size: 2em;
          font-weight: bold;
          margin-top: 0.67em;
          margin-bottom: 0.67em;
          line-height: 1.2;
        }
        .post-content h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin-top: 0.83em;
          margin-bottom: 0.83em;
          line-height: 1.3;
        }
        .post-content h3 {
          font-size: 1.17em;
          font-weight: bold;
          margin-top: 1em;
          margin-bottom: 1em;
          line-height: 1.4;
        }
        .post-content ul {
          list-style-type: disc;
          padding-left: 2em;
          margin: 1em 0;
        }
        .post-content ol {
          list-style-type: decimal;
          padding-left: 2em;
          margin: 1em 0;
        }
        .post-content li {
          margin: 0.5em 0;
        }
        .post-content ul ul {
          list-style-type: circle;
        }
        .post-content ul ul ul {
          list-style-type: square;
        }
        .post-content blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1em;
          margin: 1em 0;
          color: #6b7280;
          font-style: italic;
        }
        .post-content p {
          margin: 1em 0;
        }
        .post-content img {
          max-width: 100%;
          height: auto;
          border-radius: 0.375rem;
        }
        .post-content a {
          color: #2563eb;
          text-decoration: underline;
        }
        .post-content a:hover {
          color: #1d4ed8;
        }
        .post-content table {
          border-collapse: collapse;
          width: 100%;
          margin: 1em 0;
        }
        .post-content th,
        .post-content td {
          border: 1px solid #e5e7eb;
          padding: 0.5em 1em;
        }
        .post-content th {
          background-color: #f9fafb;
          font-weight: bold;
        }
      `}</style>
      <div 
        className="post-content prose max-w-none"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </>
  );
}
