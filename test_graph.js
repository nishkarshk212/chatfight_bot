const { generateLeaderboardGraph } = require('./src/graph');
const fs = require('fs');

// Test leaderboard data similar to the expected image
const testLeaderboard = [
  { first_name: 'jayden_', total: 116 },
  { first_name: 'shishim', total: 55 },
  { first_name: '8308499', total: 43 },
  { first_name: 'Siaaa', total: 21 },
  { first_name: 'SHISHI', total: 20 },
  { first_name: '6962775', total: 16 },
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
