import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config';

const ACCESS_TOKEN_KEY = 'findme_access_token';

/**
 * Upload a single photo to profile_photo endpoint
 */
export const uploadProfilePhoto = async (
  photoUri: string,
  fileName: string,
  mimeType: string
): Promise<any> => {
  try {
    const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);

    const formData = new FormData();
    formData.append('photo', {
      uri: photoUri,
      name: fileName,
      type: mimeType,
    } as any);

    const response = await fetch(`${API_URL}/api/users/me/photo`, {
      method: 'POST',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'bypass-tunnel-reminder': 'true',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData?.error ||
          `Upload failed with status ${response.status}`
      );
    }

    return await response.json();
  } catch (error: any) {
    console.error('uploadProfilePhoto error:', error);
    throw error;
  }
};

/**
 * Upload additional photos to photos endpoint
 */
export const uploadAdditionalPhotos = async (
  photoUri: string,
  fileName: string,
  mimeType: string
): Promise<any> => {
  try {
    const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);

    const formData = new FormData();
    formData.append('photos', {
      uri: photoUri,
      name: fileName,
      type: mimeType,
    } as any);

    const response = await fetch(`${API_URL}/api/users/me/photos`, {
      method: 'POST',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'bypass-tunnel-reminder': 'true',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData?.error ||
          `Upload failed with status ${response.status}`
      );
    }

    return await response.json();
  } catch (error: any) {
    console.error('uploadAdditionalPhotos error:', error);
    throw error;
  }
};
