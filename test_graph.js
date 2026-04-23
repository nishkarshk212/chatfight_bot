const { generateLeaderboardGraph } = require('./src/graph');
const fs = require('fs');

// Test leaderboard data with stylish names
const testLeaderboard = [
  { first_name: '𝐉𝐚𝐲𝐝𝐞𝐧_', total: 116 },
  { first_name: '𝙨𝙝𝙞𝙨𝙝𝙞𝙢', total: 55 },
  { first_name: '𝟠𝟛𝟘𝟠𝟜𝟡𝟡', total: 43 },
  { first_name: '𝓢𝓲𝓪𝓪𝓪', total: 21 },
  { first_name: '𝕊ℍ𝕀𝕊ℍ𝕀', total: 20 },
  { first_name: '𝟨𝟫𝟨𝟤𝟩𝟩𝟧', total: 16 },
  { first_name: 'lovernoir', total: 15 },
  { first_name: 'lovernoir', total: 10 },
  { first_name: 'Ms', total: 8 },
  { first_name: '7556225', total: 7 }
];

async function testGraph() {
  try {
    console.log('Generating test leaderboard graph...');
    const graphBuffer = await generateLeaderboardGraph(testLeaderboard);
    
    // Save the generated graph
    fs.writeFileSync('test_leaderboard.png', graphBuffer);
    console.log('Test graph saved as test_leaderboard.png');
    console.log('Graph size:', graphBuffer.length, 'bytes');
  } catch (error) {
    console.error('Error generating graph:', error);
  }
}

testGraph();
