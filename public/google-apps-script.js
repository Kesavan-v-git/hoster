// Google Apps Script Code
// 1. Open your Google Sheet
// 2. Go to Extensions > Apps Script
// 3. Delete existing code and paste this entire script
// 4. Click "Deploy" > "New deployment"
// 5. Select type: "Web app"
// 6. Description: "Order Logger"
// 7. Execute as: "Me"
// 8. Who has access: "Anyone"
// 9. Click "Deploy"
// 10. Copy the "Web App URL" and paste it into js/google-sheet-config.js

function doPost(e) {
    const lock = LockService.getScriptLock();
    lock.tryLock(10000);

    try {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

        // Check if headers exist, if not add them
        if (sheet.getLastRow() === 0) {
            sheet.appendRow(['Timestamp', 'Order ID', 'Customer Name', 'Email', 'Mobile', 'Hostel', 'Items', 'Total', 'Status']);
        }

        const data = JSON.parse(e.postData.contents);

        if (data.action === 'logOrder') {
            const order = data.data;
            sheet.appendRow([
                order.timestamp,
                order.orderId,
                order.customerName,
                order.email,
                "'" + order.mobile, // Force string to prevent scientific notation
                order.hostel,
                order.items,
                order.total,
                order.status
            ]);

            return ContentService.createTextOutput(JSON.stringify({ 'result': 'success' })).setMimeType(ContentService.MimeType.JSON);
        }

        return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'message': 'Invalid action' })).setMimeType(ContentService.MimeType.JSON);

    } catch (e) {
        return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'error': e.toString() })).setMimeType(ContentService.MimeType.JSON);
    } finally {
        lock.releaseLock();
    }
}
