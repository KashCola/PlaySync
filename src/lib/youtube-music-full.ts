import { Playlist, Track } from '@/types';

export class YouTubeMusicAPI {
  private accessToken: string;
  private apiKey: string;

  constructor(accessToken: string, apiKey: string) {
    this.accessToken = accessToken;
    this.apiKey = apiKey;
  }

  static getAuthUrl(clientId: string, redirectUri: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.force-ssl'
    ];

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    return authUrl.toString();
  }

  async getPlaylist(playlistId: string): Promise<Playlist> {
    try {
      console.log('Fetching YouTube playlist:', playlistId);
      
      // Get playlist details
      const playlistUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${this.apiKey}`;
      console.log('Playlist URL:', playlistUrl);
      
      const playlistResponse = await fetch(playlistUrl);
      console.log('Playlist response status:', playlistResponse.status);

      if (!playlistResponse.ok) {
        const errorText = await playlistResponse.text();
        console.error('Playlist fetch error:', errorText);
        
        // Parse error for better messaging
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error?.reason === 'quotaExceeded') {
            throw new Error('QUOTA_EXCEEDED');
          }
          if (errorData.error?.message) {
            throw new Error(`YouTube API Error: ${errorData.error.message}`);
          }
        } catch (parseError) {
          // If we can't parse, check for common error patterns
          if (errorText.includes('quota') || errorText.includes('quotaExceeded')) {
            throw new Error('QUOTA_EXCEEDED');
          }
        }
        
        throw new Error(`Failed to fetch playlist details: ${playlistResponse.status} - ${errorText}`);
      }

      const playlistData = await playlistResponse.json();
      console.log('Playlist data received:', playlistData);
      
      if (!playlistData.items || playlistData.items.length === 0) {
        throw new Error('Playlist not found or is private. Make sure the playlist is public and the URL is correct.');
      }

      const playlist = playlistData.items[0];
      console.log('Playlist found:', playlist.snippet.title);

      // Get playlist items
      const tracks: Track[] = [];
      let nextPageToken = '';

      do {
        const itemsUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${this.apiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
        console.log('Fetching playlist items, page token:', nextPageToken || 'first page');
        
        const itemsResponse = await fetch(itemsUrl);
        console.log('Items response status:', itemsResponse.status);
        
        if (!itemsResponse.ok) {
          const errorText = await itemsResponse.text();
          console.error('Playlist items fetch error:', errorText);
          throw new Error(`Failed to fetch playlist items: ${itemsResponse.status} - ${errorText}`);
        }

        const itemsData = await itemsResponse.json();
        console.log('Items fetched:', itemsData.items?.length || 0);

        for (const item of itemsData.items || []) {
          if (item.snippet && item.snippet.title !== 'Deleted video') {
            tracks.push({
              id: item.snippet.resourceId?.videoId || item.id,
              name: item.snippet.title,
              artists: [item.snippet.videoOwnerChannelTitle || 'Unknown Artist'],
              album: '',
              duration_ms: 0,
              external_urls: {
                youtube: `https://music.youtube.com/watch?v=${item.snippet.resourceId?.videoId || item.id}`
              }
            });
          }
        }

        nextPageToken = itemsData.nextPageToken || '';
      } while (nextPageToken);

      console.log(`Playlist loaded successfully: "${playlist.snippet.title}" with ${tracks.length} tracks`);

      return {
        id: playlistId,
        name: playlist.snippet.title,
        description: playlist.snippet.description || '',
        tracks,
        total_tracks: tracks.length,
        platform: 'youtube' as const,
        external_urls: {
          youtube: `https://music.youtube.com/playlist?list=${playlistId}`
        }
      };
    } catch (error) {
      console.error('Error fetching YouTube playlist:', error);
      throw error;
    }
  }

  async searchTrack(query: string): Promise<Track[]> {
    try {
      console.log('Searching YouTube for:', query);
      
      // Try a simpler search without videoCategoryId first
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(query)}&key=${this.apiKey}`;
      console.log('Search URL:', searchUrl);
      
      const searchResponse = await fetch(searchUrl);
      console.log('Search response status:', searchResponse.status);

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error('YouTube search error:', errorText);
        
        // Try to parse the error response
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error?.reason === 'quotaExceeded') {
            throw new Error('QUOTA_EXCEEDED');
          }
          if (errorData.error?.message) {
            throw new Error(`YouTube API Error: ${errorData.error.message}`);
          }
        } catch (parseError) {
          // If we can't parse the error, check if it's a quota error
          if (errorText.includes('quota') || errorText.includes('quotaExceeded')) {
            throw new Error('QUOTA_EXCEEDED');
          }
        }
        
        throw new Error(`Failed to search tracks: ${searchResponse.status} - ${errorText}`);
      }

      const searchData = await searchResponse.json();
      console.log('Search results count:', searchData.items?.length || 0);

      if (!searchData.items || searchData.items.length === 0) {
        console.log('No search results for query:', query);
        return [];
      }

      return searchData.items.map((item: any) => ({
        id: item.id.videoId,
        name: item.snippet.title,
        artists: [item.snippet.channelTitle],
        album: '',
        duration_ms: 0,
        external_urls: {
          youtube: `https://music.youtube.com/watch?v=${item.id.videoId}`
        }
      }));
    } catch (error) {
      console.error('Error searching YouTube tracks:', error);
      throw error;
    }
  }

  async createPlaylist(name: string, description: string = '', isPublic: boolean = false): Promise<string> {
    try {
      const response = await fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet,status', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snippet: {
            title: name,
            description: description,
          },
          status: {
            privacyStatus: isPublic ? 'public' : 'private'
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to create playlist: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data.id;
    } catch (error) {
      console.error('Error creating YouTube playlist:', error);
      throw error;
    }
  }

  async addTracksToPlaylist(playlistId: string, trackIds: string[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const trackId of trackIds) {
      try {
        const response = await fetch('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            snippet: {
              playlistId: playlistId,
              resourceId: {
                kind: 'youtube#video',
                videoId: trackId
              }
            }
          })
        });

        if (response.ok) {
          success++;
        } else {
          failed++;
          console.error(`Failed to add track ${trackId} to playlist`);
        }
      } catch (error) {
        failed++;
        console.error(`Error adding track ${trackId}:`, error);
      }

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return { success, failed };
  }
}
