'use client';

import { useState } from 'react';
import { Playlist, ConversionResult } from '@/types';
import { SpotifyAPI } from '@/lib/spotify';
import { SimpleYouTubeAPI } from '@/lib/simple-youtube';
import { YouTubeMusicAPI } from '@/lib/youtube-music-full';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PlaySyncLogo } from '@/components/ui/logo';
import { Music, ArrowRight, CheckCircle, XCircle, Download, Sparkles, ExternalLink } from 'lucide-react';

interface PlaylistConverterProps {
  spotifyAccessToken?: string;
  youtubeApiKey?: string;
  youtubeAccessToken?: string;
}

export function PlaylistConverter({ spotifyAccessToken, youtubeApiKey, youtubeAccessToken }: PlaylistConverterProps) {
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [conversionProgress, setConversionProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  const extractPlaylistId = (url: string): { id: string; platform: 'spotify' | 'youtube' } | null => {
    // Spotify playlist URL patterns
    const spotifyMatch = url.match(/spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
    if (spotifyMatch) {
      return { id: spotifyMatch[1], platform: 'spotify' };
    }

    // YouTube playlist URL patterns
    const youtubeMatch = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    if (youtubeMatch) {
      return { id: youtubeMatch[1], platform: 'youtube' };
    }

    return null;
  };

  const loadPlaylist = async () => {
    if (!playlistUrl.trim()) return;

    setIsLoading(true);
    setConversionResult(null);
    setCurrentStep('Loading playlist...');
    setConversionProgress(20);

    try {
      const extracted = extractPlaylistId(playlistUrl);
      if (!extracted) {
        throw new Error('Invalid playlist URL. Please provide a valid Spotify or YouTube Music playlist URL.');
      }

      let loadedPlaylist: Playlist;

      if (extracted.platform === 'spotify') {
        if (!spotifyAccessToken) {
          throw new Error('Spotify access token is required');
        }
        const spotifyAPI = new SpotifyAPI(spotifyAccessToken);
        loadedPlaylist = await spotifyAPI.getPlaylist(extracted.id);
      } else {
        // Use full YouTube Music API if access token is available, otherwise use simple API
        if (youtubeAccessToken && youtubeApiKey) {
          try {
            const youtubeAPI = new YouTubeMusicAPI(youtubeAccessToken, youtubeApiKey);
            loadedPlaylist = await youtubeAPI.getPlaylist(extracted.id);
          } catch (error) {
            console.log('Full YouTube API failed, falling back to simple API:', error);
            // Fall back to simple API if quota exceeded or other error
            if (youtubeApiKey) {
              const youtubeAPI = new SimpleYouTubeAPI(youtubeApiKey);
              loadedPlaylist = await youtubeAPI.getPlaylist(extracted.id);
            } else {
              throw error;
            }
          }
        } else if (youtubeApiKey) {
          const youtubeAPI = new SimpleYouTubeAPI(youtubeApiKey);
          loadedPlaylist = await youtubeAPI.getPlaylist(extracted.id);
        } else {
          throw new Error('YouTube API key is required');
        }
      }

      setPlaylist(loadedPlaylist);
      setConversionProgress(100);
      setCurrentStep('Playlist loaded successfully!');
    } catch (error) {
      console.error('Error loading playlist:', error);
      
      // Special handling for quota exceeded during playlist loading
      if (error instanceof Error && error.message === 'QUOTA_EXCEEDED') {
        setCurrentStep('YouTube API quota exceeded. The quota resets at midnight Pacific Time. Please try again later, or request a quota increase in Google Cloud Console.');
      } else {
        setCurrentStep(`Error: ${error instanceof Error ? error.message : 'Failed to load playlist'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const convertPlaylist = async (targetPlatform: 'spotify' | 'youtube') => {
    if (!playlist) return;

    setIsLoading(true);
    setConversionResult(null);
    setConversionProgress(0);
    setCurrentStep(`Converting to ${targetPlatform === 'spotify' ? 'Spotify' : 'YouTube Music'}...`);

    try {
      let result: ConversionResult;

      if (targetPlatform === 'spotify') {
        if (!spotifyAccessToken) {
          throw new Error('Spotify access token is required');
        }
        setConversionProgress(25);
        const spotifyAPI = new SpotifyAPI(spotifyAccessToken);
        setCurrentStep('Creating Spotify playlist...');
        
        const conversion = await spotifyAPI.convertFromTracks(
          playlist.tracks,
          `${playlist.name} (from YouTube Music)`,
          playlist.description || `Converted from YouTube Music playlist`
        );
        
        setConversionProgress(75);
        setCurrentStep('Finalizing conversion...');
        
        result = {
          success: true,
          matched_tracks: conversion.matchedTracks,
          total_tracks: playlist.tracks.length,
          failed_tracks: conversion.failedTracks,
          playlist_url: `https://open.spotify.com/playlist/${conversion.playlistId}`,
          message: `Successfully converted ${conversion.matchedTracks} out of ${playlist.tracks.length} tracks`
        };
      } else {
        // Convert to YouTube Music
        if (youtubeAccessToken && youtubeApiKey) {
          // Use full YouTube Music API for automatic playlist creation
          const youtubeAPI = new YouTubeMusicAPI(youtubeAccessToken, youtubeApiKey);
          setCurrentStep('Creating YouTube Music playlist...');
          
          const playlistId = await youtubeAPI.createPlaylist(
            `${playlist.name} (from Spotify)`,
            playlist.description || `Converted from Spotify playlist`
          );
          
          setConversionProgress(50);
          setCurrentStep('Searching for matching tracks...');
          
          const matchedTrackIds: string[] = [];
          const failedTracks: any[] = [];
          
          for (let i = 0; i < playlist.tracks.length; i++) {
            const track = playlist.tracks[i];
            const searchQuery = `${track.name} ${track.artists.join(' ')}`;
            
            try {
              const searchResults = await youtubeAPI.searchTrack(searchQuery);
              if (searchResults.length > 0) {
                matchedTrackIds.push(searchResults[0].id);
              } else {
                console.log(`No results found for: ${searchQuery}`);
                failedTracks.push(track);
              }
            } catch (error) {
              console.error(`Failed to search for track: ${searchQuery}`, error);
              
              // If quota exceeded, throw error to trigger fallback
              if (error instanceof Error && error.message === 'QUOTA_EXCEEDED') {
                throw error;
              }
              
              failedTracks.push(track);
            }
            
            // Add small delay to avoid rate limiting and reduce quota usage
            if (i < playlist.tracks.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            setConversionProgress(50 + (i / playlist.tracks.length) * 25);
          }
          
          setCurrentStep('Adding tracks to playlist...');
          const addResult = await youtubeAPI.addTracksToPlaylist(playlistId, matchedTrackIds);
          
          result = {
            success: true,
            matched_tracks: addResult.success,
            total_tracks: playlist.tracks.length,
            failed_tracks: failedTracks,
            playlist_url: `https://music.youtube.com/playlist?list=${playlistId}`,
            message: `Successfully converted ${addResult.success} out of ${playlist.tracks.length} tracks`
          };
        } else if (youtubeApiKey) {
          // Fall back to manual instructions
          const youtubeAPI = new SimpleYouTubeAPI(youtubeApiKey);
          
          setCurrentStep('Generating YouTube Music instructions...');
          
          const instructions = await youtubeAPI.getConversionInstructions(
            playlist.tracks,
            `${playlist.name} (from Spotify)`
          );
          
          result = {
            success: true,
            matched_tracks: playlist.tracks.length,
            total_tracks: playlist.tracks.length,
            failed_tracks: [],
            message: `Instructions generated for ${playlist.tracks.length} tracks. Manual creation required due to YouTube OAuth restrictions.`,
            instructions: instructions.instructions
          };
        } else {
          throw new Error('YouTube API key is required');
        }
      }

      setConversionProgress(100);
      setCurrentStep('Conversion completed!');
      setConversionResult(result);
    } catch (error) {
      console.error('Error converting playlist:', error);
      
      // Special handling for quota exceeded errors
      if (error instanceof Error && error.message === 'QUOTA_EXCEEDED') {
        console.log('YouTube quota exceeded, falling back to manual instructions...');
        
        try {
          // Fall back to manual instructions when quota is exceeded
          const youtubeAPI = new SimpleYouTubeAPI(youtubeApiKey!);
          
          setCurrentStep('Quota exceeded, generating manual instructions...');
          
          const instructions = await youtubeAPI.getConversionInstructions(
            playlist.tracks,
            `${playlist.name} (from Spotify)`
          );
          
          setConversionResult({
            success: true,
            matched_tracks: playlist.tracks.length,
            total_tracks: playlist.tracks.length,
            failed_tracks: [],
            message: `YouTube API quota exceeded. Manual instructions provided for ${playlist.tracks.length} tracks.`,
            instructions: instructions.instructions
          });
          
          setCurrentStep('Manual instructions ready!');
          return;
        } catch (fallbackError) {
          console.error('Fallback to manual instructions failed:', fallbackError);
        }
      }
      
      setCurrentStep(`Error: ${error instanceof Error ? error.message : 'Conversion failed'}`);
      setConversionResult({
        success: false,
        matched_tracks: 0,
        total_tracks: playlist.tracks.length,
        failed_tracks: playlist.tracks,
        message: error instanceof Error ? error.message : 'Conversion failed'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card className="border-0 animate-bounce-in" style={{backgroundColor: '#faf8f5', boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04), 0 1px 4px rgba(0, 0, 0, 0.02)'}}>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl gradient-text flex items-center justify-center space-x-3 animate-fade-in">
            <PlaySyncLogo size="md" className="animate-float" />
            <span>Convert Your Playlist</span>
          </CardTitle>
          <CardDescription className="text-base max-w-2xl mx-auto animate-fade-in animate-stagger-1">
            Paste any Spotify or YouTube Music playlist URL below to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex space-x-3 animate-slide-up animate-stagger-2">
            <input
              type="url"
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              placeholder="https://open.spotify.com/playlist/... or https://www.youtube.com/playlist?list=..."
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 focus:scale-105"
              style={{backgroundColor: '#ffffff', boxShadow: '0 1px 4px rgba(0,0,0,0.03)'}}
            />
            <Button 
              onClick={loadPlaylist} 
              disabled={isLoading || !playlistUrl.trim()}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 transition-all duration-200 font-medium transform hover:scale-105 active:scale-95"
              style={{boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'}}
            >
              {isLoading ? <LoadingSpinner size="sm" /> : 'Load Playlist'}
            </Button>
          </div>
          
          {isLoading && (
            <div className="space-y-3 p-4 rounded-xl animate-bounce-in" style={{background: 'linear-gradient(135deg, #f3e8ff 0%, #fce7f3 100%)', border: '1px solid #d8b4fe'}}>
              <Progress value={conversionProgress} className="w-full h-2 animate-pulse-slow" />
              <div className="flex items-center space-x-2 text-purple-700">
                <Sparkles className="h-4 w-4 animate-spin" />
                <p className="text-sm font-medium animate-pulse-slow">{currentStep}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {playlist && (
        <Card className="border-0" style={{backgroundColor: '#faf8f5', boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04), 0 1px 4px rgba(0, 0, 0, 0.02)'}}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-4">
              <div className="relative">
                <img 
                  src={playlist.cover_image || '/placeholder-playlist.svg'} 
                  alt={playlist.name}
                  className="w-16 h-16 rounded-xl object-cover"
                  style={{boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'}}
                />
                <div className="absolute -bottom-2 -right-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    playlist.platform === 'spotify' 
                      ? 'bg-gradient-to-r from-green-500 to-green-600' 
                      : 'bg-gradient-to-r from-red-500 to-red-600'
                  }`} style={{boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'}}>
                    <Music className="h-3 w-3 text-white" />
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold gradient-text">{playlist.name}</h3>
                <div className="flex items-center space-x-2 text-gray-600 mt-1">
                  <span>{playlist.total_tracks} tracks</span>
                  <span>•</span>
                  <span className="capitalize font-medium">
                    {playlist.platform === 'spotify' ? 'Spotify' : 'YouTube Music'}
                  </span>
                </div>
              </div>
            </CardTitle>
            {playlist.description && (
              <CardDescription className="text-base mt-4 p-4 bg-gray-50 rounded-xl">
                {playlist.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
              <p className="font-semibold text-purple-900 mb-3 flex items-center space-x-2">
                <Sparkles className="h-4 w-4" />
                <span>Sample tracks from your playlist:</span>
              </p>
              <ul className="space-y-2">
                {playlist.tracks.slice(0, 3).map((track, index) => (
                  <li key={index} className="flex items-center space-x-3 text-sm bg-white/60 p-3 rounded-lg">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">{track.name}</span>
                      <div className="text-gray-600">by {track.artists.join(', ')}</div>
                    </div>
                  </li>
                ))}
                {playlist.tracks.length > 3 && (
                  <li className="text-center text-gray-500 text-sm py-2 font-medium">
                    ... and {playlist.tracks.length - 3} more tracks
                  </li>
                )}
              </ul>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              {playlist.platform !== 'spotify' && (
                <Button 
                  onClick={() => convertPlaylist('spotify')}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 transition-all duration-200 font-medium"
                  style={{boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'}}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span>Convert to Spotify</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Button>
              )}
              {playlist.platform !== 'youtube' && (
                <Button 
                  onClick={() => convertPlaylist('youtube')}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 transition-all duration-200 font-medium"
                  style={{boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'}}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span>Convert to YouTube Music</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Button>
              )}
            </div>

            {isLoading && (
              <div className="space-y-3 p-4 rounded-xl bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-100">
                <Progress value={conversionProgress} className="w-full h-2" />
                <div className="flex items-center space-x-2 text-orange-700">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  <p className="text-sm font-medium">{currentStep}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {conversionResult && (
        <Card className="border-0" style={{backgroundColor: '#faf8f5', boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04), 0 1px 4px rgba(0, 0, 0, 0.02)'}}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                conversionResult.success 
                  ? 'bg-gradient-to-r from-green-500 to-green-600' 
                  : 'bg-gradient-to-r from-red-500 to-red-600'
              }`} style={{boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'}}>
                {conversionResult.success ? (
                  <CheckCircle className="h-6 w-6 text-white" />
                ) : (
                  <XCircle className="h-6 w-6 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-2xl font-bold gradient-text">
                  Conversion {conversionResult.success ? 'Completed!' : 'Failed'}
                </h3>
                <p className="text-gray-600 mt-1">
                  {conversionResult.success ? '🎉 Your playlist is ready!' : '⚠️ Something went wrong'}
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-semibold text-green-900">Matched Tracks</span>
                </div>
                <span className="text-2xl font-bold text-green-600">{conversionResult.matched_tracks}</span>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <div className="flex items-center space-x-2 mb-2">
                  <Music className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-blue-900">Total Tracks</span>
                </div>
                <span className="text-2xl font-bold text-blue-600">{conversionResult.total_tracks}</span>
              </div>
            </div>
            
            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
              <p className="text-purple-800 font-medium">{conversionResult.message}</p>
            </div>
            
            {conversionResult.instructions && (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <div className="flex items-start space-x-2 mb-3">
                  <Sparkles className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <h4 className="font-semibold text-blue-900">Manual Setup Instructions</h4>
                </div>
                <div className="bg-white p-4 rounded-lg border border-blue-200 max-h-64 overflow-y-auto">
                  <pre className="text-sm text-blue-800 whitespace-pre-wrap font-mono">{conversionResult.instructions}</pre>
                </div>
              </div>
            )}
            
            {conversionResult.playlist_url && (
              <div className="flex justify-center">
                <Button 
                  onClick={() => window.open(conversionResult.playlist_url, '_blank')}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 transition-all duration-200 font-medium px-8 py-3"
                  style={{boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'}}
                >
                  <div className="flex items-center space-x-2">
                    <ExternalLink className="h-4 w-4" />
                    <span>Open Converted Playlist</span>
                  </div>
                </Button>
              </div>
            )}
            
            {conversionResult.failed_tracks.length > 0 && (
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                <div className="flex items-start space-x-2 mb-3">
                  <XCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <h4 className="font-semibold text-orange-900">Tracks That Couldn't Be Converted</h4>
                </div>
                <div className="bg-white p-4 rounded-lg border border-orange-200 max-h-40 overflow-y-auto">
                  <ul className="text-sm text-orange-800 space-y-2">
                    {conversionResult.failed_tracks.map((track, index) => (
                      <li key={index} className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-orange-400 rounded-full flex-shrink-0"></span>
                        <span><strong>{track.name}</strong> by {track.artists.join(', ')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
