require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Serve React build in production

// In-memory mock database for local testing without Google Sheets initially
let mockDB = {};

// Helper to get Google Sheet (Placeholder for now)
async function getSheet() {
    if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
        return null; // Fallback to mock
    }
    // Implementation for Real Google Sheets will go here
    return null;
}

// Routes
app.post('/api/submit', async (req, res) => {
    const data = req.body;
    const token = 'loan-' + Math.random().toString(36).substr(2, 9);
    const timestamp = new Date().toISOString();

    console.log('[API] New Loan Submission:', data.fullname);

    // Mock storage
    mockDB[token] = {
        ...data,
        status: 'pending',
        timestamp,
        token
    };

    // TODO: Write to Google Sheets if configured

    res.json({ result: 'success', token });
});

app.get('/api/status', async (req, res) => {
    const { token } = req.query;
    const record = mockDB[token];

    if (!record) {
        return res.status(404).json({ status: 'not_found' });
    }

    res.json({
        status: record.status,
        qr_url: record.qr_url || ''
    });
});

app.post('/api/submit-bank', async (req, res) => {
    const { token, bankOwner, bankName, bankAccount } = req.body;
    const record = mockDB[token];

    if (!record) {
        return res.status(404).json({ error: 'Token not found' });
    }

    console.log('[API] Bank Details Received for:', record.fullname);

    // Update record
    record.bankOwner = bankOwner;
    record.bankName = bankName;
    record.bankAccount = bankAccount;
    record.status = 'scanned'; // Auto-advance for now
    record.qr_url = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=DISBURSEMENT_TOKEN_' + token;

    res.json({ result: 'success' });
});

// Admin Route (To manually change status for testing)
app.post('/api/admin/update-status', (req, res) => {
    const { token, status, qr_url } = req.body;
    if (mockDB[token]) {
        mockDB[token].status = status;
        if (qr_url) mockDB[token].qr_url = qr_url;
        res.json({ result: 'success', current: mockDB[token] });
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
