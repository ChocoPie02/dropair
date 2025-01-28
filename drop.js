(async () => {
    const fetch = (await import('node-fetch')).default;
    const chalk = (await import('chalk')).default;
    const randomUseragent = (await import('random-useragent')).default;
    const moment = require('moment');
    const fs = require('fs').promises;

    const userAgent = randomUseragent.getRandom();
    const header = {
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 Edg/132.0.0.0",
        'Accept': 'application/json, text/plain, */*',
'priority': 'u=1, i',
'sec-ch-ua-platform':"Windows",
'sec-ch-ua-platform-version':"15.0.0",
'sec-fetch-mode':'cors',
'sec-fetch-site': 'same-origin'
    }

    async function loadAuthToken() {
        try {
            const data = await fs.readFile('account.txt', 'utf8');
            const lines = data.split('\n'); // Split the content by lines
            return lines.map(line => line.trim()); // Return all tokens trimmed
        } catch (error) {
            console.error("Error loading auth-token:", error);
            return null;
        }
    }

    async function getUser(authToken) {
        const headers = {
            ...header,
            'origin': "https://dropair.io",
            'referer': "https://dropair.io/",
            'Cookie': `cf_clearance=QsvMnYDogN_XITCJqJ8Q6k9ArG3IyWD0RqXERNfQ9Wk-1738069511-1.2.1.1-V4O5jYfV7oFtIpecdrHyzuTEaGRK1QklnWFXh6v.5ZM81.QnsoOMbDaxmJjtvfVbWZCXWCqQC0KGs.LGArzsfLUSPoW1ah3GLniTZtea5FUYLd744GNJCz5f21o4hGMyZ6iH.gr2eqrQvi2Yg7xKv2GcilCkyB5XJPjKD5uA8g25V16oO9BTYCn9itERibKUpCf07Gn9NhXTncRPHdyPqP8g2hX63S87G7TdiGRKX8GX9.3KwpokCumKT2oXm0hm9qbN6_vfeQJXMG955Vw1hH8I2wV2pSYvlEoQzYugj9ELrYIidCrpn5ijIdCBZbzChesP.F9ax92EzXZiXkIMzg; auth-token=${authToken}`
        };

        const response = await fetch("https://dropair.io/api/user", { method: 'GET', headers });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return await response.json();
    }

    async function dailyCheckIn(authToken) {
        const headers = {
            ...header,
            'origin': "https://dropair.io",
            'referer': "https://dropair.io/",
            'Cookie': `cf_clearance=QsvMnYDogN_XITCJqJ8Q6k9ArG3IyWD0RqXERNfQ9Wk-1738069511-1.2.1.1-V4O5jYfV7oFtIpecdrHyzuTEaGRK1QklnWFXh6v.5ZM81.QnsoOMbDaxmJjtvfVbWZCXWCqQC0KGs.LGArzsfLUSPoW1ah3GLniTZtea5FUYLd744GNJCz5f21o4hGMyZ6iH.gr2eqrQvi2Yg7xKv2GcilCkyB5XJPjKD5uA8g25V16oO9BTYCn9itERibKUpCf07Gn9NhXTncRPHdyPqP8g2hX63S87G7TdiGRKX8GX9.3KwpokCumKT2oXm0hm9qbN6_vfeQJXMG955Vw1hH8I2wV2pSYvlEoQzYugj9ELrYIidCrpn5ijIdCBZbzChesP.F9ax92EzXZiXkIMzg; auth-token=${authToken}`,
            'Content-Type': 'application/json' // Add content type for JSON
        };

        const body = JSON.stringify({ taskId: "daily-task" }); // Create JSON body

        const response = await fetch("https://dropair.io/api/tasks", { 
            method: 'POST', 
            headers, 
            body // Include the body in the request
        });
        if (!response.ok) {
            const responseText = await response.text(); // Read the raw response text
            if (response.status === 400) {
                console.log(chalk.red(`Error : ${JSON.parse(responseText).error}`));
                return { error: "Task already completed" }; // Return the specific error response
            }
            //throw new Error(`HTTP error! Status: ${response.status} ${JSON.parse(responseText).error}`);
        }else{
            console.log(chalk.green("Daily check-in successful!"));
        }
        return await response.json();
    }

    async function main() {
        const tokens = await loadAuthToken(); // Load all tokens
        if (!tokens || tokens.length === 0) {
            console.log("No auth-tokens found.");
            return;
        }

        while (true) {
            for (const authToken of tokens) {
                console.log("Auth Token:", authToken); // Log the auth token for debugging

                try {
                    // Cek username dan total poin
                    const userDetails = await getUser(authToken);
                    const { username, totalPoints } = userDetails || {};
                    if (username) {
                        console.log(chalk.magenta(`Username: ${username} | Total Points: ${totalPoints}`));
                    } else {
                        console.log(chalk.red("Failed to retrieve user details."));
                    }

                    // Kirimkan daily check-in
                    const checkInResponse = await dailyCheckIn(authToken);

                } catch (error) {
                    console.error('Error:', error);
                }
            }
            const now = moment();
			const formattedNow = now.format('DD MMMM YYYY HH:mm')
            const tomorrow = now.add(24, 'hours');
			const formattedTomorrow = tomorrow.format('DD MMMM YYYY HH:mm');
            console.log(`[${formattedNow}] All accounts processed.`);
            console.log(`Waiting 24 hours for the next check-in on [${formattedTomorrow}]`);
            await new Promise(resolve => setTimeout(resolve, 24 * 60 * 60 * 1000));  // 24 hours cooldown
            
        }    
    }

    main();
})();
