const mysql = require('mysql2/promise');
require('dotenv').config();
const http = require('http');

function fetchParams(path) {
    return new Promise((resolve, reject) => {
        http.get({
            hostname: 'localhost',
            port: 3000,
            path: path,
            agent: false
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, json: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, json: null, raw: data });
                }
            });
        }).on('error', reject);
    });
}

async function debugRomaneio() {
    console.log('--- DEBUGGING ROMANEIO ---');

    // 1. Check Database Content
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        console.log('[DB] Connecting to database...');
        const [rows] = await pool.execute("SELECT * FROM romaneio");
        console.log(`[DB] Romaneio Table Count: ${rows.length}`);
        await pool.end();

    } catch (err) {
        console.error('[DB] Error:', err.message);
    }

    // 2. Check API Endpoint
    try {
        console.log('\n[API] Fetching from http://localhost:3000/api/pj...');
        const resultPj = await fetchParams('/api/pj');
        console.log('[API-PJ] Status:', resultPj.status);
        if (resultPj.json) console.log('[API-PJ] Success:', resultPj.json.success);

        console.log('\n[API] GET from http://localhost:3000/api/romaneio...');
        const resultGet = await fetchParams('/api/romaneio');
        console.log('[API-GET] Status:', resultGet.status);
        if (resultGet.json) {
            console.log('[API-GET] Success:', resultGet.json.success);
            console.log('[API-GET] Data Length:', resultGet.json.data ? resultGet.json.data.length : 'N/A');
        } else {
            console.log('[API-GET] Raw:', resultGet.raw.substring(0, 50));
        }

        console.log('\n[API] POST to http://localhost:3000/api/romaneio...');
        const postData = JSON.stringify({ descricao: 'DEBUG TEST', enviarPara: 'TEST' });
        const resultPost = await new Promise((resolve, reject) => {
            const req = http.request({
                hostname: 'localhost',
                port: 3000,
                path: '/api/romaneio',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': postData.length
                }
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        resolve({ status: res.statusCode, json: JSON.parse(data) });
                    } catch (e) {
                        resolve({ status: res.statusCode, json: null, raw: data });
                    }
                });
            });
            req.on('error', reject);
            req.write(postData);
            req.end();
        });
        console.log('[API-POST] Status:', resultPost.status);
        if (resultPost.json) {
            console.log('[API-POST] Success:', resultPost.json.success);
            console.log('[API-POST] ID:', resultPost.json.id);
        } else {
            console.log('[API-POST] Raw:', resultPost.raw ? resultPost.raw.substring(0, 50) : 'No Data');
        }

    } catch (err) {
        console.error('[API] Error:', err.message);
    }
}

debugRomaneio();
