require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Multer Config
const UPLOADS_DIR = 'uploads';
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));
app.use('/uploads', express.static(UPLOADS_DIR));

let cachedDoc = null;
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file'];

async function getSheets() {
    try {
        if (!process.env.GOOGLE_SHEET_ID) throw new Error('GOOGLE_SHEET_ID is missing');
        if (!cachedDoc) {
            let creds;
            if (process.env.GOOGLE_SERVICE_ACCOUNT) {
                creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
            } else {
                creds = require('./google-key.json');
            }
            const auth = new JWT({ email: creds.client_email, key: creds.private_key, scopes: SCOPES });
            const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
            await doc.loadInfo();
            cachedDoc = doc;
        }
        const doc = cachedDoc;

        // Unified header structures
        const loanHeaders = ['thoi_gian', 'ho_ten', 'gioi_tinh', 'tuoi', 'cccd', 'sdt', 'email', 'dia_chi', 'nghe_nghiep', 'da_vay', 'thu_nhap', 'so_tien', 'ma_gt', 'file_url', 'status', 'token', 'email_sent'];
        const legalHeaders = ['thoi_gian', 'ho_ten', 'gioi_tinh', 'tuoi', 'cccd', 'sdt', 'email', 'ma_gt', 'trinh_do', 'ma_so_thue', 'file_url', 'status', 'token', 'email_sent'];

        // 1. Vay Von (Existing)
        let loanSheet = doc.sheetsByTitle['DangKyVayVon'];
        if (!loanSheet) {
            loanSheet = doc.sheetsByIndex[0];
            await loanSheet.updateProperties({ title: 'DangKyVayVon' });
        }
        await loanSheet.setHeaderRow(loanHeaders);

        // 2. Legal Services
        const legalSheets = {};
        const titles = {
            'tien-treo': 'TienTreo',
            'tim-viec': 'TimViecPhapLy',
            'dat-dai': 'DatDaiPhapLy',
            'nop-thue': 'NopThuePhapLy'
        };

        for (const [key, title] of Object.entries(titles)) {
            let sheet = doc.sheetsByTitle[title];
            if (!sheet) {
                sheet = await doc.addSheet({ title });
            }
            await sheet.setHeaderRow(legalHeaders);
            legalSheets[key] = sheet;
        }

        // 3. Bank Sheet
        let bankSheet = doc.sheetsByTitle['ThongTinNganHang'];
        if (!bankSheet) {
            bankSheet = await doc.addSheet({ title: 'ThongTinNganHang' });
        }
        await bankSheet.setHeaderRow(['thoi_gian', 'token', 'qr_url', 'chu_tk', 'ngan_hang', 'stk', 'status']);

        return { loanSheet, legalSheets, bankSheet };
    } catch (err) {
        console.error('[SHEET FATAL ERROR]:', err.message);
        cachedDoc = null;
        return null;
    }
}

async function checkAndSendEmails() {
    try {
        const sheets = await getSheets();
        if (!sheets) return;

        // Check all registration sheets for approvals
        const allRegSheets = [sheets.loanSheet, ...Object.values(sheets.legalSheets)];
        const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        for (const sheet of allRegSheets) {
            const rows = await sheet.getRows();
            for (const row of rows) {
                const status = (row.get('status') || '').toUpperCase();
                const emailSent = row.get('email_sent');
                const userEmail = row.get('email');
                const fullName = row.get('ho_ten');
                let token = row.get('token');

                if (status === 'APPROVED' && emailSent !== 'YES' && userEmail) {
                    if (!token) {
                        token = 'tk-' + Math.random().toString(36).substr(2, 9);
                        row.set('token', token);
                    }
                    const verifyLink = `${appUrl}/?token=${token}`;
                    const mailOptions = {
                        from: `"Hỗ trợ KBNN" <${process.env.EMAIL_USER}>`,
                        to: userEmail,
                        subject: 'Hồ sơ của bạn đã được phê duyệt',
                        html: `<div style="font-family: Arial;"><h2>Chào ${fullName},</h2><p>Hồ sơ của bạn đã được phê duyệt thành công. Vui lòng nhận tiền tại link sau:</p><a href="${verifyLink}">${verifyLink}</a></div>`
                    };
                    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
                        await transporter.sendMail(mailOptions);
                        row.set('email_sent', 'YES');
                        await row.save();
                    }
                }
            }
        }
    } catch (err) {
        console.error('[MAILER ERROR]:', err.message);
    }
}
setInterval(checkAndSendEmails, 10000);

