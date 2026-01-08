/**
 * GOOGLE APPS SCRIPT - LOAN BACKEND
 * 1. Create a Google Sheet.
 * 2. Rename 'Sheet1' to 'Applications'.
 * 3. Create a second sheet named 'Disbursements'.
 * 4. Go to Extensions -> Apps Script, paste this code.
 * 5. Click 'Deploy' -> 'New Deployment' -> 'Web App'.
 * 6. Execute as: 'Me', Who has access: 'Anyone'.
 * 7. COPY THE WEB APP URL to use in the HTML code.
 */

function doPost(e) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Applications');
    var data = JSON.parse(e.postData.contents);

    if (data.action === 'submit') {
        var token = Utilities.getUuid();
        var timestamp = new Date();

        // Thoi gian tao	Ho va ten	Tuổi	cccd	sdt	email	dia chi	nghe nghiep	da tung vay	thu nhap	loan_amount	status	token
        sheet.appendRow([
            timestamp,
            data.fullname,
            data.age,
            data.cccd,
            data.phone,
            data.email,
            data.address,
            data.occupation,
            data.hasLoan,
            data.income,
            data.loanAmount,
            'pending',
            token
        ]);

        return ContentService.createTextOutput(JSON.stringify({ result: 'success', token: token }))
            .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'submit_bank') {
        var disSheet = ss.getSheetByName('Disbursements');
        var timestamp = new Date();

        // token	chu tai khoan	ngan hang	stk	thoi gian tao
        disSheet.appendRow([
            data.token,
            data.bankOwner,
            data.bankName,
            data.bankAccount,
            timestamp
        ]);

        // Update main sheet status to 'scanned' or 'disbursing'
        var rows = sheet.getDataRange().getValues();
        for (var i = 1; i < rows.length; i++) {
            if (rows[i][12] === data.token) {
                sheet.getRange(i + 1, 12).setValue('scanned');
                break;
            }
        }

        return ContentService.createTextOutput(JSON.stringify({ result: 'success' }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

function doGet(e) {
    var token = e.parameter.token;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Applications');
    var rows = sheet.getDataRange().getValues();

    var status = 'not_found';
    var qr_url = '';

    // Find record by token
    for (var i = 1; i < rows.length; i++) {
        if (rows[i][12] === token) {
            status = rows[i][11]; // Column L: status
            qr_url = rows[i][13] || ''; // Column N: qr_url (needs to be added by admin)
            break;
        }
    }

    return ContentService.createTextOutput(JSON.stringify({ status: status, qr_url: qr_url }))
        .setMimeType(ContentService.MimeType.JSON);
}

// Admin function to send approval email manually or via trigger
function sendApprovalEmail(token, recipientEmail) {
    var appUrl = "https://YOUR_GITHUB_OR_LOCAL_URL/vay-von.html?token=" + token;
    var subject = "Thông báo phê duyệt hồ sơ vay vốn";
    var body = "Hồ sơ vay vốn của Quý khách đã được phê duyệt.\n\nVui lòng truy cập liên kết sau để làm thủ tục giải ngân:\n" + appUrl;

    MailApp.sendEmail(recipientEmail, subject, body);
}
