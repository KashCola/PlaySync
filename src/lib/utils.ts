import { Track, SpotifyTrack, YouTubeTrack } from '@/types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const spotifyTrackToTrack = (spotifyTrack: SpotifyTrack): Track => ({
  id: spotifyTrack.id,
  name: spotifyTrack.name,
  artists: spotifyTrack.artists.map(artist => artist.name),
  album: spotifyTrack.album.name,
  duration_ms: spotifyTrack.duration_ms,
  preview_url: spotifyTrack.preview_url || undefined,
  external_urls: {
    spotify: spotifyTrack.external_urls.spotify
  }
});

export const youtubeTrackToTrack = (youtubeTrack: YouTubeTrack): Track => {
  // Extract artist and song from title (YouTube doesn't separate these cleanly)
  const title = youtubeTrack.snippet.title;
  const channelTitle = youtubeTrack.snippet.channelTitle;
  
  // Try to parse "Artist - Song" format
  let artist = channelTitle;
  let songName = title;
  
  if (title.includes(' - ')) {
    const parts = title.split(' - ');
    if (parts.length >= 2) {
      artist = parts[0].trim();
      songName = parts.slice(1).join(' - ').trim();
    }
  }

  // Convert ISO 8601 duration to milliseconds
  const parseDuration = (isoDuration: string): number => {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  };

  return {
    id: youtubeTrack.id,
    name: songName,
    artists: [artist],
    album: 'YouTube', // YouTube doesn't have album info
    duration_ms: parseDuration(youtubeTrack.contentDetails.duration),
    external_urls: {
      youtube: `https://www.youtube.com/watch?v=${youtubeTrack.id}`
    }
  };
};

export const normalizeTrackForSearch = (track: Track): string => {
  // Remove special characters and normalize for better matching
  const trackName = track.name.replace(/[^\w\s]/g, '').toLowerCase();
  const artistName = track.artists[0]?.replace(/[^\w\s]/g, '').toLowerCase() || '';
  return `${trackName} ${artistName}`;
};

export const calculateMatchScore = (track1: Track, track2: Track): number => {
  let score = 0;
  
  // Name similarity (40% weight)
  if (track1.name.toLowerCase() === track2.name.toLowerCase()) {
    score += 40;
  } else if (track1.name.toLowerCase().includes(track2.name.toLowerCase()) ||
             track2.name.toLowerCase().includes(track1.name.toLowerCase())) {
    score += 20;
  }
  
  // Artist similarity (35% weight)
  const artist1 = track1.artists[0]?.toLowerCase() || '';
  const artist2 = track2.artists[0]?.toLowerCase() || '';
  if (artist1 === artist2) {
    score += 35;
  } else if (artist1.includes(artist2) || artist2.includes(artist1)) {
    score += 17;
  }
  
  // Duration similarity (15% weight)
  const durationDiff = Math.abs(track1.duration_ms - track2.duration_ms);
  if (durationDiff < 5000) { // Within 5 seconds
    score += 15;
  } else if (durationDiff < 15000) { // Within 15 seconds
    score += 7;
  }
  
  // Album similarity (10% weight)
  if (track1.album.toLowerCase() === track2.album.toLowerCase()) {
    score += 10;
  } else if (track1.album.toLowerCase().includes(track2.album.toLowerCase()) ||
             track2.album.toLowerCase().includes(track1.album.toLowerCase())) {
    score += 5;
  }
  
  return score;
};

export const formatDuration = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const generatePlaylistName = (originalName: string, targetPlatform: 'spotify' | 'youtube'): string => {
  const platformName = targetPlatform === 'spotify' ? 'Spotify' : 'YouTube Music';
  return `${originalName} (from ${platformName})`;
};
