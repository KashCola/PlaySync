export interface Track {
  id: string;
  name: string;
  artists: string[];
  album: string;
  duration_ms: number;
  preview_url?: string;
  external_urls?: {
    spotify?: string;
    youtube?: string;
  };
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  tracks: Track[];
  total_tracks: number;
  platform: 'spotify' | 'youtube';
  cover_image?: string;
  external_urls?: {
    spotify?: string;
    youtube?: string;
  };
}

export interface ConversionResult {
  success: boolean;
  matched_tracks: number;
  total_tracks: number;
  failed_tracks: Track[];
  playlist_url?: string;
  message: string;
  instructions?: string; // For manual YouTube Music creation
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: { name: string };
  duration_ms: number;
  preview_url: string | null;
  external_urls: { spotify: string };
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  tracks: {
    total: number;
    items: Array<{ track: SpotifyTrack }>;
  };
  images: Array<{ url: string }>;
  external_urls: { spotify: string };
}

export interface YouTubeTrack {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
    description: string;
    thumbnails: {
      default: { url: string };
      medium: { url: string };
      high: { url: string };
    };
  };
  contentDetails: {
    duration: string; // ISO 8601 format like "PT4M13S"
  };
}

export interface YouTubePlaylist {
  id: string;
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    thumbnails: {
      default: { url: string };
      medium: { url: string };
      high: { url: string };
    };
  };
  contentDetails: {
    itemCount: number;
  };
}
