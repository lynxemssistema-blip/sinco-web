const fs = require('fs');
const file = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/TesteFinalMontagem.tsx';
let content = fs.readFileSync(file, 'utf8');

const modalTarget = `function LancarModal({ item, onClose, onSuccess }: LancarModalProps) {
  const execar = Number(item.MontagemTotalExecutar) || 0;
  const exec = Number(item.MontagemTotalExecutado) || 0;
  const [qtde, setQtde] = useState<string>(String(execar || item.QtdeTotal));`;

const modalReplace = `function LancarModal({ item, onClose, onSuccess }: LancarModalProps) {
  const exec = Number(item.MontagemTotalExecutado) || 0;
  const qtdeTotal = Number(item.QtdeTotal) || 0;
  const aExecutarCalc = Math.max(0, qtdeTotal - exec);
  const [qtde, setQtde] = useState<string>(String(aExecutarCalc));`;

const modalTarget2 = `  const podeConfirmar = qtdeNum > 0 && qtdeNum <= item.QtdeTotal;

  const handleClick = () => {
    setErro('');
    if (!podeConfirmar) { setErro('Valor inválido. Deve ser > 0 e ≤ ' + item.QtdeTotal); return; }`;

const modalReplace2 = `  const podeConfirmar = qtdeNum > 0 && qtdeNum <= aExecutarCalc;

  const handleClick = () => {
    setErro('');
    if (!podeConfirmar) { setErro('Valor inválido. Deve ser > 0 e ≤ ' + aExecutarCalc); return; }`;

const gridTarget = `  <td className="px-2 py-0.5 text-right font-semibold text-amber-700">{item.MontagemTotalExecutar ?? '—'}</td>`;
const gridReplace = `  <td className="px-2 py-0.5 text-right font-semibold text-amber-700">{Math.max(0, Number(item.QtdeTotal) - (Number(item.MontagemTotalExecutado) || 0))}</td>`;

const headerTarget = `          <span className="font-bold text-slate-800">{item.MontagemTotalExecutar}</span>
        </div>`;
const headerReplace = `          <span className="font-bold text-slate-800">{aExecutarCalc}</span>
        </div>`;

content = content.replace(modalTarget, modalReplace);
content = content.replace(modalTarget2, modalReplace2);
content = content.replace(gridTarget, gridReplace);
content = content.replace(headerTarget, headerReplace);

fs.writeFileSync(file, content);
console.log('Fixed TesteFinalMontagem');
