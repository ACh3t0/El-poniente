const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

// Simula transacciones con bloqueo exclusivo sin tocar SQL Server.
function preparar(usuarios = []) {
    const rows = [...usuarios];
    let tail = Promise.resolve();
    class Transaction {
        async begin() {}
        async lock() {
            const previous = tail;
            tail = new Promise(resolve => { this.release = resolve; });
            await previous;
        }
        async commit() { this.release?.(); }
        async rollback() { this.release?.(); }
    }
    class Request {
        constructor(tx) { this.tx = tx; this.values = {}; }
        input(name, type, value) { this.values[name] = value; return this; }
        async query(text) {
            if (text.includes('TABLOCKX')) {
                assert.match(text, /HOLDLOCK/);
                await this.tx.lock();
            }
            if (text.includes('COUNT(*)')) return { recordset: [{ total: rows.length }] };
            if (text.includes('SELECT userId')) return { recordset: rows.filter(r => r.usuario === this.values.usuario) };
            if (text.includes('INSERT INTO')) { rows.push({ ...this.values }); return {}; }
            throw new Error('Consulta inesperada');
        }
    }
    const context = { module: { exports: {} }, require(name) {
        if (name === './password.service') return { hashPassword: async p => 'hash:' + p };
        if (name === './databaseLogin.service') return {
            sql: { Transaction, Request, ISOLATION_LEVEL: { SERIALIZABLE: 4 }, VarChar: n => n, TinyInt: 1 },
            getConnection: async () => ({ request: () => new Request() })
        };
        throw new Error(name);
    } };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../servicios/register.service.js'), 'utf8'), context);
    return { ...context.module.exports, rows };
}
test('base vacia requiere configuracion y el primer administrador la cierra', async () => {
    const s = preparar();
    assert.equal(await s.necesitaConfiguracion(), true);
    await s.registerUser('admin', 'clave-segura', 2, 'inicial');
    assert.equal(await s.necesitaConfiguracion(), false);
    assert.equal(s.rows[0].accountType, 2);
    assert.equal(s.rows[0].password, 'hash:clave-segura');
    await assert.rejects(s.registerUser('otro', 'clave-segura', 2, 'inicial'), e => e.status === 409);
});
test('dos solicitudes simultaneas crean un solo administrador inicial', async () => {
    const s = preparar();
    const resultados = await Promise.allSettled([
        s.registerUser('uno', 'clave-segura', 2, 'inicial'),
        s.registerUser('dos', 'clave-segura', 2, 'inicial')
    ]);
    assert.equal(resultados.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(resultados.find(r => r.status === 'rejected').reason.status, 409);
    assert.equal(s.rows.length, 1);
});
test('el registro publico espera al administrador y funciona despues', async () => {
    const s = preparar();
    await assert.rejects(s.registerUser('vendedor', 'clave-segura', 1, 'publico'), e => e.code === 'SETUP_REQUIRED');
    assert.equal(s.rows.length, 0);
    await s.registerUser('admin', 'clave-segura', 2, 'inicial');
    await s.registerUser('vendedor', 'clave-segura', 1, 'publico');
    assert.equal(s.rows.length, 2);
});
test('una instalacion con usuarios existentes no reabre la configuracion', async () => {
    const s = preparar([{ usuario: 'existente', accountType: 1 }]);
    assert.equal(await s.necesitaConfiguracion(), false);
    await assert.rejects(s.registerUser('admin', 'clave-segura', 2, 'inicial'), e => e.status === 409);
});