// Submission Route
app.post('/api/submit', upload.single('file'), async (req, res) => {
    const data = req.body;
    const file = req.file;
    const timestamp = new Date().toLocaleString('vi-VN');
    const service = data.service || 'vay-von';

    const fileUrl = file ? `${req.protocol}://${req.get('host')}/uploads/${file.filename}` : '';

    try {
        const sheets = await getSheets();
        if (sheets) {
            let targetSheet = (service === 'vay-von') ? sheets.loanSheet : sheets.legalSheets[service];
            if (!targetSheet) targetSheet = sheets.loanSheet;

            const rowData = {
                'thoi_gian': timestamp,
                'ho_ten': data.fullname,
                'gioi_tinh': data.gender,
                'tuoi': data.age,
                'cccd': data.cccd,
                'sdt': data.phone,
                'email': data.email,
                'ma_gt': data.referralCode || '',
                'file_url': fileUrl,
                'status': 'PENDING',
                'token': '',
                'email_sent': 'NO'
            };

            if (service === 'vay-von') {
                Object.assign(rowData, {
                    'dia_chi': data.address,
                    'nghe_nghiep': data.occupation,
                    'da_vay': data.hasLoan || 'no',
                    'thu_nhap': data.income,
                    'so_tien': data.loanAmount
                });
            } else {
                Object.assign(rowData, {
                    'trinh_do': data.education || '',
                    'ma_so_thue': data.taxId || ''
                });
            }

            await targetSheet.addRow(rowData);
        }
        res.json({ result: 'success' });
    } catch (err) {
        res.status(500).json({ result: 'error', message: err.message });
    }
});

let statusCache = { data: null, lastFetch: 0 };
app.get('/api/status', async (req, res) => {
    const { token } = req.query;
    let result = { status: 'pending', qr_url: '' };
    try {
        const now = Date.now();
        if (!statusCache.data || (now - statusCache.lastFetch > 5000)) {
            const sheets = await getSheets();
            if (sheets) {
                const allRegSheets = [sheets.loanSheet, ...Object.values(sheets.legalSheets)];
                let infoRows = [];
                for (const s of allRegSheets) {
                    const rows = await s.getRows();
                    infoRows = infoRows.concat(rows);
                }
                const bankRows = await sheets.bankSheet.getRows();
                statusCache.data = { infoRows, bankRows };
                statusCache.lastFetch = now;
            }
        }
        if (statusCache.data) {
            const infoRow = statusCache.data.infoRows.find(r => r.get('token') === token);
            const bankRow = statusCache.data.bankRows.find(r => r.get('token') === token);
            if (infoRow) {
                const infoStatus = (infoRow.get('status') || 'PENDING').toUpperCase();
                if (infoStatus === 'PENDING') result.status = 'pending';
                else if (infoStatus === 'APPROVED') {
                    if (bankRow) {
                        const qrUrl = bankRow.get('qr_url') || '';
                        const bankStatus = (bankRow.get('status') || '').toUpperCase();
                        if (bankStatus === 'DONE' || bankStatus === 'SCANNED') result.status = 'done';
                        else if (qrUrl) { result.status = 'qr_ready'; result.qr_url = qrUrl; }
                        else result.status = 'waiting_qr';
                    } else result.status = 'approved';
                }
            }
        }
    } catch (err) { }
    res.json(result);
});

app.post('/api/submit-bank', async (req, res) => {
    const { token, bankOwner, bankName, bankAccount } = req.body;
    const timestamp = new Date().toLocaleString('vi-VN');
    try {
        const sheets = await getSheets();
        if (sheets) {
            await sheets.bankSheet.addRow({
                'thoi_gian': timestamp, 'token': token, 'chu_tk': bankOwner,
                'ngan_hang': bankName, 'stk': bankAccount, 'qr_url': '', 'status': 'PENDING'
            });
        }
        res.json({ result: 'success' });
    } catch (err) {
        res.status(500).json({ result: 'error', message: err.message });
    }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
