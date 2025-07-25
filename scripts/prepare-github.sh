#!/bin/bash

echo "🚀 Preparing PlaySync for GitHub..."

# Check if .env.local exists and warn user
if [ -f ".env.local" ]; then
    echo "⚠️  WARNING: .env.local contains your API keys!"
    echo "   Make sure it's in .gitignore (it should be already)"
    echo "   Never commit this file to GitHub!"
    echo ""
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
else
    echo "✅ Git repository already initialized"
fi

# Check if there are uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Adding files to git..."
    git add .
    echo "💾 Committing changes..."
    git commit -m "Initial commit: PlaySync app with Spotify and YouTube Music support"
else
    echo "✅ No uncommitted changes found"
fi

echo ""
echo "🎉 Your app is ready for GitHub!"
echo ""
echo "Next steps:"
echo "1. Create a new repository on GitHub"
echo "2. Run: git remote add origin https://github.com/yourusername/playsync.git"
echo "3. Run: git branch -M main"
echo "4. Run: git push -u origin main"
echo ""
echo "📚 Don't forget to:"
echo "- Update the README with your GitHub username"
echo "- Add a screenshot to public/demo-screenshot.png"
echo "- Set up environment variables in your deployment platform"
echo ""
