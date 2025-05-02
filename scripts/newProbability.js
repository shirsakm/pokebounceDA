const Discord = require('discord.js-selfbot-v13');
const fs = require('fs');

require('dotenv').config();

// Dynamic Odds Calculation with Laplace & Δ-Based H2H
// Load historical match data
const DATA_PATH = './fightData.json';
const rawData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

// Smoothing parameter
const ALPHA = 1;
// Possible match sizes
const SIZES = [3, 4, 5, 6];

// Extract unique Pokémon names
const mons = [...new Set(
    rawData.flatMap(match =>
        match.fighters.map(f => f.replace(/'/g, '').trim())
    )
)];

// Initialize count structures
const overallCounts = {};
const sizeCounts = {};
const h2hCounts = {};
mons.forEach(mon => {
    overallCounts[mon] = { wins: 0, apps: 0 };
    sizeCounts[mon] = {};
    h2hCounts[mon] = {};
    mons.forEach(opp => {
        if (mon !== opp) {
            h2hCounts[mon][opp] = { wins: 0, matches: 0 };
        }
    });
});

// Populate counts, skipping matches with placeholder winners
rawData.forEach(match => {
    const fighters = match.fighters.map(f => f.replace(/'/g, '').trim());
    const winner = match.winner.replace(/'/g, '').trim();
    if (!mons.includes(winner)) return;
    const sz = fighters.length;

    fighters.forEach(mon => {
        overallCounts[mon].apps++;
        if (mon === winner) overallCounts[mon].wins++;

        sizeCounts[mon][sz] = sizeCounts[mon][sz] || { wins: 0, apps: 0 };
        sizeCounts[mon][sz].apps++;
        if (mon === winner) sizeCounts[mon][sz].wins++;

        fighters.forEach(opp => {
            if (mon === opp) return;
            h2hCounts[mon][opp].matches++;
            if (mon === winner) h2hCounts[mon][opp].wins++;
        });
    });
});

// Compute smoothed rates
const overallRate = {};
const sizeRate = {};
const h2hRate = {};
mons.forEach(mon => {
    // overall
    const o = overallCounts[mon];
    overallRate[mon] = (o.wins + ALPHA) / (o.apps + 2 * ALPHA);

    // size-based
    sizeRate[mon] = {};
    SIZES.forEach(sz => {
        const c = sizeCounts[mon][sz] || { wins: 0, apps: 0 };
        sizeRate[mon][sz] = (c.wins + ALPHA) / (c.apps + 2 * ALPHA);
    });

    // head-to-head
    h2hRate[mon] = {};
    mons.forEach(opp => {
        if (mon === opp) return;
        const c = h2hCounts[mon][opp];
        h2hRate[mon][opp] = (c.wins + ALPHA) / (c.matches + 2 * ALPHA);
    });
});

// Precompute Δ = H2H - overall
const deltaRate = {};
mons.forEach(mon => {
    deltaRate[mon] = {};
    mons.forEach(opp => {
        if (mon === opp) return;
        deltaRate[mon][opp] = (h2hRate[mon][opp] || 0) - (overallRate[mon] || 0);
    });
});

// Utility: average of array
function avg(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }

// Probability calculation given weights
function getProbabilities(fighters, wSize, wOverall, wDelta) {
    const sz = fighters.length;
    const raw = {};
    fighters.forEach(mon => {
        const sr = sizeRate[mon][sz] || (1 / sz);
        const or = overallRate[mon] || (1 / sz);
        const dr = avg(fighters.filter(o => o !== mon).map(o => deltaRate[mon][o] || 0));
        raw[mon] = wSize * sr + wOverall * or + wDelta * dr;
    });
    // normalize
    const sumRaw = Object.values(raw).reduce((sum, v) => sum + v, 0);
    return fighters.reduce((acc, mon) => {
        acc[mon] = raw[mon] / sumRaw;
        return acc;
    }, {});
}

// Grid search for optimal weights minimizing log loss
let best = { wSize: 0, wOverall: 0, wDelta: 0, loss: Infinity };
for (let wSize = 0; wSize <= 1; wSize += 0.1) {
    for (let wOverall = 0; wOverall <= 1 - wSize; wOverall += 0.1) {
        const wDelta = 1 - wSize - wOverall;
        let lossSum = 0;
        let count = 0;
        rawData.forEach(match => {
            const fighters = match.fighters.map(f => f.replace(/'/g, '').trim());
            const winner = match.winner.replace(/'/g, '').trim();
            if (!mons.includes(winner)) return;
            const probs = getProbabilities(fighters, wSize, wOverall, wDelta);
            const pWinner = Math.max(probs[winner] || 1e-15, 1e-15);
            lossSum += -Math.log(pWinner);
            count++;
        });
        const avgLoss = lossSum / count;
        if (avgLoss < best.loss) {
            best = { wSize, wOverall, wDelta, loss: avgLoss };
        }
    }
}
console.log('Optimized weights:', best);

// Main API: calculate probabilities using optimized weights
function calculateWinProbabilities(fighters) {
    return getProbabilities(fighters, best.wSize, best.wOverall, best.wDelta);
}

module.exports = { calculateWinProbabilities };

// === Discord Bot Integration ===
const client = new Discord.Client();
const CHANNEL_ID = '1366415702378156164';
const MSG_START = "A new fight has started! This round's fighters: ";
const MSG_WIN = "has won the fight!";
const LOG_FILE = 'fight_predictions.log';
let lastFighters = [];

client.on('ready', () => console.log(`Logged in as ${client.user.tag}`));
client.on('messageCreate', msg => {
    if (msg.channelId !== CHANNEL_ID) return;
    if (msg.content.startsWith(MSG_START)) {
        lastFighters = msg.content
            .slice(MSG_START.length)
            .replace(/[\[\]']/g, '')
            .split(',').map(n => n.trim());

        const odds = calculateWinProbabilities(lastFighters);
        console.log('Win probabilities:');
        lastFighters.forEach(mon => {
            const pct = (odds[mon] * 100).toFixed(1);
            console.log(`  ${mon}: ${pct}%`);
        });

        const logLines = [`Fight: ${lastFighters.join(', ')}`];
        lastFighters.forEach(mon => {
            const pct = (odds[mon] * 100).toFixed(1);
            logLines.push(`  ${mon}: ${pct}%`);
        });
        fs.appendFileSync(LOG_FILE, logLines.join('\n') + '\n\n');

    } else if (msg.content.includes(MSG_WIN) && lastFighters.length) {
        const winner = msg.content.split(' ')[0];
        console.log(`Winner: ${winner}`);
        fs.appendFileSync(LOG_FILE, `Winner: ${winner}\n\n`);
        lastFighters = [];
    }
});
client.login(process.env.DISCORD_TOKEN || 'TOKEN');
