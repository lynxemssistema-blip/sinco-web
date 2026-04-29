const ExcelJS = require('exceljs');
const path = require('path');

async function studyExcel() {
    const filePath = 'G:\\Meu Drive\\Configurações\\Lynx\\ALBRAS010805REVISOENG_MC521001REV2_BOM_FILLEDHIERARCHICAL_EFU_30-01-2026_15.06.00.xlsx';
    const workbook = new ExcelJS.Workbook();
    try {
        await workbook.xlsx.readFile(filePath);
        console.log('Worksheets:', workbook.worksheets.map(ws => ws.name));
        
        const dataSheet = workbook.getWorksheet('data');
        if (!dataSheet) {
            console.log('Sheet "data" not found!');
            // Fallback to active or first sheet if needed, but user specifically mentioned "data" tab
            return;
        }

        console.log('Sheet "data" header (first row):');
        const firstRow = dataSheet.getRow(1);
        const headers = [];
        firstRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            headers.push({ col: colNumber, val: cell.value });
        });
        console.log(JSON.stringify(headers, null, 2));

        console.log('\nSample data (first 5 rows after header):');
        for (let i = 2; i <= 6; i++) {
            const row = dataSheet.getRow(i);
            const rowData = [];
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                rowData.push({ col: colNumber, val: cell.value });
            });
            console.log(`Row ${i}:`, JSON.stringify(rowData));
        }
    } catch (err) {
        console.error('Error reading excel:', err);
    }
}

studyExcel();
