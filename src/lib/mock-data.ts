// Mock data for the Mupa 3.0 MVP. Will be replaced by Supabase queries.

export type DeviceStatus = "online" | "offline";

export interface Device {
  id: string;
  code: string;
  name: string;
  store: string;
  status: DeviceStatus;
  lastSeen: string;
  resolution: string;
  playlistId: string;
}

export interface MediaItem {
  id: string;
  name: string;
  type: "image" | "video";
  url: string;
  duration: number; // seconds
  size: string;
  tags: string[];
}

export interface PlaylistItem {
  mediaId: string;
  duration: number;
  order: number;
}

export interface Playlist {
  id: string;
  name: string;
  items: PlaylistItem[];
  updatedAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  priority: number;
  status: "active" | "scheduled" | "ended";
  mediaIds: string[];
}

export interface Store {
  id: string;
  name: string;
  code: string;
  city: string;
  devices: number;
}

export const mediaItems: MediaItem[] = [
  {
    id: "m1",
    name: "Promo Verão 2026",
    type: "image",
    url: "https://images.unsplash.com/photo-1600&q=80?auto=format&fit=crop&w=1600&ixid=summer",
    duration: 8,
    size: "2.4 MB",
    tags: ["promo", "verão"],
  },
  {
    id: "m2",
    name: "Lançamento Smartphone",
    type: "image",
    url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1600&q=80",
    duration: 10,
    size: "3.1 MB",
    tags: ["eletrônicos"],
  },
  {
    id: "m3",
    name: "Horário de Funcionamento",
    type: "image",
    url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1600&q=80",
    duration: 6,
    size: "1.2 MB",
    tags: ["institucional"],
  },
  {
    id: "m4",
    name: "Black Friday Teaser",
    type: "image",
    url: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1600&q=80",
    duration: 8,
    size: "2.8 MB",
    tags: ["promo", "black-friday"],
  },
];

export const playlists: Playlist[] = [
  {
    id: "p1",
    name: "Playlist Padrão — Loja",
    updatedAt: "2026-04-22",
    items: [
      { mediaId: "m1", duration: 8, order: 1 },
      { mediaId: "m2", duration: 10, order: 2 },
      { mediaId: "m3", duration: 6, order: 3 },
      { mediaId: "m4", duration: 8, order: 4 },
    ],
  },
  {
    id: "p2",
    name: "Promo Eletrônicos",
    updatedAt: "2026-04-18",
    items: [
      { mediaId: "m2", duration: 12, order: 1 },
      { mediaId: "m4", duration: 8, order: 2 },
    ],
  },
];

export const campaigns: Campaign[] = [
  {
    id: "c1",
    name: "Promo Verão Nacional",
    startDate: "2026-04-01",
    endDate: "2026-05-31",
    priority: 1,
    status: "active",
    mediaIds: ["m1", "m4"],
  },
  {
    id: "c2",
    name: "Lançamento Smartphone X",
    startDate: "2026-05-10",
    endDate: "2026-06-10",
    priority: 2,
    status: "scheduled",
    mediaIds: ["m2"],
  },
];

export const stores: Store[] = [
  { id: "s1", name: "Loja Centro", code: "SP-001", city: "São Paulo, SP", devices: 4 },
  { id: "s2", name: "Loja Shopping Norte", code: "SP-002", city: "São Paulo, SP", devices: 6 },
  { id: "s3", name: "Loja Copacabana", code: "RJ-001", city: "Rio de Janeiro, RJ", devices: 3 },
  { id: "s4", name: "Loja BH Savassi", code: "MG-001", city: "Belo Horizonte, MG", devices: 2 },
];

export const devices: Device[] = [
  { id: "d1", code: "MUPA-001", name: "Vitrine Principal", store: "Loja Centro", status: "online", lastSeen: "agora", resolution: "1920×1080", playlistId: "p1" },
  { id: "d2", code: "MUPA-002", name: "Caixa 1", store: "Loja Centro", status: "online", lastSeen: "1 min", resolution: "1920×1080", playlistId: "p1" },
  { id: "d3", code: "MUPA-003", name: "Vitrine Lateral", store: "Loja Shopping Norte", status: "offline", lastSeen: "2 h", resolution: "3840×2160", playlistId: "p2" },
  { id: "d4", code: "MUPA-004", name: "Entrada", store: "Loja Copacabana", status: "online", lastSeen: "agora", resolution: "1920×1080", playlistId: "p1" },
  { id: "d5", code: "MUPA-005", name: "Provador", store: "Loja BH Savassi", status: "online", lastSeen: "3 min", resolution: "1366×768", playlistId: "p2" },
];

export function getMediaById(id: string) {
  return mediaItems.find((m) => m.id === id);
}

export function getPlaylistById(id: string) {
  return playlists.find((p) => p.id === id);
}

export function getDeviceByCode(code: string) {
  return devices.find((d) => d.code.toLowerCase() === code.toLowerCase());
}
