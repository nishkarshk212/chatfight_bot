const { createCanvas, registerFont, loadImage } = require('canvas');
const path = require('path');
const { normalizeText } = require('./utils');

module.exports = {
  generateLeaderboardGraph: async (leaderboard) => {
    const width = 1200;
    const height = 675; // 16:9 aspect ratio
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Load and draw background image
    let bgImage;
    try {
      // Use the provided background image
      const bgImagePath = path.join(__dirname, '..', '2026-04-22 21.31.04.jpg');
      bgImage = await loadImage(bgImagePath);
      // Draw background image stretched to fill canvas
      ctx.drawImage(bgImage, 0, 0, width, height);
    } catch (error) {
      console.log('Background image not found, using fallback');
      const fallbackPath = path.join(__dirname, '..', '2026-04-22 21.30.02.jpg');
      try {
        bgImage = await loadImage(fallbackPath);
        ctx.drawImage(bgImage, 0, 0, width, height);
      } catch (e) {
        const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2);
        gradient.addColorStop(0, '#2b0508');
        gradient.addColorStop(1, '#1a0305');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }
    }

    // Add dark overlay for better readability
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, width, height);

    // Decorative pink circles (overlay pattern)
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = '#ff6b7a';
    ctx.lineWidth = 40;
    
    // Top left circle
    ctx.beginPath();
    ctx.arc(-50, 50, 200, 0, Math.PI * 2);
    ctx.stroke();
    
    // Bottom right circle
    ctx.beginPath();
    ctx.arc(width + 50, height - 50, 250, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.globalAlpha = 1.0;

    // Header Text - LEADERBOARD
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 90px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    // Add shadow for better readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
    ctx.fillText('LEADERBOARD', width / 2, 40);
    ctx.shadowColor = 'transparent';

    // Inner Container - Semi-transparent with rounded corners
    const containerX = 60;
    const containerY = 160;
    const containerWidth = width - 120;
    const containerHeight = height - 220;
    const containerRadius = 40;
    
    // Draw rounded rectangle container
    ctx.fillStyle = 'rgba(25, 10, 15, 0.75)';
    ctx.strokeStyle = 'rgba(255, 107, 122, 0.4)';
    ctx.lineWidth = 3;
    
    ctx.beginPath();
    ctx.roundRect(containerX, containerY, containerWidth, containerHeight, containerRadius);
    ctx.fill();
    ctx.stroke();

    if (leaderboard.length === 0) return canvas.toBuffer();

    const maxScore = Math.max(...leaderboard.map(u => u.total));
    const containerPadding = 40;
    const nameColumnWidth = 160;
    const availableHeight = containerHeight - (containerPadding * 2);
    const barSpacing = 10;
    const displayCount = Math.min(10, leaderboard.length);
    
    // Calculate bar height dynamically
    const barHeight = Math.min(45, (availableHeight - (barSpacing * (displayCount - 1))) / displayCount);
    const maxBarWidth = containerWidth - nameColumnWidth - (containerPadding * 2) - 100;
    
    leaderboard.slice(0, displayCount).forEach((user, index) => {
      const y = containerY + containerPadding + (index * (barHeight + barSpacing));
      
      // Normalize and truncate username
      let rawName = user.first_name || user.username || 'User';
      let name = normalizeText(rawName);
      if (name.length > 15) {
        name = name.substring(0, 12) + '...';
      }
      
      const score = user.total;
      const barWidth = Math.max(40, (score / maxScore) * maxBarWidth);
      
      // User Name (Left side)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, containerX + containerPadding, y + (barHeight / 2));

      // Bar Start Position
      const barStartX = containerX + nameColumnWidth + containerPadding;

      // Draw Bar with solid color
      const barRadius = barHeight / 2;
      ctx.fillStyle = '#b34757'; // Solid color similar to reference
      
      ctx.beginPath();
      ctx.roundRect(barStartX, y, barWidth, barHeight, barRadius);
      ctx.fill();

      // Score - Always inside bar if large enough, otherwise to the right
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      if (barWidth > 100) {
        ctx.fillText(score.toLocaleString(), barStartX + (barWidth / 2), y + (barHeight / 2));
      } else {
        ctx.textAlign = 'left';
        ctx.fillText(score.toLocaleString(), barStartX + barWidth + 15, y + (barHeight / 2));
      }
    });

    // Chat Icon (Bottom Right)
    const iconX = width - 100;
    const iconY = height - 80;
    const iconSize = 60;
    
    // Bubble
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(iconX, iconY, iconSize / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // X symbol inside
    ctx.strokeStyle = '#2b0508';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(iconX - 12, iconY - 12);
    ctx.lineTo(iconX + 12, iconY + 12);
    ctx.moveTo(iconX + 12, iconY - 12);
    ctx.lineTo(iconX - 12, iconY + 12);
    ctx.stroke();

    return canvas.toBuffer();
  }
};

