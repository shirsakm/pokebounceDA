// THIS SCRIPT DOES NOT WORK

const fs = require('fs');
const path = require('path');
const { calculateWinProbabilities } = require('./improvedOdds.js').calculateWinProbabilities; 

// Path to your historical data
const DATA_PATH = 'fight_data.json'; 

// Load historical matches
const raw = fs.readFileSync(DATA_PATH, 'utf-8');
const matches = JSON.parse(raw);

let totalLogLoss = 0;
let totalBrier = 0;
let count = 0;
let correctTop1 = 0;

matches.forEach(match => {
    // Extract fighters and actual winner
    const fighters = match.fighters.map(f => f.replace(/'/g, "").trim());
    const winner = match.winner.replace(/'/g, "").trim();

    // Get predicted probabilities
    const probs = calculateWinProbabilities(fighters);

    // Ensure probabilities sum to ~1
    const sumP = fighters.reduce((sum, mon) => sum + (probs[mon] || 0), 0);

    // Log-loss for the winner: -log(p_winner)
    const pWinner = Math.max(probs[winner] || 0, 1e-15);
    totalLogLoss += -Math.log(pWinner);

    // Brier score: sum((p_i - o_i)^2) over all fighters, where o_i=1 if winner else 0
    const brier = fighters.reduce((sum, mon) => {
        const o = mon === winner ? 1 : 0;
        const p = probs[mon] || 0;
        return sum + Math.pow(p - o, 2);
    }, 0);
    totalBrier += brier;

    // Top-1 accuracy
    const predicted = fighters.reduce((best, mon) => {
        return (probs[mon] > probs[best] ? mon : best);
    }, fighters[0]);
    if (predicted === winner) correctTop1++;

    count++;
});

// Compute metrics
const avgLogLoss = totalLogLoss / count;
const avgBrier = totalBrier / count;
const top1Acc = correctTop1 / count * 100;

console.log('Evaluation on historical data:');
console.log(`Total matches evaluated: ${count}`);
console.log(`Top-1 Accuracy: ${top1Acc.toFixed(2)}%`);
console.log(`Average Log Loss: ${avgLogLoss.toFixed(4)}`);
console.log(`Average Brier Score: ${avgBrier.toFixed(4)}`);