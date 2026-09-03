import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export type SanitizedImage = {
  uri: string;
  width: number;
  height: number;
};

const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_DIMENSION = 1_600;

/**
 * Selects one still image and re-encodes it as JPEG before it ever reaches
 * storage. Re-encoding intentionally discards EXIF metadata, including GPS.
 */
export async function pickSanitizedImage(aspect?: [number, number]): Promise<SanitizedImage | null> {
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error('Photo access is required to choose an image. You can enable it in system settings.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: Platform.OS !== 'web',
    aspect,
    quality: 1,
    exif: false,
    base64: false,
    allowsMultipleSelection: false,
  });
  if (result.canceled) return null;

  const source = result.assets[0];
  if (!source || source.type && source.type !== 'image') throw new Error('Choose a JPEG, PNG, or WebP still image.');
  if (source.fileSize && source.fileSize > MAX_SOURCE_BYTES) throw new Error('That image is too large. Choose one smaller than 20 MB.');

  const resize = source.width >= source.height
    ? { width: Math.min(source.width || MAX_DIMENSION, MAX_DIMENSION) }
    : { height: Math.min(source.height || MAX_DIMENSION, MAX_DIMENSION) };
  const sanitized = await manipulateAsync(source.uri, [{ resize }], {
    compress: 0.82,
    format: SaveFormat.JPEG,
  });

  const response = await fetch(sanitized.uri);
  if (!response.ok) throw new Error('The selected image could not be prepared.');
  const byteLength = (await response.arrayBuffer()).byteLength;
  if (byteLength > MAX_UPLOAD_BYTES) throw new Error('The prepared image is still too large. Choose a smaller image.');

  return { uri: sanitized.uri, width: sanitized.width, height: sanitized.height };
}

export async function imageArrayBuffer(image: SanitizedImage) {
  const response = await fetch(image.uri);
  if (!response.ok) throw new Error('The prepared image is no longer available. Choose it again.');
  const data = await response.arrayBuffer();
  if (data.byteLength > MAX_UPLOAD_BYTES) throw new Error('The prepared image is too large to upload.');
  return data;
}
