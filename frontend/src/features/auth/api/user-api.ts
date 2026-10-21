import { apiClient } from '@/lib/api-client';

export interface UploadAvatarResponse {
  success: boolean;
  avatar_url: string;
}

/**
 * Tải ảnh đại diện người dùng lên LocalStack S3 và cập nhật cơ sở dữ liệu
 */
export async function uploadUserAvatar(file: File): Promise<UploadAvatarResponse> {
  const formData = new FormData();
  formData.append('file', file);

  return apiClient<UploadAvatarResponse>('/users/avatar', {
    method: 'POST',
    body: formData,
  });
}
