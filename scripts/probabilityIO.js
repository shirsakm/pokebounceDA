// IMPORT ERROR HAVEN'T FIXED YET

const Discord = require('discord.js-selfbot-v13');
const fs = require('fs');
const calculateWinProbabilities = require('./improvedOdds.js');

require('dotenv').config();

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
