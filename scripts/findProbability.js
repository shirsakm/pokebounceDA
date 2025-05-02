const Discord = require('discord.js-selfbot-v13');
const fs = require('fs');

require('dotenv').config();

// 1) Precomputed win-rates by match size (%)
const sizeWinRates = {
    Decidueye: { 3: 42.86, 4: 27.66, 5: 26.67, 6: 13.82 },
    Infernape: { 3: 12.07, 4: 16.28, 5: 16.67, 6: 13.14 },
    Kingdra: { 3: 36.51, 4: 26.51, 5: 23.29, 6: 20.74 },
    Mamoswine: { 3: 30.88, 4: 20.27, 5: 24.10, 6: 12.61 },
    Nidoking: { 3: 22.41, 4: 21.59, 5: 6.32, 6: 12.03 },
    Pikachu: { 3: 37.70, 4: 28.74, 5: 14.44, 6: 22.50 },
    Scizor: { 3: 28.12, 4: 28.40, 5: 27.50, 6: 26.09 },
    Staraptor: { 3: 40.68, 4: 26.74, 5: 17.57, 6: 10.77 },
    Umbreon: { 3: 30.91, 4: 22.92, 5: 14.29, 6: 16.41 },
    Wigglytuff: { 3: 25.45, 4: 16.13, 5: 18.29, 6: 11.48 },
};

// 2) Head-to-head win-rates (%)
const h2hWinRates = {
    Decidueye: { Infernape: 20.25, Kingdra: 18.05, Mamoswine: 19.53, Nidoking: 21.34, Pikachu: 25.18, Scizor: 22.22, Staraptor: 25.36, Umbreon: 22.58, Wigglytuff: 25.32 },
    Infernape: { Decidueye: 12.27, Kingdra: 16.87, Mamoswine: 14.29, Nidoking: 15.45, Pikachu: 21.69, Scizor: 32.21, Staraptor: 20.53, Umbreon: 23.62, Wigglytuff: 19.90 },
    Kingdra: { Decidueye: 18.05, Infernape: 27.71, Mamoswine: 17.45, Nidoking: 30.19, Pikachu: 19.59, Scizor: 27.34, Staraptor: 16.55, Umbreon: 16.46, Wigglytuff: 13.42 },
    Mamoswine: { Decidueye: 19.53, Infernape: 14.29, Kingdra: 17.45, Nidoking: 17.93, Pikachu: 25.76, Scizor: 21.09, Staraptor: 26.80, Umbreon: 19.40, Wigglytuff: 21.99 },
    Nidoking: { Decidueye: 21.34, Infernape: 15.45, Kingdra: 30.19, Mamoswine: 17.93, Pikachu: 20.60, Scizor: 28.08, Staraptor: 30.00, Umbreon: 22.80, Wigglytuff: 20.30 },
    Pikachu: { Decidueye: 25.18, Infernape: 21.69, Kingdra: 19.59, Mamoswine: 25.76, Nidoking: 20.60, Scizor: 31.50, Staraptor: 21.62, Umbreon: 26.17, Wigglytuff: 20.00 },
    Scizor: { Decidueye: 22.22, Infernape: 32.21, Kingdra: 27.34, Mamoswine: 21.09, Nidoking: 28.08, Pikachu: 31.50, Staraptor: 26.28, Umbreon: 30.47, Wigglytuff: 25.17 },
    Staraptor: { Decidueye: 25.36, Infernape: 20.53, Kingdra: 16.55, Mamoswine: 26.80, Nidoking: 30.00, Pikachu: 21.62, Scizor: 26.28, Umbreon: 18.59, Wigglytuff: 21.85 },
    Umbreon: { Decidueye: 22.58, Infernape: 23.62, Kingdra: 16.46, Mamoswine: 19.40, Nidoking: 22.80, Pikachu: 26.17, Scizor: 30.47, Staraptor: 18.59, Wigglytuff: 15.23 },
    Wigglytuff: { Decidueye: 25.32, Infernape: 19.90, Kingdra: 13.42, Mamoswine: 21.99, Nidoking: 20.30, Pikachu: 20.00, Scizor: 25.17, Staraptor: 21.85, Umbreon: 15.23 },
};

// Utility to average an array of numbers
function avg(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Calculate win probabilities for a given free-for-all lineup.
 * @param {string[]} fighters – list of Pokémon names (must match keys above)
 * @param {number} weightSize – importance of size-based win rate (0–1)
 * @param {number} weightH2H  – importance of head-to-head (0–1, total weights = 1)
 * @returns {Object} – mapping { mon: normalizedProbability }
 */
function calculateWinProbabilities(fighters, weightSize = 0.4, weightH2H = 0.6) {
    const matchSize = fighters.length;
    const rawScores = {};

    fighters.forEach(mon => {
        // 1) base from match-size win rate
        const sizeRate = (sizeWinRates[mon]?.[matchSize] ?? (100 / matchSize)) / 100;

        // 2) gather H2H rates vs each opponent
        const h2hList = fighters
            .filter(o => o !== mon)
            .map(o => (h2hWinRates[mon]?.[o] ?? (100 / fighters.length)) / 100);

        const h2hAvg = h2hList.length ? avg(h2hList) : sizeRate;

        rawScores[mon] = weightSize * sizeRate + weightH2H * h2hAvg;
    });

    // Normalize scores
    const total = Object.values(rawScores).reduce((a, b) => a + b, 0);
    const normalized = {};
    Object.keys(rawScores).forEach(mon => {
        normalized[mon] = rawScores[mon] / total;
    });

    return normalized;
}

// Export for Node/browser
if (typeof module !== 'undefined') {
    module.exports = { calculateWinProbabilities };
}

// Discord bot integration
const client = new Discord.Client();
const CHANNEL_ID = '1366415702378156164';
const MESSAGE_FORMAT = "A new fight has started! This round's fighters: ";
const WIN_MESSAGE_FORMAT = "has won the fight!";
const LOG_FILE = 'fight_predictions.log';

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

let lastFighters = [];
client.on('messageCreate', async msg => {
    if (msg.channelId !== CHANNEL_ID) return;

    if (msg.content.startsWith(MESSAGE_FORMAT)) {
        lastFighters = msg.content
            .replace(MESSAGE_FORMAT, '')
            .replace(/[\[\]']/g, '')
            .split(',')
            .map(n => n.trim());

        const odds = calculateWinProbabilities(lastFighters);
        console.log('Win probabilities:');
        let logMessage = `Fight: ${lastFighters.join(', ')}\n`;
        lastFighters.forEach(mon => {
            const pct = (odds[mon] * 100).toFixed(1);
            console.log(`${mon}: ${pct}%`);
            logMessage += `  ${mon}: ${pct}%\n`;
        });
        fs.appendFileSync(LOG_FILE, logMessage + '\n');

    } else if (msg.content.includes(WIN_MESSAGE_FORMAT) && lastFighters.length) {
        const winner = msg.content.split(' ')[0];
        console.log(`Winner: ${winner}`);
        const logMessage = `Fight: ${lastFighters.join(', ')}\n  Winner: ${winner}\n\n`;
        fs.appendFileSync(LOG_FILE, logMessage);
        lastFighters = [];
    }
});

client.login(process.env.DISCORD_TOKEN || 'TOKEN');
