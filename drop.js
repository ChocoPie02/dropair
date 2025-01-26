(async () => {
    const fetch = (await import('node-fetch')).default;
    const chalk = (await import('chalk')).default;
    const randomUseragent = (await import('random-useragent')).default;
    const moment = require('moment');
    const fs = require('fs').promises;

    const userAgent = randomUseragent.getRandom();
    const header = {
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": userAgent,
        'Accept': 'application/json, text/plain, */*',
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
            'Cookie': `auth-token=${authToken}`
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
            'Cookie': `auth-token=${authToken}`,
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
