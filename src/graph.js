const { createCanvas, registerFont, loadImage } = require('canvas');
const path = require('path');

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
      const bgImagePath = path.join(__dirname, '..', '2026-04-23 18.44.50.jpg');
      bgImage = await loadImage(bgImagePath);
      // Draw background image stretched to fill canvas
      ctx.drawImage(bgImage, 0, 0, width, height);
    } catch (error) {
      console.log('Background image not found, using gradient fallback');
      const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2);
      gradient.addColorStop(0, '#2b0508');
      gradient.addColorStop(1, '#1a0305');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    // Add dark overlay for better readability
    ctx.fillStyle = 'rgba(30, 8, 12, 0.4)';
    ctx.fillRect(0, 0, width, height);

    // Decorative pink circles (overlay pattern)
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#ff6b7a';
    ctx.beginPath();
    ctx.arc(-150, 150, 300, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(width + 150, height - 150, 350, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(width / 2, -200, 400, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

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
    ctx.fillStyle = 'rgba(15, 3, 6, 0.85)';
    ctx.strokeStyle = 'rgba(200, 80, 100, 0.7)';
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
    const nameColumnWidth = 150;
    const availableHeight = containerHeight - (containerPadding * 2);
    const barSpacing = 10;
    const displayCount = Math.min(10, leaderboard.length);
    
    // Calculate bar height dynamically - make bars taller
    const barHeight = Math.min(48, (availableHeight - (barSpacing * (displayCount - 1))) / displayCount);
    const maxBarWidth = containerWidth - nameColumnWidth - (containerPadding * 3) - 100; // Extra space for score text
    
    leaderboard.slice(0, displayCount).forEach((user, index) => {
      const y = containerY + containerPadding + (index * (barHeight + barSpacing));
      
      // Get username and truncate properly - remove emojis
      let name = user.first_name || user.username || 'User';
      // Remove emojis and special Unicode characters
      name = name.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
      // Truncate with ellipsis if too long
      if (name.length > 12) {
        name = name.substring(0, 10) + '..';
      }
      
      const score = user.total;
      const barWidth = Math.max(40, (score / maxScore) * maxBarWidth);
      
      // User Name (Left side) - Clean white text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 4;
      ctx.fillText(name, containerX + containerPadding, y + (barHeight / 2));
      ctx.shadowColor = 'transparent';

      // Bar Start Position
      const barStartX = containerX + nameColumnWidth + containerPadding;

      // Draw Bar with solid color - cleaner look
      const barRadius = Math.min(24, barHeight / 2);
      ctx.fillStyle = '#d4556a';
      
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

      // Score - Always inside bar, centered
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 3;
      ctx.fillText(score.toLocaleString(), barStartX + (barWidth / 2), y + (barHeight / 2));
      ctx.shadowColor = 'transparent';
    });

    // Chat Icon (Bottom Right) - Two overlapping speech bubbles with X
    const iconX = width - 110;
    const iconY = height - 65;
    
    // First bubble (behind, slightly offset)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.ellipse(iconX - 18, iconY + 12, 22, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Second bubble (front)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(iconX, iconY, 25, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // X symbol inside front bubble
    ctx.fillStyle = '#1a0305';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'transparent';
    ctx.fillText('✕', iconX, iconY + 1);

    return canvas.toBuffer();
  }
};
