const axios = require('axios');

async function checkUrl(url) {
    console.log(`Checking ${url}...`);
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Clash' },
            timeout: 5000
        });
        console.log('Headers:', JSON.stringify(response.headers, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.log('Response headers:', JSON.stringify(error.response.headers, null, 2));
        }
    }
}

const url1 = 'https://sub01.sh-cloudflare.sbs:8443/api/v1/client/subscribe?token=571791988e327f4615fcaefff79c2f23';
const url2 = 'https://app.mitce.net/?sid=479709&token=srvnbjcg';

(async () => {
    await checkUrl(url1);
    console.log('\n-------------------\n');
    await checkUrl(url2);
})();
