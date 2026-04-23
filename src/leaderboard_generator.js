const { createCanvas, loadImage } = require('canvas');
const path = require('path');
const { normalizeText } = require('./utils');

module.exports = {
  generateLeaderboardGraph: async (leaderboard) => {
    const width = 1200;
    const height = 675; // 16:9 aspect ratio
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Load background image
    let bgImage;
    try {
      // Use the new background image
      const bgImagePath = path.join(__dirname, '..', '2026-04-23 19.57.26.jpg');
      bgImage = await loadImage(bgImagePath);
    } catch (error) {
      try {
        // Fallback to previous image
        const fallbackPath = path.join(__dirname, '..', '2026-04-22 21.31.04.jpg');
        bgImage = await loadImage(fallbackPath);
      } catch (e) {
        console.error('Failed to load background image:', e);
        // Fallback: create dark gradient
        const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2);
        gradient.addColorStop(0, '#2b0508');
        gradient.addColorStop(1, '#1a0305');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }
    }

    // Draw background image stretched to fill canvas
    if (bgImage) {
      ctx.drawImage(bgImage, 0, 0, width, height);
    }

    // Dark overlay for better text readability
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, width, height);

    // Header Text - LEADERBOARD
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 100px sans-serif'; // Bigger font
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    // Shadow for more impact
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;
    ctx.fillText('LEADERBOARD', width / 2, 45);
    ctx.shadowColor = 'transparent';

    // Decorative pink swirls (pattern like the screenshot)
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = '#b34757';
    ctx.lineWidth = 35;
    
    // Top-left swirl
    ctx.beginPath();
    ctx.arc(-50, 50, 220, 0, Math.PI * 2);
    ctx.stroke();
    
    // Middle-left swirl
    ctx.beginPath();
    ctx.arc(-80, 250, 180, 0, Math.PI * 2);
    ctx.stroke();
    
    // Bottom-right swirl
    ctx.beginPath();
    ctx.arc(width + 80, height - 100, 300, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.globalAlpha = 1.0;

    // Inner Container - Dark, semi-transparent rounded box
    const containerX = 50;
    const containerY = 175;
    const containerWidth = width - 100;
    const containerHeight = height - 225;
    const containerRadius = 45;
    
    ctx.fillStyle = 'rgba(15, 5, 8, 0.78)';
    ctx.strokeStyle = 'rgba(179, 71, 87, 0.45)';
    ctx.lineWidth = 4;
    
    ctx.beginPath();
    ctx.roundRect(containerX, containerY, containerWidth, containerHeight, containerRadius);
    ctx.fill();
    ctx.stroke();

    if (leaderboard.length === 0) return canvas.toBuffer();

    const maxScore = Math.max(...leaderboard.map(u => u.total));
    const containerPadding = 45;
    const nameColumnWidth = 180;
    const availableHeight = containerHeight - (containerPadding * 2);
    const barSpacing = 12;
    const displayCount = Math.min(10, leaderboard.length);
    
    const barHeight = Math.min(48, (availableHeight - (barSpacing * (displayCount - 1))) / displayCount);
    const maxBarWidth = containerWidth - nameColumnWidth - (containerPadding * 2) - 80;

    leaderboard.slice(0, displayCount).forEach((user, index) => {
      const y = containerY + containerPadding + (index * (barHeight + barSpacing));
      
      let rawName = user.first_name || user.username || 'User';
      let name = normalizeText(rawName);
      if (name.length > 15) {
        name = name.substring(0, 12) + '...';
      }
      
      const score = user.total;
      const barWidth = Math.max(50, (score / maxScore) * maxBarWidth);
      
      // User Name (Left)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, containerX + containerPadding, y + (barHeight / 2));

      // Bar (Right)
      const barStartX = containerX + nameColumnWidth + containerPadding;
      const barRadius = barHeight / 2;
      ctx.fillStyle = '#b34757'; // Vibrat red from screenshot
      
      ctx.beginPath();
      ctx.roundRect(barStartX, y, barWidth, barHeight, barRadius);
      ctx.fill();

      // Score (Centered in Bar)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      
      if (barWidth > 120) {
        ctx.fillText(score.toLocaleString(), barStartX + (barWidth / 2), y + (barHeight / 2));
      } else {
        ctx.textAlign = 'left';
        ctx.fillText(score.toLocaleString(), barStartX + barWidth + 20, y + (barHeight / 2));
      }
    });

    // Chat bubble icon with crossed swords in bottom-right
    const iconX = width - 110;
    const iconY = height - 90;
    const iconSize = 75;
    
    // Main bubble
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(iconX, iconY, iconSize / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Swords
    ctx.strokeStyle = '#2b0508';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(iconX - 16, iconY - 16);
    ctx.lineTo(iconX + 16, iconY + 16);
    ctx.moveTo(iconX + 16, iconY - 16);
    ctx.lineTo(iconX - 16, iconY + 16);
    ctx.stroke();
    
    // Little hilt/dots for swords
    ctx.fillStyle = '#2b0508';
    ctx.beginPath();
    ctx.arc(iconX - 16, iconY - 16, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(iconX + 16, iconY - 16, 4, 0, Math.PI * 2);
    ctx.fill();

    return canvas.toBuffer();
  }
};

