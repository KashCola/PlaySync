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
import { Music, ArrowRight, CheckCircle, XCircle, Download } from 'lucide-react';

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
        throw new Error('Invalid playlist URL. Please provide a valid Spotify or Apple Music playlist URL.');
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
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2 text-3xl font-bold text-gray-900">
          <Music className="h-8 w-8 text-blue-600" />
          <span>PlaySync</span>
        </div>
        <p className="text-gray-600">Convert your playlists between Spotify and Apple Music</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Step 1: Load Your Playlist</CardTitle>
          <CardDescription>
            Paste a Spotify or YouTube Music playlist URL to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="url"
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              placeholder="https://open.spotify.com/playlist/... or https://www.youtube.com/playlist?list=..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            />
            <Button 
              onClick={loadPlaylist} 
              disabled={isLoading || !playlistUrl.trim()}
            >
              {isLoading ? <LoadingSpinner size="sm" /> : 'Load Playlist'}
            </Button>
          </div>
          
          {isLoading && (
            <div className="space-y-2">
              <Progress value={conversionProgress} className="w-full" />
              <p className="text-sm text-gray-600">{currentStep}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {playlist && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <img 
                src={playlist.cover_image || '/placeholder-playlist.svg'} 
                alt={playlist.name}
                className="w-12 h-12 rounded object-cover"
              />
              <div>
                <h3 className="text-xl font-semibold">{playlist.name}</h3>
                <p className="text-sm text-gray-600">
                  {playlist.total_tracks} tracks • {playlist.platform === 'spotify' ? 'Spotify' : 'YouTube Music'}
                </p>
              </div>
            </CardTitle>
            {playlist.description && (
              <CardDescription>{playlist.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-2">Sample tracks:</p>
              <ul className="space-y-1">
                {playlist.tracks.slice(0, 3).map((track, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <span>{track.name}</span>
                    <span className="text-gray-400">•</span>
                    <span>{track.artists.join(', ')}</span>
                  </li>
                ))}
                {playlist.tracks.length > 3 && (
                  <li className="text-gray-400">... and {playlist.tracks.length - 3} more tracks</li>
                )}
              </ul>
            </div>
            
            <div className="flex space-x-4">
              {playlist.platform !== 'spotify' && (
                <Button 
                  onClick={() => convertPlaylist('spotify')}
                  disabled={isLoading}
                  className="flex items-center space-x-2"
                >
                  <span>Convert to Spotify</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
              {playlist.platform !== 'youtube' && (
                <Button 
                  onClick={() => convertPlaylist('youtube')}
                  disabled={isLoading}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <span>Convert to YouTube Music</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>

            {isLoading && (
              <div className="space-y-2">
                <Progress value={conversionProgress} className="w-full" />
                <p className="text-sm text-gray-600">{currentStep}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {conversionResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {conversionResult.success ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600" />
              )}
              <span>Conversion {conversionResult.success ? 'Completed' : 'Failed'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Matched tracks:</span>
                <span className="ml-2 text-green-600">{conversionResult.matched_tracks}</span>
              </div>
              <div>
                <span className="font-medium">Total tracks:</span>
                <span className="ml-2">{conversionResult.total_tracks}</span>
              </div>
            </div>
            
            <p className="text-gray-600">{conversionResult.message}</p>
            
            {conversionResult.instructions && (
              <div className="bg-blue-50 p-4 rounded-md">
                <h4 className="font-medium text-blue-800 mb-2">Manual Setup Instructions:</h4>
                <pre className="text-sm text-blue-700 whitespace-pre-wrap">{conversionResult.instructions}</pre>
              </div>
            )}
            
            {conversionResult.playlist_url && (
              <div className="flex items-center space-x-2">
                <Button 
                  onClick={() => window.open(conversionResult.playlist_url, '_blank')}
                  className="flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Open Converted Playlist</span>
                </Button>
              </div>
            )}
            
            {conversionResult.failed_tracks.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium text-gray-700">Failed to convert:</p>
                <ul className="text-sm text-gray-600 space-y-1 max-h-32 overflow-y-auto">
                  {conversionResult.failed_tracks.map((track, index) => (
                    <li key={index}>
                      {track.name} - {track.artists.join(', ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
