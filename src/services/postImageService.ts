import { supabase } from './supabaseClient';

export type UploadPostImageResult = {
  storagePath: string;
  publicUrl: string;
  fileSize: number;
};

const BUCKET_NAME = 'post-photos';

const makeSafeExt = (fileName: string, mimeType?: string) => {
  const byName = (fileName.split('.').pop() || '').toLowerCase();
  const byType =
    mimeType === 'image/png'
      ? 'png'
      : mimeType === 'image/webp'
        ? 'webp'
        : mimeType === 'image/gif'
          ? 'gif'
          : mimeType === 'image/jpeg'
            ? 'jpg'
            : '';

  const ext = byType || byName || 'jpg';
  return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg';
};

export async function uploadPostImage(params: {
  file: File;
  postTempId: string;
}): Promise<UploadPostImageResult> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('로그인이 필요합니다.');

  const userId = userData.user.id;
  const ext = makeSafeExt(params.file.name, params.file.type);
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const storagePath = `${userId}/${params.postTempId}/${fileName}`;

  const { error: upErr } = await supabase.storage.from(BUCKET_NAME).upload(storagePath, params.file, {
    cacheControl: '3600',
    upsert: false,
    contentType: params.file.type || undefined,
  });
  if (upErr) throw new Error(`사진 업로드 실패: ${upErr.message}`);

  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);

  return {
    storagePath,
    publicUrl: urlData.publicUrl,
    fileSize: params.file.size,
  };
}




