import axios from 'axios';
import { SpotifyPlaylist, SpotifyTrack, Track, Playlist } from '@/types';
import { spotifyTrackToTrack } from '@/lib/utils';

export class SpotifyAPI {
  private accessToken: string;
  private baseURL = 'https://api.spotify.com/v1';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async makeRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' = 'GET', data?: any) {
    try {
      const response = await axios({
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        data
      });
      return response.data;
    } catch (error) {
      console.error('Spotify API error:', error);
      throw new Error(`Spotify API request failed: ${error}`);
    }
  }

  async getPlaylist(playlistId: string): Promise<Playlist> {
    const playlist: SpotifyPlaylist = await this.makeRequest(`/playlists/${playlistId}`);
    
    return {
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      tracks: playlist.tracks.items.map(item => spotifyTrackToTrack(item.track)),
      total_tracks: playlist.tracks.total,
      platform: 'spotify',
      cover_image: playlist.images[0]?.url,
      external_urls: {
        spotify: playlist.external_urls.spotify
      }
    };
  }

  async searchTrack(query: string): Promise<SpotifyTrack[]> {
    const response = await this.makeRequest(`/search?q=${encodeURIComponent(query)}&type=track&limit=5`);
    return response.tracks.items;
  }

  async createPlaylist(userId: string, name: string, description: string): Promise<string> {
    const response = await this.makeRequest(`/users/${userId}/playlists`, 'POST', {
      name,
      description,
      public: false
    });
    return response.id;
  }

  async addTracksToPlaylist(playlistId: string, trackUris: string[]): Promise<void> {
    // Spotify API allows max 100 tracks per request
    const chunks = [];
    for (let i = 0; i < trackUris.length; i += 100) {
      chunks.push(trackUris.slice(i, i + 100));
    }

    for (const chunk of chunks) {
      await this.makeRequest(`/playlists/${playlistId}/tracks`, 'POST', {
        uris: chunk
      });
    }
  }

  async getCurrentUser() {
    return await this.makeRequest('/me');
  }

  async convertFromTracks(tracks: Track[], playlistName: string, description: string): Promise<{
    playlistId: string;
    matchedTracks: number;
    failedTracks: Track[];
  }> {
    const user = await this.getCurrentUser();
    const playlistId = await this.createPlaylist(user.id, playlistName, description);
    
    const matchedTrackUris: string[] = [];
    const failedTracks: Track[] = [];

    for (const track of tracks) {
      try {
        const query = `track:"${track.name}" artist:"${track.artists[0]}"`;
        const searchResults = await this.searchTrack(query);
        
        if (searchResults.length > 0) {
          matchedTrackUris.push(`spotify:track:${searchResults[0].id}`);
        } else {
          failedTracks.push(track);
        }
      } catch (error) {
        console.error(`Failed to search for track: ${track.name}`, error);
        failedTracks.push(track);
      }
    }

    if (matchedTrackUris.length > 0) {
      await this.addTracksToPlaylist(playlistId, matchedTrackUris);
    }

    return {
      playlistId,
      matchedTracks: matchedTrackUris.length,
      failedTracks
    };
  }
}
