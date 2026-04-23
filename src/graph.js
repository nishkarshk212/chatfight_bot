const { createCanvas, registerFont } = require('canvas');

module.exports = {
  generateLeaderboardGraph: async (leaderboard) => {
    const width = 1200;
    const height = 675; // 16:9 aspect ratio
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background - Dark Gradient
    const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2);
    gradient.addColorStop(0, '#2b0508');
    gradient.addColorStop(1, '#1a0305');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Header Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 70px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('LEADERBOARD', width / 2, 100);

    // Inner Container
    const containerX = 80;
    const containerY = 150;
    const containerWidth = width - 160;
    const containerHeight = height - 230;
    
    ctx.strokeStyle = '#4a0a0e';
    ctx.lineWidth = 2;
    ctx.strokeRect(containerX, containerY, containerWidth, containerHeight);

    if (leaderboard.length === 0) return canvas.toBuffer();

    const maxScore = Math.max(...leaderboard.map(u => u.total));
    const containerPadding = 20;
    const nameColumnWidth = 120;
    const scorePadding = 20;
    
    // Calculate bar height to fit all users in container
    const availableHeight = containerHeight - (containerPadding * 2);
    const barSpacing = 12;
    const barHeight = Math.min(50, (availableHeight - (barSpacing * (leaderboard.length - 1))) / leaderboard.length);
    
    leaderboard.forEach((user, index) => {
      const y = containerY + containerPadding + (index * (barHeight + barSpacing));
      const name = (user.first_name || user.username || 'User').substring(0, 12);
      const score = user.total;
      
      // User Name (Left side)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, containerX + containerPadding, y + (barHeight / 2));

      // Bar Background Area
      const barStartX = containerX + nameColumnWidth;
      const maxBarWidth = containerWidth - nameColumnWidth - (containerPadding * 2);
      const barWidth = Math.max(50, (score / maxScore) * maxBarWidth);

      // Draw Bar with Rounded Corners
      ctx.fillStyle = '#b73e4a';
      const radius = Math.min(15, barHeight / 2);
      ctx.beginPath();
      
      // Top-left corner
      ctx.moveTo(barStartX + radius, y);
      // Top-right corner
      ctx.lineTo(barStartX + barWidth - radius, y);
      ctx.quadraticCurveTo(barStartX + barWidth, y, barStartX + barWidth, y + radius);
      // Bottom-right corner
      ctx.lineTo(barStartX + barWidth, y + barHeight - radius);
      ctx.quadraticCurveTo(barStartX + barWidth, y + barHeight, barStartX + barWidth - radius, y + barHeight);
      // Bottom-left corner
      ctx.lineTo(barStartX + radius, y + barHeight);
      ctx.quadraticCurveTo(barStartX, y + barHeight, barStartX, y + barHeight - radius);
      ctx.lineTo(barStartX, y + radius);
      ctx.quadraticCurveTo(barStartX, y, barStartX + radius, y);
      
      ctx.closePath();
      ctx.fill();

      // Score inside bar
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(score.toLocaleString(), barStartX + (barWidth / 2), y + (barHeight / 2));
    });

    // Logo Placeholder (Bottom Right)
    ctx.fillStyle = '#ffffff';
    ctx.font = '30px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('⚔️💬', width - 100, height - 50);

    return canvas.toBuffer();
  }
};
