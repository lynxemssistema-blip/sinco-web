const fs = require('fs');
const path = require('path');

const file = path.join('c:', 'SincoWeb', 'SINCO-WEB', 'SINCO-WEB', 'src', 'server.js');
let content = fs.readFileSync(file, 'utf8');

// I will just look for the mangled block and replace it with the correct sequence of routes.
const searchStr = `
        const [rows] = await pool.execute(sql, params);
        res.json({ success: true, data: rows });

// GET /api/romaneio/:id - Get single romaneio details
app.get('/api/romaneio/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.execute(
            "SELECT * FROM romaneio WHERE idRomaneio = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')",
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Romaneio nÃ¯Â¿Â½o encontrado' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error(\`Error fetching romaneio #\${id}:\`, error);
        res.status(500).json({ success: false, message: 'Erro ao buscar detalhes do romaneio' });
    }
});

    } catch (error) {
        console.error('Error fetching v-itens-projeto-aberto:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar itens disponÃ¯Â¿Â½veis.' });
    }
});`;

const replaceStr = `
        const [rows] = await pool.execute(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching v-itens-projeto-aberto:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar itens disponÃ¯Â¿Â½veis.' });
    }
});

// GET /api/romaneio/:id - Get single romaneio details
app.get('/api/romaneio/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.execute(
            "SELECT * FROM romaneio WHERE idRomaneio = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')",
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Romaneio nÃ¯Â¿Â½o encontrado' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error(\`Error fetching romaneio #\${id}:\`, error);
        res.status(500).json({ success: false, message: 'Erro ao buscar detalhes do romaneio' });
    }
});`;

if(content.includes(searchStr)) {
    content = content.replace(searchStr, replaceStr);
    fs.writeFileSync(file, content);
    console.log("Fixed!");
} else {
    console.log("Could not find mangled string");
}
