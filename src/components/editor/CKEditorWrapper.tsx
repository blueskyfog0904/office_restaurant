import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
  ClassicEditor,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Essentials,
  Paragraph,
  Heading,
  Link,
  List,
  Alignment,
  Image,
  ImageInsert,
  ImageStyle,
  ImageToolbar,
  Table,
  TableToolbar,
  BlockQuote,
  Indent,
  IndentBlock,
  Font,
  MediaEmbed,
  SourceEditing,
} from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';

interface CKEditorWrapperProps {
  value: string;
  onChange: (data: string) => void;
  placeholder?: string;
}

export interface CKEditorRef {
  insertImage: (url: string) => void;
  insertImages: (urls: string[]) => void;
  focus: () => void;
}

const CKEditorWrapper = forwardRef<CKEditorRef, CKEditorWrapperProps>(
  ({ value, onChange, placeholder }, ref) => {
    const editorRef = useRef<ClassicEditor | null>(null);

    useImperativeHandle(ref, () => ({
      insertImage: (url: string) => {
        if (editorRef.current) {
          editorRef.current.execute('insertImage', { source: url });
        }
      },
      insertImages: (urls: string[]) => {
        if (editorRef.current && urls.length > 0) {
          // CKEditor insertImage는 source 배열을 지원
          editorRef.current.execute('insertImage', { source: urls });
        }
      },
      focus: () => {
        editorRef.current?.editing.view.focus();
      },
    }));

    return (
      <div className="ckeditor-wrapper">
        <CKEditor
          editor={ClassicEditor}
          data={value}
          config={{
            licenseKey: 'GPL',
            plugins: [
              Essentials,
              Bold,
              Italic,
              Underline,
              Strikethrough,
              Paragraph,
              Heading,
              Link,
              List,
              Alignment,
              Image,
              ImageInsert,
              ImageStyle,
              ImageToolbar,
              Table,
              TableToolbar,
              BlockQuote,
              Indent,
              IndentBlock,
              Font,
              MediaEmbed,
              SourceEditing,
            ],
            toolbar: {
              items: [
                'heading',
                '|',
                'bold',
                'italic',
                'underline',
                'strikethrough',
                '|',
                'fontSize',
                'fontColor',
                '|',
                'alignment',
                '|',
                'bulletedList',
                'numberedList',
                '|',
                'outdent',
                'indent',
                '|',
                'link',
                'blockQuote',
                'insertTable',
                '|',
                'undo',
                'redo',
                '|',
                'sourceEditing',
              ],
              shouldNotGroupWhenFull: true,
            },
            heading: {
              options: [
                { model: 'paragraph', title: '본문', class: 'ck-heading_paragraph' },
                { model: 'heading1', view: 'h1', title: '제목 1', class: 'ck-heading_heading1' },
                { model: 'heading2', view: 'h2', title: '제목 2', class: 'ck-heading_heading2' },
                { model: 'heading3', view: 'h3', title: '제목 3', class: 'ck-heading_heading3' },
              ],
            },
            fontSize: {
              options: [9, 11, 13, 'default', 17, 19, 21, 27, 35],
            },
            image: {
              toolbar: [
                'imageStyle:inline',
                'imageStyle:block',
                'imageStyle:side',
                '|',
                'imageTextAlternative',
              ],
            },
            table: {
              contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells'],
            },
            placeholder: placeholder || '내용을 입력해주세요...',
            language: 'ko',
          }}
          onReady={(editor) => {
            editorRef.current = editor;
          }}
          onChange={(_, editor) => {
            const data = editor.getData();
            onChange(data);
          }}
        />
        <style>{`
          .ckeditor-wrapper .ck-editor__editable {
            min-height: 400px;
            max-height: 600px;
          }
          .ckeditor-wrapper .ck-editor__editable:focus {
            border-color: #3b82f6;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
          }
          .ckeditor-wrapper .ck.ck-toolbar {
            border-radius: 0.375rem 0.375rem 0 0;
            border-color: #d1d5db;
          }
          .ckeditor-wrapper .ck.ck-editor__main > .ck-editor__editable {
            border-radius: 0 0 0.375rem 0.375rem;
            border-color: #d1d5db;
          }
          /* 에디터 내부 제목 스타일 */
          .ckeditor-wrapper .ck-editor__editable h1 {
            font-size: 2em;
            font-weight: bold;
            margin: 0.67em 0;
            line-height: 1.2;
          }
          .ckeditor-wrapper .ck-editor__editable h2 {
            font-size: 1.5em;
            font-weight: bold;
            margin: 0.83em 0;
            line-height: 1.3;
          }
          .ckeditor-wrapper .ck-editor__editable h3 {
            font-size: 1.17em;
            font-weight: bold;
            margin: 1em 0;
            line-height: 1.4;
          }
          /* 에디터 내부 리스트 스타일 */
          .ckeditor-wrapper .ck-editor__editable ul {
            list-style-type: disc !important;
            padding-left: 2em !important;
            margin: 1em 0;
          }
          .ckeditor-wrapper .ck-editor__editable ol {
            list-style-type: decimal !important;
            padding-left: 2em !important;
            margin: 1em 0;
          }
          .ckeditor-wrapper .ck-editor__editable li {
            margin: 0.5em 0;
          }
          .ckeditor-wrapper .ck-editor__editable ul ul {
            list-style-type: circle !important;
          }
          .ckeditor-wrapper .ck-editor__editable ul ul ul {
            list-style-type: square !important;
          }
          /* 에디터 내부 인용 스타일 */
          .ckeditor-wrapper .ck-editor__editable blockquote {
            border-left: 4px solid #e5e7eb;
            padding-left: 1em;
            margin: 1em 0;
            color: #6b7280;
            font-style: italic;
          }
        `}</style>
      </div>
    );
  }
);

CKEditorWrapper.displayName = 'CKEditorWrapper';

export default CKEditorWrapper;

