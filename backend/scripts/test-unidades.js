const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const validacion = require('../servicios/validacionComercial');

function preparar(actual) {
    const estado = { actual: actual && { ...actual }, commits: 0, rollbacks: 0, updates: 0 };
    function request() {
        const values = {};
        return {
            input(k, t, v) { values[k] = v; return this; },
            async query(sql) {
                if (sql.includes('SELECT i.*')) {
                    assert.match(sql, /UPDLOCK, HOLDLOCK/);
                    for (const table of ['detalleVenta', 'compras', 'produccion']) assert.ok(sql.includes('dbo.' + table));
                    assert.ok(sql.includes('i.existencia <> 0'));
                    return { recordset: estado.actual ? [{ ...estado.actual }] : [] };
                }
                assert.match(sql, /UPDATE dbo.inventario/);
                assert.doesNotMatch(sql, /(?:SET|,)\s*existencia\s*=/);
                estado.updates++;
                return { recordset: [{ ...estado.actual, ...values, existencia: estado.actual.existencia }] };
            }
        };
    }
    class Transaction {
        async begin(level) { assert.equal(level, 'serializable'); }
        request() { return request(); }
        async commit() { estado.commits++; }
        async rollback() { estado.rollbacks++; }
    }
    const context = { module: { exports: {} }, require(name) {
        if (name === './validacionComercial') return validacion;
        if (name === './databaseLogin.service') return {
            sql: { Int: 1, Bit: 1, NVarChar: n => n, VarChar: n => n, Decimal: () => 1, Transaction, ISOLATION_LEVEL: { SERIALIZABLE: 'serializable' } },
            getConnection: async () => ({ request })
        };
        throw new Error(name);
    } };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../servicios/inventario.service.js'), 'utf8'), context);
    return { ...context.module.exports, estado };
}
const original = { productoId: 1, unidad: 'kg', tipo: 'Materia prima', existencia: 10, permiteCambiarUnidadTipo: false };
const datos = { nombre: 'Carbon', unidad: 'kg', tipo: 'Materia prima', precioVenta: 100 };

test('rechaza cambio de unidad con stock sin ejecutar UPDATE', async () => {
    const s = preparar(original);
    await assert.rejects(s.editarProducto(1, { ...datos, unidad: 'pieza' }), e => e.status === 409);
    assert.equal(s.estado.updates, 0);
    assert.equal(s.estado.rollbacks, 1);
});
test('rechaza cambio de unidad con historial aunque el stock sea cero', async () => {
    const s = preparar({ ...original, existencia: 0 });
    await assert.rejects(s.editarProducto(1, { ...datos, unidad: 'litro' }), e => e.status === 409);
    assert.equal(s.estado.updates, 0);
});
test('rechaza cambio de tipo con movimientos', async () => {
    const s = preparar(original);
    await assert.rejects(s.editarProducto(1, { ...datos, tipo: 'Terminado' }), e => e.status === 409);
    assert.equal(s.estado.updates, 0);
});
test('permite editar precio y estado conservando unidad tipo y stock', async () => {
    const s = preparar(original);
    const result = await s.editarProducto(1, { ...datos, precioVenta: 120, isActive: false });
    assert.equal(result.existencia, 10);
    assert.equal(result.precioVenta, 120);
    assert.equal(result.isActive, false);
    assert.equal(s.estado.commits, 1);
});
test('permite cambiar unidad y tipo de un articulo sin uso', async () => {
    const s = preparar({ ...original, existencia: 0, permiteCambiarUnidadTipo: true });
    const result = await s.editarProducto(1, { ...datos, unidad: 'pieza', tipo: 'Terminado' });
    assert.equal(result.unidad, 'pieza');
    assert.equal(result.tipo, 'Terminado');
    assert.equal(s.estado.commits, 1);
});
test('producto inexistente devuelve 404 y no se actualiza', async () => {
    const s = preparar(null);
    await assert.rejects(s.editarProducto(1, datos), e => e.status === 404);
    assert.equal(s.estado.updates, 0);
});
