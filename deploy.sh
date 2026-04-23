#!/bin/bash

# Deployment Script for Chat Fight Bot
# Server: 161.118.250.195

SERVER_IP="161.118.250.195"
SERVER_USER="root"
SERVER_PASSWORD="Akshay343402355468"
SERVER_PORT="22"
REMOTE_DIR="/root/chat-fight"

echo "🚀 Starting deployment to $SERVER_IP..."

# Step 1: Check if git repo is initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit - Chat Fight Bot"
fi

# Step 2: Push to remote git repository (if configured)
echo "📤 Pushing latest changes to git..."
git add .
git commit -m "Deploy update - $(date '+%Y-%m-%d %H:%M:%S')" || echo "No changes to commit"

# Step 3: Sync files to server via rsync over SSH
echo "📤 Syncing files to server..."

# Create remote directory
sshpass -p "$SERVER_PASSWORD" ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP "mkdir -p /root/chat-fight"

# Sync files (exclude node_modules, .env, db files, images)
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.env' \
  --exclude '*.db' \
  --exclude '*.png' \
  --exclude '*.jpg' \
  --exclude '.git' \
  -e "sshpass -p $SERVER_PASSWORD ssh -p $SERVER_PORT" \
  ./ $SERVER_USER@$SERVER_IP:/root/chat-fight/

echo "🔗 Connected to server. Starting deployment..."

sshpass -p "$SERVER_PASSWORD" ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP << 'ENDSSH'
#!/bin/bash

echo "📥 Connected to server. Starting deployment..."

cd /root/chat-fight

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install --production

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  Creating .env file from example..."
    cp .env.example .env
    echo "⚠️  Please update /root/chat-fight/.env with your BOT_TOKEN"
fi

# Stop existing bot if running
echo "🛑 Stopping existing bot..."
pkill -f "node src/bot.js" 2>/dev/null || echo "No running bot found"

# Start the bot
echo "🚀 Starting bot..."
cd /root/chat-fight
nohup npm start > bot.log 2>&1 &

echo "✅ Bot started successfully!"
echo "📝 Log file: /root/chat-fight/bot.log"
echo "🔍 Check logs with: tail -f /root/chat-fight/bot.log"

ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment completed successfully!"
else
    echo ""
    echo "❌ Deployment failed!"
    exit 1
fi
