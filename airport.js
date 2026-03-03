// Improved airport.js script

// Import necessary libraries
const axios = require('axios');

// Function to handle multiple subscriptions
async function fetchSubscriptions(subscriptions) {
    const results = await Promise.all(subscriptions.map(async (subscription) => {
        try {
            const response = await axios.get(`https://api.example.com/data?subscription=${subscription}`);
            return parseData(response.data);
        } catch (error) {
            console.error(`Error fetching data for subscription ${subscription}:`, error);
            return null;
        }
    }));
    return results.filter(result => result !== null);
}

// Function to parse data
function parseData(data) {
    // Example: Extracting important fields
    return {
        id: data.id,
        name: data.name,
        timestamp: new Date(data.timestamp).toUTCString(),
        details: data.details,
    };
}

// Function to display subscription data
function displayInfo(subscribedData) {
    subscribedData.forEach((sub) => {
        console.log(`Subscription ID: ${sub.id}\nName: ${sub.name}\nTimestamp: ${sub.timestamp}\nDetails: ${JSON.stringify(sub.details)}\n`);
    });
}

// Example usage
const subscriptions = ['sub1', 'sub2', 'sub3'];
fetchSubscriptions(subscriptions).then(displayInfo);
