const fs = require('fs');
const p = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/MontaPecaManufaturada.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  '<th className={colsCls}>Esp.</th>\n                        <th className={colsCls}>Mat.SW</th>\n                        <th className={colsCls}>Tipo</th>\n                      </tr>\n                    </thead>\n                    <tbody',
  '<th className={colsCls}>Esp.</th>\n                        <th className={colsCls}>Mat.SW</th>\n                        <th className={colsCls}>Tipo</th>\n                        <th className={`${colsCls} text-center`}>QTD.</th>\n                      </tr>\n                    </thead>\n                    <tbody'
);

fs.writeFileSync(p, c);
console.log('Fixed Grid 2 QTD header');
