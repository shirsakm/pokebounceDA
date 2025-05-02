const { Client, GatewayIntentBits } = require('discord.js-selfbot-v13');
const fs = require('fs');

require('dotenv').config();

const client = new Client();

const TOKEN = process.env.DISCORD_TOKEN || 'TOKEN';
const CHANNEL_ID = '1366415702378156164';
const DATA_FILE = 'fight_data.json';

let fightData = [];

// Load existing data from file, if it exists
try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    fightData = JSON.parse(data);
} catch (err) {
    console.log('No existing data file found, or error reading it.');
}

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    const channel = client.channels.cache.get(CHANNEL_ID);
    if (!channel) {
        console.error('Invalid channel ID.');
        client.destroy();
        return;
    }

    // Fetch all messages
    let allMessages = [];
    let lastId = '1367590399346086020';

    while (true) {
        const options = { limit: 100 };
        if (lastId) {
            options.before = lastId;
        }

        const messages = await channel.messages.fetch(options);
        if (messages.size === 0) {
            break;
        }

        allMessages = allMessages.concat(Array.from(messages.values()));
        lastId = messages.last().id;
    }

    allMessages.reverse(); // Ensure chronological order

    let currentFight = null;

    for (const message of allMessages) {
        const fightStartMatch = message.content.match(/A new fight has started! This round's fighters: \[(.*?)\]/);
        const fightEndMatch = message.content.match(/(.*?) has won the fight!/);

        if (fightStartMatch) {
            if (currentFight) {
                // Discard the previous fight if a new one starts before the result is known
                console.log("Discarding previous fight due to new fight starting.");
            }
            const fighters = fightStartMatch[1].split(', ').map(s => s.trim());
            currentFight = {
                fighters: fighters,
                winner: null,
            };
        } else if (fightEndMatch && currentFight) {
            const winner = fightEndMatch[1];
            currentFight.winner = winner;
            fightData.push(currentFight);
            console.log(`Fight Result: Fighters - ${currentFight.fighters.join(', ')}, Winner - ${winner}`);
            currentFight = null; // Reset for the next fight
            saveData(); // Save after each fight
        }
    }

    console.log('Finished processing messages.');
    client.destroy(); // Disconnect after processing
});

function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(fightData, null, 2));
    console.log('Data saved to file.');
}

client.login(TOKEN);