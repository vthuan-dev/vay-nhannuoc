const http = require('http');

let db = {
    // token: { status: 'pending', qr_url: '' }
};

const server = http.createServer((req, res) => {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
        if (req.method === 'POST') {
            try {
                const data = JSON.parse(body);
                console.log('Received POST:', data);

                if (data.action === 'submit') {
                    const token = 'mock-' + Math.random().toString(36).substr(2, 9);
                    db[token] = { status: 'pending', qr_url: '' };

                    console.log(`[SUBMIT] New application. Token: ${token}`);

                    // Auto-approve after 5 seconds for simulation
                    setTimeout(() => {
                        if (db[token]) {
                            db[token].status = 'approved';
                            console.log(`[SIMULATION] Token ${token} is now APPROVED`);
                        }
                    }, 5000);

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ result: 'success', token: token }));
                }
                else if (data.action === 'submit_bank') {
                    const token = data.token;
                    if (db[token]) {
                        console.log(`[BANK] Bank details received for token: ${token}`);

                        // Auto-move to scanned (with QR) after 5 seconds
                        setTimeout(() => {
                            if (db[token]) {
                                db[token].status = 'scanned';
                                db[token].qr_url = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=MOCK_DISBURSEMENT_DATA';
                                console.log(`[SIMULATION] Token ${token} is now SCANNED (QR ready)`);
                            }
                        }, 5000);

                        // Auto-complete after another 10 seconds
                        setTimeout(() => {
                            if (db[token]) {
                                db[token].status = 'done';
                                console.log(`[SIMULATION] Token ${token} is now DONE`);
                            }
                        }, 10000);

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ result: 'success' }));
                    } else {
                        res.writeHead(404);
                        res.end(JSON.stringify({ error: 'Token not found' }));
                    }
                }
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        }
        else if (req.method === 'GET') {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const token = url.searchParams.get('token');

            if (token && db[token]) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(db[token]));
            } else {
                res.writeHead(404);
                res.end(JSON.stringify({ status: 'not_found' }));
            }
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`
🚀 MOCK LOAN BACKEND RUNNING
---------------------------
URL: http://localhost:${PORT}
- Use this for testing the full workflow locally.

Simulation Timeline:
1. Submit Form -> Status: pending
2. Wait 5s -> Status: approved (Form bank revealed)
3. Submit Bank -> Status: pending (waiting simulation)
4. Wait 5s -> Status: scanned (Show QR)
5. Wait 10s -> Status: done (Success Screen)
  `);
});
