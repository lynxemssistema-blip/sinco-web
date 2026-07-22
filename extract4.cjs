const fs = require('fs');

const file = 'frontend/src/pages/MontaPecaManufaturada.tsx';
let code = fs.readFileSync(file, 'utf8');

const returnStart = code.indexOf('  return (');
let preReturn = code.substring(0, returnStart);

const startOfGrid1 = code.indexOf('{/* Grid 1: Materiais */}');
const endOfGrid2 = code.lastIndexOf('      )}');

if (startOfGrid1 === -1 || endOfGrid2 === -1) {
    console.error("Could not find grid 1 or end.");
    process.exit(1);
}

let gridContent = code.substring(startOfGrid1, endOfGrid2);
// gridContent ends with:
//            </div>
//          </div>
//        </div>
// Let's strip the last two closing divs, because we are dropping the modal wrapper.
// Actually, the modal wrapper has:
// <div className="fixed inset-0...">
//   <div className="bg-white rounded-xl...">
//     {/* Header */}
//     <div className="flex-1 flex min-h-0 bg-gray-50 p-4 gap-4">
//        {/* Grid 1 ... */}
//        {/* Grid 2 ... */}
//        {/* Grid 3 ... */}
//     </div>
//   </div>
// </div>
// The gridContent starts at `{/* Grid 1: Materiais */}` which is INSIDE the `flex-1 flex min-h-0` div.
// It ends right before `      )}`, which means it includes the closing tag of the `flex-1 flex min-h-0` div AND the modal's `bg-white rounded-xl` div AND the modal's `fixed inset-0` div.
// Wait, no. GridContent starts inside `flex-1 flex min-h-0`.
// Let's just use string replacement carefully.

let newReturn = `  return (
    <div className="flex h-screen bg-gray-50/50">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative bg-gray-50">
        <TopHeader title="Peça Manufaturada" subtitle="Gerenciamento Especializado" />
        
        <div className="flex-1 flex min-h-0 p-4 gap-4">
          ${gridContent.trim()}
  );
}

export default MontaPecaManufaturada;
`;

// wait, gridContent has closing tags that we need to match.
// Instead of guessing, let's just strip everything from `return (` to `{/* Grid 1: Materiais */}`
// and replace it with our new wrapper.

let result = preReturn + `  return (
    <div className="flex h-screen bg-gray-50/50">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative bg-gray-50">
        <TopHeader title="Peça Manufaturada" subtitle="Gerenciamento Especializado" />
        
        <div className="flex-1 flex min-h-0 p-4 gap-4">
          ${gridContent.substring(0, gridContent.lastIndexOf('</div>', gridContent.lastIndexOf('</div>') - 1))}
        </div>
      </div>
    </div>
  );
}
export default MontaPecaManufaturada;
`;

fs.writeFileSync(file, result);
console.log("Success");
