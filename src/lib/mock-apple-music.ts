import { AppleMusicPlaylist, AppleMusicTrack, Track, Playlist } from '@/types';
import { appleMusicTrackToTrack } from '@/lib/utils';

// Mock Apple Music API for development/demo purposes
export class MockAppleMusicAPI {
  private isAuthorized = false;

  async initialize(developerToken: string, appName: string) {
    console.log('🍎 Mock Apple Music API initialized');
    return Promise.resolve();
  }

  async authorize(): Promise<boolean> {
    console.log('🍎 Mock Apple Music authorization (always succeeds)');
    this.isAuthorized = true;
    return true;
  }

  async getPlaylist(playlistId: string): Promise<Playlist> {
    // Return mock playlist data
    return {
      id: playlistId,
      name: 'Mock Apple Music Playlist',
      description: 'This is a mock playlist for development',
      tracks: [
        {
          id: 'mock-1',
          name: 'Shape of You',
          artists: ['Ed Sheeran'],
          album: '÷ (Divide)',
          duration_ms: 233000,
          external_urls: { apple: 'https://music.apple.com/mock' }
        },
        {
          id: 'mock-2', 
          name: 'Blinding Lights',
          artists: ['The Weeknd'],
          album: 'After Hours',
          duration_ms: 200000,
          external_urls: { apple: 'https://music.apple.com/mock' }
        }
      ],
      total_tracks: 2,
      platform: 'apple',
      cover_image: '/placeholder-playlist.svg'
    };
  }

  async searchTrack(query: string): Promise<AppleMusicTrack[]> {
    console.log(`🍎 Mock search for: ${query}`);
    // Return mock search results
    return [{
      id: 'mock-search-1',
      attributes: {
        name: 'Mock Search Result',
        artistName: 'Mock Artist',
        albumName: 'Mock Album',
        durationInMillis: 180000
      }
    }];
  }

  async createPlaylist(name: string, description: string): Promise<string> {
    console.log(`🍎 Mock created playlist: ${name}`);
    return `mock-playlist-${Date.now()}`;
  }

  async addTracksToPlaylist(playlistId: string, trackIds: string[]): Promise<void> {
    console.log(`🍎 Mock added ${trackIds.length} tracks to playlist ${playlistId}`);
    return Promise.resolve();
  }

  async convertFromTracks(tracks: Track[], playlistName: string, description: string): Promise<{
    playlistId: string;
    matchedTracks: number;
    failedTracks: Track[];
  }> {
    console.log(`🍎 Mock converting ${tracks.length} tracks to Apple Music`);
    
    // Simulate some successful matches and some failures
    const matchedCount = Math.floor(tracks.length * 0.8); // 80% success rate
    const failedTracks = tracks.slice(matchedCount);
    
    return {
      playlistId: `mock-playlist-${Date.now()}`,
      matchedTracks: matchedCount,
      failedTracks
    };
  }

  async getUserPlaylists(): Promise<Playlist[]> {
    return [
      {
        id: 'mock-user-playlist-1',
        name: 'My Mock Playlist',
        description: 'A mock user playlist',
        tracks: [],
        total_tracks: 15,
        platform: 'apple',
        cover_image: '/placeholder-playlist.svg'
      }
    ];
  }
}
