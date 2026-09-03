import * as Location from 'expo-location';

export type CurrentArea = {
  latitude: number;
  longitude: number;
  neighborhood: string;
  city: string;
  countryCode: string;
};

export async function getCurrentArea(): Promise<CurrentArea> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) throw new Error('Location permission is required for nearby matching. You can keep using Wilver without discovery.');
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const [place] = await Location.reverseGeocodeAsync(position.coords).catch(() => []);
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    neighborhood: place?.district || place?.subregion || place?.name || '',
    city: place?.city || place?.region || '',
    countryCode: place?.isoCountryCode || '',
  };
}
