# PlaySync

A modern web application that allows users to convert playlists between Spotify and YouTube Music seamlessly.

## Features

- **Cross-Platform Conversion**: Convert playlists from Spotify to YouTube Music and vice versa
- **Smart Track Matching**: Advanced algorithm to find matching tracks across platforms
- **Modern UI**: Clean, responsive design built with React and Tailwind CSS
- **Real-time Progress**: Live updates during the conversion process
- **Detailed Results**: Shows conversion success rate and failed tracks
- **OAuth Authentication**: Secure authentication with both Spotify and YouTube Music
- **Automatic Playlist Creation**: Creates playlists automatically when possible
- **Smart Fallback**: Provides manual instructions when API limits are reached

## Technologies

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **APIs**: Spotify Web API, YouTube Data API v3
- **UI Components**: Custom components with Radix UI primitives
- **Authentication**: OAuth 2.0 for both Spotify and YouTube Music

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Spotify Developer Account
- Apple Developer Account (for Apple Music API)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd playlistconverter
   npm install
   ```

2. **Set up Spotify API**
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Create a new app
   - Add `http://localhost:3000/api/auth/spotify/callback` to redirect URIs
   - Copy your Client ID and Client Secret

3. **Set up Apple Music API**
   - Go to [Apple Developer Portal](https://developer.apple.com/)
   - Create a MusicKit identifier and private key
   - Generate a developer token

4. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your API credentials:
   ```
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/spotify/callback
   NEXT_PUBLIC_APPLE_MUSIC_DEVELOPER_TOKEN=your_apple_music_developer_token
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_random_secret_string
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000)** in your browser

## How It Works

1. **Authentication**: Users connect their Spotify and/or Apple Music accounts
2. **Playlist Input**: Paste a playlist URL from either platform
3. **Track Matching**: The app searches for matching tracks on the target platform
4. **Playlist Creation**: Creates a new playlist with matched tracks
5. **Results**: Shows conversion success rate and any failed matches

## API Endpoints

- `/api/auth/spotify` - Initiates Spotify OAuth flow
- `/api/auth/spotify/callback` - Handles Spotify OAuth callback
- `/api/auth/spotify/token` - Returns current Spotify access token

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── playlist-converter.tsx # Main converter component
├── lib/                   # Utility functions and API clients
│   ├── spotify.ts        # Spotify API client
│   ├── apple-music.ts    # Apple Music API client
│   └── utils.ts          # Helper functions
└── types/                # TypeScript type definitions
    └── index.ts          # Shared types
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This application is for educational and personal use. Make sure to comply with Spotify and Apple Music's terms of service when using their APIs.
