const { createCanvas, registerFont, loadImage } = require('canvas');
const path = require('path');

module.exports = {
  generateLeaderboardGraph: async (leaderboard) => {
    const width = 1200;
    const height = 675; // 16:9 aspect ratio
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Try to load background image
    let bgImageLoaded = false;
    try {
      const bgImagePath = path.join(__dirname, '..', '2026-04-23 18.44.50.jpg');
      const bgImage = await loadImage(bgImagePath);
      ctx.drawImage(bgImage, 0, 0, width, height);
      bgImageLoaded = true;
    } catch (error) {
      // Fallback to gradient background if image not found
      console.log('Background image not found, using gradient fallback');
      const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2);
      gradient.addColorStop(0, '#2b0508');
      gradient.addColorStop(1, '#1a0305');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    // Decorative pink circles (overlay pattern)
    if (!bgImageLoaded) {
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#ff6b7a';
      ctx.beginPath();
      ctx.arc(-100, 100, 200, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(width + 100, height - 100, 250, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(width / 2, -150, 300, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    } else {
      // Add overlay for better text readability when using photo background
      ctx.fillStyle = 'rgba(43, 5, 8, 0.3)';
      ctx.fillRect(0, 0, width, height);
    }

    // Header Text - Large and Bold with better styling
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    // Add subtle shadow for better readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText('LEADERBOARD', width / 2, 30);
    ctx.shadowColor = 'transparent';

    // Inner Container - Semi-transparent with rounded corners
    const containerX = 80;
    const containerY = 130;
    const containerWidth = width - 160;
    const containerHeight = height - 200;
    const containerRadius = 30;
    
    // Draw rounded rectangle container with better transparency
    ctx.fillStyle = 'rgba(20, 5, 8, 0.75)';
    ctx.strokeStyle = 'rgba(183, 62, 74, 0.6)';
    ctx.lineWidth = 4;
    
    ctx.beginPath();
    ctx.moveTo(containerX + containerRadius, containerY);
    ctx.lineTo(containerX + containerWidth - containerRadius, containerY);
    ctx.quadraticCurveTo(containerX + containerWidth, containerY, containerX + containerWidth, containerY + containerRadius);
    ctx.lineTo(containerX + containerWidth, containerY + containerHeight - containerRadius);
    ctx.quadraticCurveTo(containerX + containerWidth, containerY + containerHeight, containerX + containerWidth - containerRadius, containerY + containerHeight);
    ctx.lineTo(containerX + containerRadius, containerY + containerHeight);
    ctx.quadraticCurveTo(containerX, containerY + containerHeight, containerX, containerY + containerHeight - containerRadius);
    ctx.lineTo(containerX, containerY + containerRadius);
    ctx.quadraticCurveTo(containerX, containerY, containerX + containerRadius, containerY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (leaderboard.length === 0) return canvas.toBuffer();

    const maxScore = Math.max(...leaderboard.map(u => u.total));
    const containerPadding = 35;
    const nameColumnWidth = 140;
    const availableHeight = containerHeight - (containerPadding * 2);
    const barSpacing = 12;
    const displayCount = Math.min(10, leaderboard.length);
    
    // Calculate bar height dynamically
    const barHeight = Math.min(42, (availableHeight - (barSpacing * (displayCount - 1))) / displayCount);
    const maxBarWidth = containerWidth - nameColumnWidth - (containerPadding * 3) - 90; // Extra space for score text
    
    leaderboard.slice(0, displayCount).forEach((user, index) => {
      const y = containerY + containerPadding + (index * (barHeight + barSpacing));
      
      // Truncate username with ellipsis (like jayden_...)
      let name = user.first_name || user.username || 'User';
      if (name.length > 12) {
        name = name.substring(0, 9) + '...';
      }
      
      const score = user.total;
      const barWidth = Math.max(30, (score / maxScore) * maxBarWidth);
      
      // User Name (Left side) - White text with shadow
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 4;
      ctx.fillText(name, containerX + containerPadding, y + (barHeight / 2));
      ctx.shadowColor = 'transparent';

      // Bar Start Position
      const barStartX = containerX + nameColumnWidth + containerPadding;

      // Draw Bar with Rounded Corners (smoother, more rounded style)
      const barRadius = Math.min(25, barHeight / 2);
      const barGradient = ctx.createLinearGradient(barStartX, y, barStartX + barWidth, y);
      barGradient.addColorStop(0, '#d4556a');
      barGradient.addColorStop(1, '#c74b5e');
      ctx.fillStyle = barGradient;
      
      ctx.beginPath();
      ctx.moveTo(barStartX + barRadius, y);
      ctx.lineTo(barStartX + barWidth - barRadius, y);
      ctx.quadraticCurveTo(barStartX + barWidth, y, barStartX + barWidth, y + barRadius);
      ctx.lineTo(barStartX + barWidth, y + barHeight - barRadius);
      ctx.quadraticCurveTo(barStartX + barWidth, y + barHeight, barStartX + barWidth - barRadius, y + barHeight);
      ctx.lineTo(barStartX + barRadius, y + barHeight);
      ctx.quadraticCurveTo(barStartX, y + barHeight, barStartX, y + barHeight - barRadius);
      ctx.lineTo(barStartX, y + barRadius);
      ctx.quadraticCurveTo(barStartX, y, barStartX + barRadius, y);
      ctx.closePath();
      ctx.fill();

      // Score - Inside bar if large enough, otherwise to the right
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Arial';
      ctx.textBaseline = 'middle';
      
      if (barWidth > 80) {
        // Score inside bar - centered
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 3;
        ctx.fillText(score.toLocaleString(), barStartX + (barWidth / 2), y + (barHeight / 2));
      } else {
        // Score to the right of small bar
        ctx.textAlign = 'left';
        ctx.fillText(score.toLocaleString(), barStartX + barWidth + 15, y + (barHeight / 2));
      }
      ctx.shadowColor = 'transparent';
    });

    // Chat Icon (Bottom Right) - Chat bubble with X like the desired image
    ctx.fillStyle = '#ffffff';
    ctx.font = '48px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    
    // Draw a simple chat bubble with X symbol
    const iconX = width - 120;
    const iconY = height - 70;
    const iconSize = 45;
    
    // Chat bubble shape
    ctx.beginPath();
    ctx.arc(iconX, iconY, iconSize / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // X symbol inside
    ctx.fillStyle = '#1a0305';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✕', iconX, iconY + 2);
    
    // Second bubble behind
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(iconX - 25, iconY + 15, iconSize / 2.5, 0, Math.PI * 2);
    ctx.fill();

    return canvas.toBuffer();
  }
};
