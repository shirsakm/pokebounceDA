const fs = require('fs');

function sortUserCoins() {
    fs.readFile('userCoins.json', 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return;
        }

        let userCoins = JSON.parse(data);

        // Convert the object to an array of [key, value] pairs
        let userCoinsArray = Object.entries(userCoins);

        // Sort the array by the number of coins in descending order
        userCoinsArray.sort(([, valueA], [, valueB]) => valueB - valueA);

        // Convert the sorted array back to an object
        let sortedUserCoins = Object.fromEntries(userCoinsArray);

        fs.writeFile('userCoins.json', JSON.stringify(sortedUserCoins, null, 2), (err) => {
            if (err) {
                console.error(err);
                return;
            }
            console.log('userCoins.json sorted and saved!');
        });
    });
}

sortUserCoins();