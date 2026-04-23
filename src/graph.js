const { createCanvas, registerFont } = require('canvas');

module.exports = {
  generateLeaderboardGraph: async (leaderboard) => {
    const width = 1200;
    const height = 675; // 16:9 aspect ratio
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background - Dark Gradient (matching the image style)
    const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2);
    gradient.addColorStop(0, '#2b0508');
    gradient.addColorStop(1, '#1a0305');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative circles (background pattern like the image)
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#ff6b7a';
    ctx.beginPath();
    ctx.arc(-100, 100, 200, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(width + 100, height - 100, 250, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Header Text - Large and Bold
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('LEADERBOARD', width / 2, 40);

    // Inner Container - Semi-transparent with rounded corners
    const containerX = 80;
    const containerY = 150;
    const containerWidth = width - 160;
    const containerHeight = height - 220;
    const containerRadius = 30;
    
    // Draw rounded rectangle container
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.strokeStyle = 'rgba(183, 62, 74, 0.5)';
    ctx.lineWidth = 3;
    
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
    const containerPadding = 30;
    const nameColumnWidth = 150;
    const availableHeight = containerHeight - (containerPadding * 2);
    const barSpacing = 15;
    
    // Calculate bar height dynamically
    const barHeight = Math.min(45, (availableHeight - (barSpacing * (leaderboard.length - 1))) / leaderboard.length);
    const maxBarWidth = containerWidth - nameColumnWidth - (containerPadding * 3) - 80; // Extra space for score text
    
    leaderboard.slice(0, 10).forEach((user, index) => {
      const y = containerY + containerPadding + (index * (barHeight + barSpacing));
      const name = (user.first_name || user.username || 'User').substring(0, 15);
      const score = user.total;
      
      // User Name (Left side) - White text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, containerX + containerPadding, y + (barHeight / 2));

      // Bar Start Position
      const barStartX = containerX + nameColumnWidth + containerPadding;
      const barWidth = Math.max(40, (score / maxScore) * maxBarWidth);

      // Draw Bar with Rounded Corners (matching the image style)
      const barRadius = Math.min(20, barHeight / 2);
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

      // Score inside bar - Centered and bold
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(score.toLocaleString(), barStartX + (barWidth / 2), y + (barHeight / 2));
    });

    // Chat Icon (Bottom Right) - Like the image
    ctx.fillStyle = '#ffffff';
    ctx.font = '50px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('💬✕', width - 100, height - 60);

    return canvas.toBuffer();
  }
};
