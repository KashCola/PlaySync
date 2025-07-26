'use client';

import { useEffect, useState } from 'react';
import { PlaylistConverter } from '@/components/playlist-converter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaySyncWordmark, PlaySyncLogo } from '@/components/ui/logo';
import { Music, Sparkles, Zap, Shield } from 'lucide-react';

export default function Home() {
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const [youtubeToken, setYoutubeToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [heroVisible, setHeroVisible] = useState(true);

  useEffect(() => {
    // Optimized scroll listener with throttling
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrolled = window.scrollY;
          setHeroVisible(scrolled < 100);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Add initial animation classes
    const timer = setTimeout(() => {
      document.body.classList.add('loaded');
    }, 100);

    return () => clearTimeout(timer);
  }, []);

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
      <div className="min-h-screen flex items-center justify-center" style={{background: 'linear-gradient(135deg, #fdfcfb 0%, #f9f6f3 50%, #f5f2ee 100%)'}}>
        <div className="text-center space-y-4 animate-bounce-in">
          <PlaySyncLogo size="xl" className="mx-auto animate-pulse-slow" />
          <p className="text-gray-600 animate-fade-in">Loading PlaySync...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{background: 'linear-gradient(135deg, #fdfcfb 0%, #f9f6f3 50%, #f5f2ee 100%)'}}>
      {/* Hero Section with scroll animation */}
      <div className={`relative overflow-hidden transition-all duration-500 ease-out hide-on-scroll ${!heroVisible ? 'hidden' : ''}`}>
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-orange-500/5" />
        <div className="relative container mx-auto px-4 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <div className="animate-fade-in flex justify-center mb-8">
              <PlaySyncWordmark className="" />
            </div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed animate-fade-in animate-stagger-1">
              Seamlessly convert your playlists between Spotify and YouTube Music. 
              Connect your accounts and let our smart matching algorithm do the magic ✨
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {(!spotifyToken || !youtubeToken) && (
          <div className="max-w-2xl mx-auto mb-16 animate-fade-in animate-stagger-2">
            <Card className="border-0" style={{backgroundColor: '#faf8f5', boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04), 0 1px 4px rgba(0, 0, 0, 0.02)'}}>
              <CardHeader className="text-center pt-8">
                <CardTitle className="text-2xl gradient-text">Connect Your Music Accounts</CardTitle>
                <CardDescription className="text-base mt-2">
                  Connect both Spotify and YouTube Music to unlock the full power of playlist conversion.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-4 rounded-xl hover:scale-105 transition-transform duration-200" style={{backgroundColor: '#f0f9f0', border: '1px solid #d4f4d4'}}>
                      <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center" style={{boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'}}>
                        <Music className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <span className="font-semibold text-gray-900">Spotify</span>
                        {spotifyToken && (
                          <div className="flex items-center space-x-1 text-green-600 text-sm mt-1">
                            <Shield className="h-3 w-3" />
                            <span>Connected & Authenticated</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button 
                      onClick={connectSpotify}
                      disabled={!!spotifyToken}
                      variant={spotifyToken ? "secondary" : "default"}
                      className={`w-full py-3 text-base font-medium transition-all duration-200 hover:scale-105 ${
                        !spotifyToken 
                          ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0' 
                          : ''
                      }`}
                      style={!spotifyToken ? {boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'} : {}}
                    >
                      {spotifyToken ? '✓ Connected to Spotify' : 'Connect Spotify Account'}
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-4 rounded-xl hover:scale-105 transition-transform duration-200" style={{backgroundColor: '#fef2f2', border: '1px solid #fecaca'}}>
                      <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center" style={{boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'}}>
                        <Music className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <span className="font-semibold text-gray-900">YouTube Music</span>
                        {youtubeToken && (
                          <div className="flex items-center space-x-1 text-green-600 text-sm mt-1">
                            <Shield className="h-3 w-3" />
                            <span>Connected & Authenticated</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button 
                      onClick={connectYoutube}
                      disabled={!!youtubeToken}
                      variant={youtubeToken ? "secondary" : "default"}
                      className={`w-full py-3 text-base font-medium transition-all duration-200 hover:scale-105 ${
                        !youtubeToken 
                          ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0' 
                          : ''
                      }`}
                      style={!youtubeToken ? {boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'} : {}}
                    >
                      {youtubeToken ? '✓ Connected to YouTube Music' : 'Connect YouTube Music'}
                    </Button>
                    {!youtubeToken && (
                      <div className="text-sm text-gray-600 p-4 rounded-xl animate-fade-in animate-stagger-3" style={{backgroundColor: '#eff6ff', border: '1px solid #bfdbfe'}}>
                        <div className="flex items-start space-x-2">
                          <Sparkles className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0 animate-pulse-slow" />
                          <div>
                            <p className="font-medium text-blue-900">Full YouTube Music Access</p>
                            <p className="mt-1">Connect to enable automatic playlist creation with OAuth verification.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {(!spotifyToken || !youtubeToken) && (
                  <div className="text-center p-4 rounded-xl animate-bounce-in animate-stagger-3" style={{background: 'linear-gradient(135deg, #f3e8ff 0%, #fce7f3 100%)', border: '1px solid #d8b4fe'}}>
                    <div className="flex items-center justify-center space-x-2 text-purple-700 mb-2">
                      <Zap className="h-4 w-4 animate-pulse-slow" />
                      <p className="font-medium">Almost Ready!</p>
                    </div>
                    <p className="text-sm text-purple-600">Connect both services to unlock seamless playlist conversion.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="animate-slide-up animate-stagger-3">
          <PlaylistConverter 
            spotifyAccessToken={spotifyToken || undefined}
            youtubeAccessToken={youtubeToken || undefined}
            youtubeApiKey={process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}
          />
        </div>

        <div className="max-w-6xl mx-auto mt-16 animate-fade-in animate-stagger-3">
          <Card className="border-0" style={{backgroundColor: '#faf8f5', boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04), 0 1px 4px rgba(0, 0, 0, 0.02)'}}>
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-3xl gradient-text mb-4 animate-bounce-in">How PlaySync Works</CardTitle>
              <CardDescription className="text-lg max-w-2xl mx-auto animate-fade-in animate-stagger-1">
                Our intelligent matching system makes playlist conversion effortless
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center space-y-4 group animate-slide-up animate-stagger-1">
                  <div className="relative mx-auto w-16 h-16">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center transition-all duration-300 transform group-hover:scale-110 animate-float" style={{boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'}}>
                      <span className="text-white font-bold text-xl">1</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl opacity-30 blur-sm group-hover:opacity-50 transition-opacity duration-300 -z-10" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Paste Your Playlist</h3>
                  <p className="text-gray-600">
                    Simply copy and paste any Spotify or YouTube Music playlist URL to get started
                  </p>
                </div>
                
                <div className="text-center space-y-4 group animate-slide-up animate-stagger-2">
                  <div className="relative mx-auto w-16 h-16">
                    <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-orange-500 rounded-2xl flex items-center justify-center transition-all duration-300 transform group-hover:scale-110 animate-float" style={{animationDelay: '1s', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'}}>
                      <Sparkles className="h-8 w-8 text-white animate-pulse-slow" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-orange-500 rounded-2xl opacity-30 blur-sm group-hover:opacity-50 transition-opacity duration-300 -z-10" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Smart AI Matching</h3>
                  <p className="text-gray-600">
                    Our advanced algorithm intelligently matches tracks across platforms with high accuracy
                  </p>
                </div>
                
                <div className="text-center space-y-4 group animate-slide-up animate-stagger-3">
                  <div className="relative mx-auto w-16 h-16">
                    <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-purple-500 rounded-2xl flex items-center justify-center transition-all duration-300 transform group-hover:scale-110 animate-float" style={{animationDelay: '2s', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'}}>
                      <Zap className="h-8 w-8 text-white animate-pulse-slow" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-purple-500 rounded-2xl opacity-30 blur-sm group-hover:opacity-50 transition-opacity duration-300 -z-10" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Instant Conversion</h3>
                  <p className="text-gray-600">
                    Get your converted playlist ready in seconds, automatically created on your target platform
                  </p>
                </div>
              </div>

              {/* Feature highlights */}
              <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-3 p-4 rounded-xl transform hover:scale-105 transition-all duration-300 animate-fade-in animate-stagger-1" style={{backgroundColor: '#f3e8ff', border: '1px solid #d8b4fe'}}>
                  <Shield className="h-5 w-5 text-purple-600 mt-1 flex-shrink-0 animate-pulse-slow" />
                  <div>
                    <h4 className="font-semibold text-purple-900">Secure & Private</h4>
                    <p className="text-purple-700 text-sm mt-1">Your data is encrypted and never stored. We only access what's needed for conversion.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-4 rounded-xl transform hover:scale-105 transition-all duration-300 animate-fade-in animate-stagger-2" style={{backgroundColor: '#fff7ed', border: '1px solid #fed7aa'}}>
                  <Sparkles className="h-5 w-5 text-orange-600 mt-1 flex-shrink-0 animate-pulse-slow" />
                  <div>
                    <h4 className="font-semibold text-orange-900">High Accuracy</h4>
                    <p className="text-orange-700 text-sm mt-1">Advanced matching algorithms ensure the best possible track matches across platforms.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
