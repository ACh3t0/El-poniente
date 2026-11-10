const fs = require('node:fs');
const path = require('node:path');
const { getConnection, closeConnection } = require('../servicios/databaseLogin.service');
(async()=>{
    try {
        const pool=await getConnection();
        const batches=fs.readFileSync(path.join(__dirname,'../roles-produccion.sql'),'utf8').replace(/^\uFEFF/,'').split(/^\s*GO\s*$/gim).filter(s=>s.trim());
        for(const batch of batches) await pool.request().batch(batch);
        console.log('Migración de roles, compras y producción aplicada.');
        console.log((await pool.request().query('SELECT userName, accountType, isActive FROM dbo.users')).recordset);
    } finally {await closeConnection();}
})().catch(e=>{console.error(e);process.exitCode=1;});
