const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, 'src/server.js');
let content = fs.readFileSync(targetFile, 'utf8');

const badBlockRegex = /                PlanejadoInicioENGENHARIA, PlanejadoFinalENGENHARIA, RealizadoInicioENGENHARIA, RealizadoFinalENGENHARIA,[\s\S]*?\} catch \(error\) \{/m;

const goodBlock = `                PlanejadoInicioENGENHARIA, PlanejadoFinalENGENHARIA, RealizadoInicioENGENHARIA, RealizadoFinalENGENHARIA,
                PlanejadoInicioACABAMENTO, PlanejadoFinalACABAMENTO, RealizadoInicioACABAMENTO, RealizadoFinalACABAMENTO,
                EnderecoOrdemServico
            FROM ordemservico 
            WHERE \${whereClause}
            ORDER BY IdOrdemServico DESC
            LIMIT ? OFFSET ?
        \`, [...params, limit, offset]);

        res.json({
            success: true,
            data: rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasMore: page * limit < total
            }
        });
    } catch (error) {`;

if (badBlockRegex.test(content)) {
    content = content.replace(badBlockRegex, goodBlock);
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log("Repaired corrupted ordemservico GET block!");
} else {
    console.error("Could not find the corrupted block in ordemservico GET!");
}
