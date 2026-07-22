const fs = require('fs');

const file = 'frontend/src/pages/MontaPecaManufaturada.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace the whole return block manually using standard search strings.

const returnStart = code.indexOf('  return (');
let preReturn = code.substring(0, returnStart);

const startOfGrid1 = code.indexOf('{/* Grid 1: Materiais */}');
const endOfGrid2 = code.lastIndexOf('      )}\n    </div>\n  );\n}');

if (startOfGrid1 === -1 || endOfGrid2 === -1) {
    console.error("Could not find grid 1 or end.");
    process.exit(1);
}

const gridContent = code.substring(startOfGrid1, endOfGrid2);

// Let's clean up gridContent. It ends with:
//           </div>
//         </div>
// It has 2 closing divs at the end of `endOfGrid2`.

// Wait, let's just do a regex that replaces everything between `<TopHeader.../>` and `{/* Grid 1: Materiais */}`

let newReturn = `  return (
    <div className="flex h-screen bg-gray-50/50">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative bg-gray-50">
        <TopHeader title="Peça Manufaturada" subtitle="Gerenciamento Especializado" />
        
        <div className="flex-1 flex min-h-0 p-4 gap-4">
          ${gridContent}
    </div>
  );
}

export default MontaPecaManufaturada;
`;

fs.writeFileSync(file, preReturn + newReturn);
console.log("Success");
