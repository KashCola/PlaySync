'use client';

import { useEffect, useState } from 'react';
import { PlaylistConverter } from '@/components/playlist-converter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Music } from 'lucide-react';

export default function Home() {
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const [youtubeToken, setYoutubeToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check URL parameters for auth success
    const urlParams = new URLSearchParams(window.location.search);
    const spotifyConnected = urlParams.get('spotify_connected');
    const youtubeConnected = urlParams.get('youtube_connected');
    
    // Check for tokens
    const checkAuth = async () => {
      try {
        // Check Spotify token
        console.log('Checking Spotify auth...');
        const spotifyResponse = await fetch('/api/auth/spotify/token');
        console.log('Spotify token response:', spotifyResponse.status, spotifyResponse.ok);
        
        if (spotifyResponse.ok) {
          const spotifyData = await spotifyResponse.json();
          console.log('Spotify token data:', spotifyData);
          setSpotifyToken(spotifyData.accessToken);
        } else {
          const errorData = await spotifyResponse.json();
          console.log('Spotify token error:', errorData);
        }

        // Check YouTube token
        console.log('Checking YouTube auth...');
        const youtubeResponse = await fetch('/api/auth/youtube/token');
        console.log('YouTube token response:', youtubeResponse.status, youtubeResponse.ok);
        
        if (youtubeResponse.ok) {
          const youtubeData = await youtubeResponse.json();
          console.log('YouTube token data:', youtubeData);
          setYoutubeToken(youtubeData.accessToken);
        } else {
          const errorData = await youtubeResponse.json();
          console.log('YouTube token error:', errorData);
        }
      } catch (error) {
        console.error('Failed to check auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // If we just came back from OAuth, wait a bit for cookies to be set
    if (spotifyConnected || youtubeConnected) {
      setTimeout(checkAuth, 500);
    } else {
      checkAuth();
    }
  }, []);

  const connectSpotify = () => {
    window.location.href = '/api/auth/spotify';
  };

  const connectYoutube = () => {
    window.location.href = '/api/auth/youtube';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 text-4xl font-bold text-gray-900 mb-4">
            <Music className="h-10 w-10 text-blue-600" />
            <span>PlaySync</span>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Seamlessly convert your playlists between Spotify and YouTube Music. 
            Connect your accounts and start converting!
          </p>
        </div>

        {(!spotifyToken || !youtubeToken) && (
          <div className="max-w-2xl mx-auto mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Connect Your Music Accounts</CardTitle>
                <CardDescription>
                  Connect both Spotify and YouTube Music to enable full playlist conversion functionality.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <Music className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-medium">Spotify</span>
                      {spotifyToken && (
                        <span className="text-green-600 text-sm">✓ Connected</span>
                      )}
                    </div>
                    <Button 
                      onClick={connectSpotify}
                      disabled={!!spotifyToken}
                      variant={spotifyToken ? "secondary" : "default"}
                      className="w-full"
                    >
                      {spotifyToken ? 'Connected to Spotify' : 'Connect Spotify'}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                        <Music className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-medium">YouTube Music</span>
                      {youtubeToken && (
                        <span className="text-green-600 text-sm">✓ Connected</span>
                      )}
                    </div>
                    <Button 
                      onClick={connectYoutube}
                      disabled={!!youtubeToken}
                      variant={youtubeToken ? "secondary" : "default"}
                      className="w-full"
                    >
                      {youtubeToken ? 'Connected to YouTube Music' : 'Connect YouTube Music'}
                    </Button>
                    {!youtubeToken && (
                      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                        <p className="font-medium">Full YouTube Music Access</p>
                        <p>Connect to enable automatic playlist creation. Requires OAuth verification.</p>
                      </div>
                    )}
                  </div>
                </div>

                {(!spotifyToken || !youtubeToken) && (
                  <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
                    <p className="font-medium text-blue-800">Connect Both Accounts</p>
                    <p>Connect both services to enable full playlist conversion functionality.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <PlaylistConverter 
          spotifyAccessToken={spotifyToken || undefined}
          youtubeAccessToken={youtubeToken || undefined}
          youtubeApiKey={process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}
        />

        <div className="max-w-4xl mx-auto mt-12">
          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-blue-600 font-bold">1</span>
                  </div>
                  <h3 className="font-medium">Paste Playlist URL</h3>
                  <p className="text-sm text-gray-600">
                    Copy and paste a Spotify or YouTube Music playlist URL
                  </p>
                </div>
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-blue-600 font-bold">2</span>
                  </div>
                  <h3 className="font-medium">Smart Matching</h3>
                  <p className="text-sm text-gray-600">
                    Our algorithm finds matching tracks on the target platform
                  </p>
                </div>
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-blue-600 font-bold">3</span>
                  </div>
                  <h3 className="font-medium">Enjoy Your Playlist</h3>
                  <p className="text-sm text-gray-600">
                    Access your converted playlist on your preferred platform
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
