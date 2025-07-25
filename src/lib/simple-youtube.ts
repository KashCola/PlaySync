import axios from 'axios';
import { YouTubePlaylist, YouTubeTrack, Track, Playlist } from '@/types';

// Simplified YouTube API for read-only access (no playlist creation)
export class SimpleYouTubeAPI {
  private apiKey: string;
  private baseURL = 'https://www.googleapis.com/youtube/v3';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}) {
    try {
      const response = await axios.get(`${this.baseURL}${endpoint}`, {
        params: {
          key: this.apiKey,
          ...params
        }
      });
      return response.data;
    } catch (error) {
      console.error('YouTube API error:', error);
      throw new Error(`YouTube API request failed: ${error}`);
    }
  }

  private parseDuration(isoDuration: string): number {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  }

  private youtubeTrackToTrack(youtubeTrack: YouTubeTrack): Track {
    const title = youtubeTrack.snippet.title;
    const channelTitle = youtubeTrack.snippet.channelTitle;
    
    let artist = channelTitle;
    let songName = title;
    
    if (title.includes(' - ')) {
      const parts = title.split(' - ');
      if (parts.length >= 2) {
        artist = parts[0].trim();
        songName = parts.slice(1).join(' - ').trim();
      }
    }

    return {
      id: youtubeTrack.id,
      name: songName,
      artists: [artist],
      album: 'YouTube',
      duration_ms: this.parseDuration(youtubeTrack.contentDetails.duration),
      external_urls: {
        youtube: `https://www.youtube.com/watch?v=${youtubeTrack.id}`
      }
    };
  }

  async getPlaylist(playlistId: string): Promise<Playlist> {
    // Get playlist info
    const playlistResponse = await this.makeRequest('/playlists', {
      part: 'snippet,contentDetails',
      id: playlistId
    });

    if (!playlistResponse.items || playlistResponse.items.length === 0) {
      throw new Error('Playlist not found or private');
    }

    const playlist: YouTubePlaylist = playlistResponse.items[0];

    // Get playlist items
    const itemsResponse = await this.makeRequest('/playlistItems', {
      part: 'snippet,contentDetails',
      playlistId: playlistId,
      maxResults: 50
    });

    // Get video details
    const videoIds = itemsResponse.items?.map((item: any) => item.contentDetails.videoId).join(',');
    const videosResponse = await this.makeRequest('/videos', {
      part: 'snippet,contentDetails',
      id: videoIds
    });

    const tracks = videosResponse.items?.map((video: YouTubeTrack) => 
      this.youtubeTrackToTrack(video)
    ) || [];

    return {
      id: playlist.id,
      name: playlist.snippet.title,
      description: playlist.snippet.description,
      tracks,
      total_tracks: playlist.contentDetails.itemCount,
      platform: 'youtube',
      cover_image: playlist.snippet.thumbnails.high?.url || playlist.snippet.thumbnails.medium?.url,
      external_urls: {
        youtube: `https://www.youtube.com/playlist?list=${playlist.id}`
      }
    };
  }

  async searchTrack(query: string): Promise<YouTubeTrack[]> {
    const response = await this.makeRequest('/search', {
      part: 'snippet',
      q: query,
      type: 'video',
      videoCategoryId: '10', // Music category
      maxResults: 5
    });

    if (response.items && response.items.length > 0) {
      const videoIds = response.items.map((item: any) => item.id.videoId).join(',');
      const detailsResponse = await this.makeRequest('/videos', {
        part: 'snippet,contentDetails',
        id: videoIds
      });
      return detailsResponse.items || [];
    }

    return [];
  }

  // Note: Cannot create playlists without OAuth - will show instructions instead
  async getConversionInstructions(tracks: Track[], playlistName: string): Promise<{
    instructions: string;
    trackList: string;
    searchQueries: string[];
  }> {
    const searchQueries = tracks.map(track => `${track.name} ${track.artists[0]}`);
    
    const trackList = tracks.map((track, index) => 
      `${index + 1}. ${track.name} - ${track.artists[0]}`
    ).join('\n');

    const instructions = `
To create "${playlistName}" on YouTube Music:

1. Go to https://music.youtube.com
2. Create a new playlist named "${playlistName}"
3. Search for and add these tracks:

${trackList}

Note: Due to YouTube's OAuth restrictions, automatic playlist creation requires additional verification.
`;

    return {
      instructions,
      trackList,
      searchQueries
    };
  }
}
