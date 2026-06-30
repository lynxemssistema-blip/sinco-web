const fs = require('fs');

let code = fs.readFileSync('frontend/src/pages/Motorista.tsx', 'utf8');

// Helper function to check if date is expiring within 30 days
const isExpiringCode = `
  const isCNHExpiring = (dateString?: string) => {
    if (!dateString) return false;
    const expiration = new Date(dateString + 'T12:00:00');
    const now = new Date();
    const diffTime = expiration.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  };
`;

// Insert the helper function before the component
code = code.replace(
  'const emptyForm: Motorista = {',
  isExpiringCode + '\nconst emptyForm: Motorista = {'
);

// Update input logic to highlight
code = code.replace(
  '<input\n type="date"\n name="DataVencimentoCNH"\n value={formData.DataVencimentoCNH || \'\'}\n onChange={handleInputChange}\n className={inputOptional}\n />',
  '<input\n type="date"\n name="DataVencimentoCNH"\n value={formData.DataVencimentoCNH || \'\'}\n onChange={handleInputChange}\n className={`${inputOptional} ${isCNHExpiring(formData.DataVencimentoCNH) ? \'border-red-500 bg-red-50 text-red-700\' : \'\'}`}\n />'
);

// Update table cell logic to highlight
code = code.replace(
  '{motorista.DataVencimentoCNH ? new Date(motorista.DataVencimentoCNH + \'T12:00:00\').toLocaleDateString(\'pt-BR\') : \'-\'}\n </td>',
  '<span className={isCNHExpiring(motorista.DataVencimentoCNH) ? \'px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-600\' : \'\'}>\n {motorista.DataVencimentoCNH ? new Date(motorista.DataVencimentoCNH + \'T12:00:00\').toLocaleDateString(\'pt-BR\') : \'-\'}\n </span>\n </td>'
);

fs.writeFileSync('frontend/src/pages/Motorista.tsx', code);
console.log('Applied frontend logic for highlighting expiring CNH');
