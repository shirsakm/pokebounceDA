const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');

require('dotenv').config();

const client = new Client();

client.on('ready', async () => {
    console.log(`${client.user.username} is ready!`);

    fs.readFile('userCoins.json', 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return;
        }

        try {
            const userCoins = JSON.parse(data);
            const userIds = Object.keys(userCoins);

            const allUserData = {};

            Promise.all(userIds.map(userId => {
                const coins = userCoins[userId] || 0;

                return client.users.fetch(userId).then(user => {
                    const username = user.username;

                    allUserData[userId] = {
                        username: username,
                        coins: coins
                    };

                    console.log(`User ID: ${userId}, Username: ${username}, Coins: ${coins}`);
                }).catch(console.error);
            })).then(() => {
                fs.writeFile('allUserData.json', JSON.stringify(allUserData), (err) => {
                    if (err) {
                        console.error('Error writing to allUserData.json:', err);
                    } else {
                        console.log('All user data saved to allUserData.json');
                    }
                    console.log('Logging out.');
                    client.destroy();
                });
            }).catch(error => {
                console.error('Error processing users:', error);
                client.destroy();
            });
        } catch (error) {
            console.error('Error parsing JSON:', error);
            client.destroy();
        }
    });
});

client.login(process.env.DISCORD_TOKEN);
