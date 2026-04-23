#!/bin/bash

# Server Configuration
SERVER_IP="161.118.250.195"
SERVER_USER="root"
SERVER_PASSWORD="Akshay343402355468"
SERVER_PORT="22"

echo "🚀 Starting deployment to $SERVER_IP..."

# Step 1: Sync files to server (excluding .env for security)
echo "📤 Syncing files to server..."

sshpass -p "$SERVER_PASSWORD" ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP "mkdir -p /root/chat-fight"

rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.env' \
  --exclude '*.db' \
  --exclude '.git' \
  -e "sshpass -p $SERVER_PASSWORD ssh -p $SERVER_PORT" \
  ./ $SERVER_USER@$SERVER_IP:/root/chat-fight/

echo "✅ Files synced successfully"
echo "⚠️  Note: .env file is not synced for security. Update it manually if needed."

# Step 2: Setup server environment
echo "🔧 Setting up server environment..."

sshpass -p "$SERVER_PASSWORD" ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP << 'ENDSSH'
#!/bin/bash

cd /root/chat-fight

# Check Node.js version
NODE_VERSION=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
echo "Current Node.js version: $(node -v 2>/dev/null || echo 'not installed')"

if [ "$NODE_VERSION" -lt 20 ] 2>/dev/null; then
    echo "⬆️  Installing Node.js v20..."
    
    # Download Node.js 20 binary
    echo "📥 Downloading Node.js 20..."
    cd /tmp
    wget -q https://nodejs.org/dist/v20.18.0/node-v20.18.0-linux-x64.tar.xz
    
    # Remove old node if exists
    rm -f /usr/bin/node /usr/bin/npm /usr/local/bin/node /usr/local/bin/npm
    
    # Extract and install
    echo "📦 Installing Node.js 20..."
    tar -xf node-v20.18.0-linux-x64.tar.xz
    cp -r node-v20.18.0-linux-x64/* /usr/local/
    
    # Create symlinks
    ln -sf /usr/local/bin/node /usr/bin/node
    ln -sf /usr/local/bin/npm /usr/bin/npm
    ln -sf /usr/local/bin/npx /usr/bin/npx
    
    # Cleanup
    rm -rf /tmp/node-v20.18.0-linux-x64*
    
    # Verify installation
    echo "✅ Node.js installed: $(node -v)"
    echo "✅ npm installed: $(npm -v)"
else
    echo "✅ Node.js version is OK: $(node -v)"
fi

# Install required build tools for native modules
echo "📦 Installing build dependencies..."
apt-get update -qq
apt-get install -y -qq build-essential libcairo2-dev libjpeg-dev libgif-dev libpango1.0-dev > /dev/null 2>&1
echo "✅ Build dependencies installed"

# Install npm dependencies
echo "📦 Installing Node.js dependencies..."
cd /root/chat-fight
npm install --production

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Setup .env file if not exists
if [ ! -f ".env" ]; then
    echo "⚠️  Creating .env file..."
    cp .env.example .env
    echo "⚠️  IMPORTANT: Update /root/chat-fight/.env with your BOT_TOKEN"
fi

# Stop existing bot
echo "🛑 Stopping existing bot..."
pkill -f "node src/bot.js" 2>/dev/null || echo "No running bot found"
sleep 2

# Start the bot
echo "🚀 Starting bot..."
nohup npm start > bot.log 2>&1 &
BOT_PID=$!

sleep 3

# Check if bot is running
if ps -p $BOT_PID > /dev/null; then
    echo "✅ Bot started successfully! (PID: $BOT_PID)"
    echo "📝 Log file: /root/chat-fight/bot.log"
    echo "🔍 View logs: tail -f /root/chat-fight/bot.log"
    echo "🛑 Stop bot: pkill -f 'node src/bot.js'"
else
    echo "❌ Bot failed to start. Check logs:"
    tail -20 bot.log
fi

ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment completed!"
else
    echo ""
    echo "❌ Deployment failed!"
    exit 1
fi
