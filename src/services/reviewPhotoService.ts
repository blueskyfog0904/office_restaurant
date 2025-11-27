import { supabase, getSupabaseAdmin } from './supabaseClient';
import { ReviewPhoto, ReviewPhotoUploadResult } from '../types';
import { compressImage, CompressedImage } from '../utils/imageCompressor';

const BUCKET_NAME = 'review-photos';
const MAX_PHOTOS_PER_REVIEW = 10;

const isLocalhost = () => {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
};

// auth.users 테이블에 실제 존재하는 테스트 유저 ID
const LOCALHOST_USER_ID = '11111111-1111-1111-1111-111111111111';

// localhost에서 사용할 클라이언트 (Service Role Key로 RLS 우회)
const getClient = () => isLocalhost() ? getSupabaseAdmin() : supabase;

export const uploadReviewPhoto = async (
  reviewId: string,
  file: File,
  displayOrder: number = 0
): Promise<ReviewPhotoUploadResult> => {
  let userId: string;
  
  if (isLocalhost()) {
    userId = LOCALHOST_USER_ID;
  } else {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      throw new Error('로그인이 필요합니다.');
    }
    userId = userData.user.id;
  }

  const compressed = await compressImage(file);
  const fileToUpload = compressed.file;

  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const fileName = `${timestamp}_${randomStr}.jpg`;
  const storagePath = `${userId}/${reviewId}/${fileName}`;

  // localhost에서는 admin client 사용 (RLS 우회)
  const client = getClient();

  const { error: uploadError } = await client.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileToUpload, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`사진 업로드 실패: ${uploadError.message}`);
  }

  const { data: urlData } = client.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  const photoUrl = urlData.publicUrl;

  const { data: photoData, error: dbError } = await client
    .from('review_photos')
    .insert({
      review_id: reviewId,
      user_id: userId,
      photo_url: photoUrl,
      storage_path: storagePath,
      file_size: fileToUpload.size,
      display_order: displayOrder,
    })
    .select()
    .single();

  if (dbError) {
    await client.storage.from(BUCKET_NAME).remove([storagePath]);
    throw new Error(`사진 정보 저장 실패: ${dbError.message}`);
  }

  return {
    id: photoData.id,
    photo_url: photoUrl,
    storage_path: storagePath,
    file_size: fileToUpload.size,
  };
};

export const uploadReviewPhotos = async (
  reviewId: string,
  files: File[],
  onProgress?: (current: number, total: number) => void
): Promise<ReviewPhotoUploadResult[]> => {
  if (files.length > MAX_PHOTOS_PER_REVIEW) {
    throw new Error(`최대 ${MAX_PHOTOS_PER_REVIEW}장까지 업로드 가능합니다.`);
  }

  const existingCount = await getReviewPhotoCount(reviewId);
  if (existingCount + files.length > MAX_PHOTOS_PER_REVIEW) {
    throw new Error(
      `이미 ${existingCount}장이 등록되어 있습니다. 최대 ${MAX_PHOTOS_PER_REVIEW - existingCount}장 추가 가능합니다.`
    );
  }

  const results: ReviewPhotoUploadResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const result = await uploadReviewPhoto(reviewId, files[i], existingCount + i);
    results.push(result);
    onProgress?.(i + 1, files.length);
  }

  return results;
};

export const deleteReviewPhoto = async (photoId: string): Promise<void> => {
  let currentUserId: string;
  let isAdmin = false;
  
  if (isLocalhost()) {
    currentUserId = LOCALHOST_USER_ID;
    isAdmin = true;
  } else {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      throw new Error('로그인이 필요합니다.');
    }
    currentUserId = userData.user.id;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', currentUserId)
      .single();
    
    isAdmin = profile?.is_admin === true;
  }

  // localhost에서는 admin client 사용 (RLS 우회)
  const client = getClient();

  const { data: photo, error: fetchError } = await client
    .from('review_photos')
    .select('storage_path, user_id')
    .eq('id', photoId)
    .single();

  if (fetchError || !photo) {
    throw new Error('사진을 찾을 수 없습니다.');
  }

  const isOwner = photo.user_id === currentUserId;

  if (!isOwner && !isAdmin) {
    throw new Error('삭제 권한이 없습니다.');
  }

  const { error: storageError } = await client.storage
    .from(BUCKET_NAME)
    .remove([photo.storage_path]);

  if (storageError) {
    console.warn('Storage 파일 삭제 실패:', storageError);
  }

  const { error: dbError } = await client
    .from('review_photos')
    .delete()
    .eq('id', photoId);

  if (dbError) {
    throw new Error(`사진 삭제 실패: ${dbError.message}`);
  }
};

export const getReviewPhotos = async (reviewId: string): Promise<ReviewPhoto[]> => {
  // 리뷰 사진 조회는 비로그인 사용자도 볼 수 있어야 하므로 일반 supabase 클라이언트 사용
  const { data, error } = await supabase
    .from('review_photos')
    .select('*')
    .eq('review_id', reviewId)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('리뷰 사진 조회 실패:', error);
    // 에러가 발생해도 빈 배열 반환 (비로그인 상태에서 RLS 에러 발생 시)
    return [];
  }

  return data || [];
};

export const getReviewPhotoCount = async (reviewId: string): Promise<number> => {
  const client = getClient();
  
  const { count, error } = await client
    .from('review_photos')
    .select('*', { count: 'exact', head: true })
    .eq('review_id', reviewId);

  if (error) {
    throw new Error(`사진 개수 조회 실패: ${error.message}`);
  }

  return count || 0;
};

export const updatePhotoOrder = async (
  photoId: string,
  newOrder: number
): Promise<void> => {
  let userId: string;
  
  if (isLocalhost()) {
    userId = LOCALHOST_USER_ID;
  } else {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      throw new Error('로그인이 필요합니다.');
    }
    userId = userData.user.id;
  }

  const client = getClient();
  
  const { error } = await client
    .from('review_photos')
    .update({ display_order: newOrder })
    .eq('id', photoId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`순서 변경 실패: ${error.message}`);
  }
};

export interface PendingPhoto {
  id: string;
  file: File;
  preview: string;
  compressed: CompressedImage;
}

export const preparePhotosForUpload = async (
  files: File[],
  onProgress?: (current: number, total: number) => void
): Promise<PendingPhoto[]> => {
  const pendingPhotos: PendingPhoto[] = [];

  for (let i = 0; i < files.length; i++) {
    const compressed = await compressImage(files[i]);
    pendingPhotos.push({
      id: `pending_${Date.now()}_${i}`,
      file: files[i],
      preview: compressed.preview,
      compressed,
    });
    onProgress?.(i + 1, files.length);
  }

  return pendingPhotos;
};

