/**
 * Static (mocked) info for the box the current athlete is subscribed to.
 * No backend yet -- this stands in for a future "subscribed box" API.
 */
export interface BoxInfo {
  name: string;
  owner: string;
  address: string;
  latitude: number;
  longitude: number;
  /** Digits only, international format (no "+"), used for the wa.me deep link. */
  whatsapp: string;
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
}

export const SUBSCRIBED_BOX: BoxInfo = {
  name: 'DLoveBox',
  owner: 'Daniela Rojas',
  address: 'Av. Providencia 1234, Providencia, Santiago, Chile',
  latitude: -33.426,
  longitude: -70.611,
  whatsapp: '56912345678',
  instagramUrl: 'https://instagram.com/dlovebox',
  facebookUrl: 'https://facebook.com/dlovebox',
  tiktokUrl: 'https://tiktok.com/@dlovebox',
};
