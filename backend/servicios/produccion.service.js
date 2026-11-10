const { sql, getConnection } = require('./databaseLogin.service');
const { exigir, idValido, decimalValido } = require('./validacionComercial');
async function transaccion(operacion) {
    const tx = new sql.Transaction(await getConnection());
    await tx.begin();
    try { const resultado = await operacion(tx); await tx.commit(); return resultado; }
    catch (error) { await tx.rollback().catch(() => {}); throw error; }
}
async function listarCompras() {
    const pool = await getConnection();
    return (await pool.request().query(`SELECT c.*, i.nombre, i.unidad, u.userName FROM dbo.compras c
        JOIN dbo.inventario i ON i.productoId=c.productoId JOIN dbo.users u ON u.userId=c.userId ORDER BY c.compraId DESC`)).recordset;
}
async function registrarCompra(userId, datos) {
    const { productoId, proveedor, cantidad, costoTotal } = datos || {};
    exigir(idValido(productoId) && typeof proveedor === 'string' && proveedor.trim() && proveedor.trim().length <= 150,
        'Selecciona la materia prima e indica el proveedor (hasta 150 caracteres).');
    exigir(decimalValido(cantidad, 3) && cantidad > 0 && decimalValido(costoTotal, 2), 'Revisa la cantidad y el costo total.');
    return transaccion(async tx => {
        const stock = await tx.request().input('id', sql.Int, productoId).input('cantidad', sql.Decimal(12,3), cantidad)
            .query(`UPDATE dbo.inventario SET existencia=existencia+@cantidad OUTPUT INSERTED.productoId
                WHERE productoId=@id AND tipo='Materia prima' AND isActive=1`);
        exigir(stock.recordset.length, 'Materia prima no disponible.', 409);
        return (await tx.request().input('id', sql.Int, productoId).input('userId', sql.Int, userId)
            .input('proveedor', sql.NVarChar(150), proveedor.trim()).input('cantidad', sql.Decimal(12,3), cantidad)
            .input('costo', sql.Decimal(12,2), costoTotal).query(`INSERT dbo.compras(userId,productoId,proveedor,cantidad,costoTotal)
                OUTPUT INSERTED.* VALUES (@userId,@id,@proveedor,@cantidad,@costo)`)).recordset[0];
    });
}
async function listarProduccion() {
    const pool = await getConnection();
    return (await pool.request().query(`SELECT p.*, m.nombre AS materiaPrima, m.unidad AS unidadMateria,
        i.nombre AS producto, i.unidad AS unidadProducto, u.userName FROM dbo.produccion p
        JOIN dbo.inventario m ON m.productoId=p.materiaPrimaId JOIN dbo.inventario i ON i.productoId=p.productoId
        JOIN dbo.users u ON u.userId=p.userId ORDER BY p.produccionId DESC`)).recordset;
}
async function registrarProduccion(userId, datos) {
    const { materiaPrimaId, productoId, cantidadUtilizada, cantidadObtenida, merma, observaciones = '' } = datos || {};
    exigir(idValido(materiaPrimaId) && idValido(productoId) && materiaPrimaId !== productoId, 'Selecciona una materia prima y un producto terminado distintos.');
    exigir(decimalValido(cantidadUtilizada,3) && cantidadUtilizada>0 && decimalValido(cantidadObtenida,3) && cantidadObtenida>0 &&
        decimalValido(merma,3) && merma<cantidadUtilizada, 'Revisa cantidades y merma: debe ser menor que la materia prima utilizada.');
    exigir(typeof observaciones === 'string' && observaciones.length<=255, 'Las observaciones deben tener hasta 255 caracteres.');
    return transaccion(async tx => {
        // Lock both rows in a stable order to avoid conflicting concurrent stock updates.
        const productos = (await tx.request().input('materia',sql.Int,materiaPrimaId).input('producto',sql.Int,productoId)
            .query(`SELECT * FROM dbo.inventario WITH (UPDLOCK,HOLDLOCK) WHERE productoId IN (@materia,@producto) ORDER BY productoId`)).recordset;
        const materia=productos.find(p=>Number(p.productoId)===materiaPrimaId), producto=productos.find(p=>Number(p.productoId)===productoId);
        exigir(materia?.isActive && materia.tipo==='Materia prima' && producto?.isActive && producto.tipo==='Terminado', 'Revisa los productos seleccionados.',409);
        exigir(Number(materia.existencia)>=cantidadUtilizada,'No hay suficiente materia prima.',409);
        if (materia.unidad.toLowerCase()===producto.unidad.toLowerCase()) {
            exigir(Math.abs(cantidadUtilizada-cantidadObtenida-merma)<0.0005, 'Con la misma unidad, la cantidad utilizada debe ser igual al producto obtenido más la merma.');
        }
        await tx.request().input('materia',sql.Int,materiaPrimaId).input('producto',sql.Int,productoId)
            .input('usada',sql.Decimal(12,3),cantidadUtilizada).input('obtenida',sql.Decimal(12,3),cantidadObtenida)
            .query(`UPDATE dbo.inventario SET existencia=existencia-@usada WHERE productoId=@materia;
                UPDATE dbo.inventario SET existencia=existencia+@obtenida WHERE productoId=@producto;`);
        return (await tx.request().input('materia',sql.Int,materiaPrimaId).input('producto',sql.Int,productoId)
            .input('userId',sql.Int,userId).input('usada',sql.Decimal(12,3),cantidadUtilizada)
            .input('obtenida',sql.Decimal(12,3),cantidadObtenida).input('merma',sql.Decimal(12,3),merma)
            .input('notas',sql.NVarChar(255),observaciones).query(`INSERT dbo.produccion(userId,materiaPrimaId,productoId,cantidadUtilizada,cantidadObtenida,merma,observaciones)
                OUTPUT INSERTED.* VALUES (@userId,@materia,@producto,@usada,@obtenida,@merma,@notas)`)).recordset[0];
    });
}
module.exports = { listarCompras, registrarCompra, listarProduccion, registrarProduccion };
