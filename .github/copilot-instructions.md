# Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a playlist converter application built with Next.js and TypeScript that allows users to convert playlists between Spotify and YouTube Music.

## Key Technologies
- Next.js 15 with App Router
- TypeScript
- Tailwind CSS
- Spotify Web API
- YouTube Music API (YouTube Data API v3)

## Code Style Guidelines
- Use TypeScript for all components and API routes
- Follow React hooks patterns and modern React best practices
- Use Tailwind CSS for styling with a modern, clean design
- Implement proper error handling and loading states
- Use async/await for API calls
- Follow RESTful API design for backend routes

## API Integration Notes
- Spotify API requires OAuth 2.0 authentication
- YouTube Music API uses YouTube Data API v3 with OAuth for full access
- Implement rate limiting and error handling for API calls
- Store user authentication tokens securely
- Handle playlist metadata and track matching between services

## Component Structure
- Create reusable UI components in src/components
- Use proper TypeScript interfaces for props and data structures
- Implement responsive design patterns
- Add loading spinners and error states for better UX
