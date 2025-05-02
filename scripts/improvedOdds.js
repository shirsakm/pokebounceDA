// UNTESTED CODE
// Dynamically compute smoothed win-rates and optimize weights to reduce log-loss

const fs = require('fs');
const path = require('path');

// Load historical data
const DATA_PATH = 'fight_data.json';
const raw = fs.readFileSync(DATA_PATH, 'utf-8');
const matches = JSON.parse(raw);

// Parameters
const alpha = 1;  // Laplace smoothing factor
const sizes = [3, 4, 5, 6];

// 1) Aggregate counts
const sizeCounts = {}; // mon -> size -> {appearances, wins}
const h2hCounts = {};   // mon -> opp -> {matches, wins}

matches.forEach(match => {
    const fighters = match.fighters.map(f => f.replace(/'/g, '').trim());
    const winner = match.winner.replace(/'/g, '').trim();
    fighters.forEach(mon => {
        sizeCounts[mon] = sizeCounts[mon] || {};
        const size = fighters.length;
        sizeCounts[mon][size] = sizeCounts[mon][size] || { appearances: 0, wins: 0 };
        sizeCounts[mon][size].appearances++;
        if (mon === winner) sizeCounts[mon][size].wins++;

        // H2H
        fighters.forEach(opp => {
            if (mon === opp) return;
            h2hCounts[mon] = h2hCounts[mon] || {};
            h2hCounts[mon][opp] = h2hCounts[mon][opp] || { matches: 0, wins: 0 };
            h2hCounts[mon][opp].matches++;
            if (mon === winner) h2hCounts[mon][opp].wins++;
        });
    });
});

// 2) Compute smoothed rate tables
const sizeWinRates = {}; // mon -> size -> smoothed probability
const h2hWinRates = {};  // mon -> opp -> smoothed probability

Object.keys(sizeCounts).forEach(mon => {
    sizeWinRates[mon] = {};
    sizes.forEach(size => {
        const counts = sizeCounts[mon][size] || { appearances: 0, wins: 0 };
        const wins = counts.wins + alpha;
        const apps = counts.appearances + 2 * alpha;
        sizeWinRates[mon][size] = wins / apps;
    });
});

Object.keys(h2hCounts).forEach(mon => {
    h2hWinRates[mon] = {};
    Object.keys(h2hCounts[mon]).forEach(opp => {
        const counts = h2hCounts[mon][opp];
        const wins = counts.wins + alpha;
        const apps = counts.matches + 2 * alpha;
        h2hWinRates[mon][opp] = wins / apps;
    });
});

// 3) Function to compute probabilities given weights
function getProbabilities(fighters, weightSize, weightH2H) {
    const rawScores = {};
    fighters.forEach(mon => {
        const size = fighters.length;
        const sizeRate = sizeWinRates[mon]?.[size] ?? (1 / size);
        const h2hList = fighters
            .filter(o => o !== mon)
            .map(o => h2hWinRates[mon]?.[o] ?? 1 / fighters.length);
        const h2hAvg = h2hList.length ? h2hList.reduce((a, b) => a + b, 0) / h2hList.length : sizeRate;
        rawScores[mon] = weightSize * sizeRate + weightH2H * h2hAvg;
    });
    const total = Object.values(rawScores).reduce((a, b) => a + b, 0);
    const probs = {};
    fighters.forEach(mon => { probs[mon] = rawScores[mon] / total; });
    return probs;
}

// 4) Grid search weights to minimize log loss
let best = { weightSize: 0.5, weightH2H: 0.5, logLoss: Infinity };
for (let ws = 0; ws <= 1; ws += 0.05) {
    const wh = 1 - ws;
    let loss = 0;
    matches.forEach(match => {
        const fighters = match.fighters.map(f => f.replace(/'/g, '').trim());
        const winner = match.winner.replace(/'/g, '').trim();
        const probs = getProbabilities(fighters, ws, wh);
        const p = Math.max(probs[winner] || 1e-15, 1e-15);
        loss += -Math.log(p);
    });
    const avgLoss = loss / matches.length;
    if (avgLoss < best.logLoss) best = { weightSize: ws, weightH2H: wh, logLoss: avgLoss };
}

console.log('Optimized weights:', best);

// 5) Export calculateWinProbabilities with optimized weights
/**
 * @param {string[]} fighters
 * @returns {Object} mon->probability
 */
function calculateWinProbabilities(fighters) {
    return getProbabilities(fighters, best.weightSize, best.weightH2H);
}

module.exports = { calculateWinProbabilities };
