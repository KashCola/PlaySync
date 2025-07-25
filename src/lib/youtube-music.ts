import axios from 'axios';
import { YouTubePlaylist, YouTubeTrack, Track, Playlist } from '@/types';

export class YouTubeMusicAPI {
  private apiKey: string;
  private accessToken?: string;
  private baseURL = 'https://www.googleapis.com/youtube/v3';

  constructor(apiKey: string, accessToken?: string) {
    this.apiKey = apiKey;
    this.accessToken = accessToken;
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}) {
    try {
      const response = await axios.get(`${this.baseURL}${endpoint}`, {
        params: {
          key: this.apiKey,
          ...params
        },
        headers: this.accessToken ? {
          'Authorization': `Bearer ${this.accessToken}`
        } : {}
      });
      return response.data;
    } catch (error) {
      console.error('YouTube API error:', error);
      throw new Error(`YouTube API request failed: ${error}`);
    }
  }

  private parseDuration(isoDuration: string): number {
    // Convert ISO 8601 duration (PT4M13S) to milliseconds
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  }

  private youtubeTrackToTrack(youtubeTrack: YouTubeTrack, playlistItem?: any): Track {
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

    return {
      id: youtubeTrack.id,
      name: songName,
      artists: [artist],
      album: 'YouTube', // YouTube doesn't have album info
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
      throw new Error('Playlist not found');
    }

    const playlist: YouTubePlaylist = playlistResponse.items[0];

    // Get playlist items (tracks)
    const itemsResponse = await this.makeRequest('/playlistItems', {
      part: 'snippet,contentDetails',
      playlistId: playlistId,
      maxResults: 50 // YouTube API limit
    });

    // Get detailed video info for duration
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

    // Get detailed info including duration
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

  async createPlaylist(title: string, description: string): Promise<string> {
    if (!this.accessToken) {
      throw new Error('YouTube Music authentication required to create playlists');
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/playlists`,
        {
          snippet: {
            title,
            description,
            defaultLanguage: 'en'
          },
          status: {
            privacyStatus: 'private'
          }
        },
        {
          params: { part: 'snippet,status', key: this.apiKey },
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data.id;
    } catch (error) {
      console.error('Failed to create YouTube playlist:', error);
      throw error;
    }
  }

  async addTracksToPlaylist(playlistId: string, videoIds: string[]): Promise<void> {
    if (!this.accessToken) {
      throw new Error('YouTube Music authentication required to add tracks');
    }

    for (const videoId of videoIds) {
      try {
        await axios.post(
          `${this.baseURL}/playlistItems`,
          {
            snippet: {
              playlistId,
              resourceId: {
                kind: 'youtube#video',
                videoId
              }
            }
          },
          {
            params: { part: 'snippet', key: this.apiKey },
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
      } catch (error) {
        console.error(`Failed to add video ${videoId} to playlist:`, error);
        // Continue with other tracks even if one fails
      }
    }
  }

  async convertFromTracks(tracks: Track[], playlistName: string, description: string): Promise<{
    playlistId: string;
    matchedTracks: number;
    failedTracks: Track[];
  }> {
    const playlistId = await this.createPlaylist(playlistName, description);
    
    const matchedVideoIds: string[] = [];
    const failedTracks: Track[] = [];

    for (const track of tracks) {
      try {
        const query = `${track.name} ${track.artists[0]} music`;
        const searchResults = await this.searchTrack(query);
        
        if (searchResults.length > 0) {
          matchedVideoIds.push(searchResults[0].id);
        } else {
          failedTracks.push(track);
        }
      } catch (error) {
        console.error(`Failed to search for track: ${track.name}`, error);
        failedTracks.push(track);
      }
    }

    if (matchedVideoIds.length > 0) {
      await this.addTracksToPlaylist(playlistId, matchedVideoIds);
    }

    return {
      playlistId,
      matchedTracks: matchedVideoIds.length,
      failedTracks
    };
  }

  // Helper method to get OAuth URL for YouTube authentication
  static getAuthUrl(clientId: string, redirectUri: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.force-ssl'
    ].join(' ');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }
}
