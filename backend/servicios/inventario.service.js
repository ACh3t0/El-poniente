const { sql, getConnection } = require("./databaseLogin.service");
const { exigir, idValido, decimalValido } = require("./validacionComercial");

async function listarInventario() {
    const pool = await getConnection();
    return (await pool.request().query("SELECT * FROM dbo.inventario ORDER BY nombre, productoId")).recordset.map(p => ({ ...p, productoId: Number(p.productoId) }));
}

async function obtenerProducto(productoId) {
    exigir(idValido(productoId), "Producto no válido.");
    const pool = await getConnection();
    const resultado = await pool.request().input("productoId", sql.Int, productoId)
        .query("SELECT * FROM dbo.inventario WHERE productoId = @productoId");
    exigir(resultado.recordset.length, "Producto no encontrado.", 404);
    return { ...resultado.recordset[0], productoId: Number(resultado.recordset[0].productoId) };
}

// Crear admite existencias iniciales; editar actualiza todos los campos del producto.
async function guardarProducto(datos, productoId = null) {
    exigir(datos && typeof datos === "object", "Envía los datos del producto.");
    const { nombre, descripcion = null, unidad = "pieza", existencia = 0,
        stockMinimo = 0, precioVenta, tipo = "Terminado", isActive = true } = datos;
    exigir(typeof nombre === "string" && nombre.trim().length > 0 && nombre.trim().length <= 100,
        "El nombre debe tener entre 1 y 100 caracteres.");
    exigir(descripcion === null || (typeof descripcion === "string" && descripcion.length <= 255),
        "La descripción debe tener hasta 255 caracteres.");
    exigir(typeof unidad === "string" && unidad.trim().length > 0 && unidad.trim().length <= 20,
        "La unidad debe tener entre 1 y 20 caracteres.");
    exigir(decimalValido(existencia, 3) && decimalValido(stockMinimo, 3) && decimalValido(precioVenta, 2),
        "Revisa existencias, stock mínimo y precio: deben ser números no negativos, con hasta 3 decimales para cantidades y 2 para precios.");
    exigir(["Terminado", "Materia prima"].includes(tipo), "Tipo de inventario no válido.");
    exigir(typeof isActive === "boolean", "El estado debe ser verdadero o falso.");
    exigir(productoId === null || idValido(productoId), "Producto no válido.");
    const pool = await getConnection();
    const peticion = pool.request()
        .input("nombre", sql.NVarChar(100), nombre.trim())
        .input("descripcion", sql.NVarChar(255), descripcion)
        .input("unidad", sql.NVarChar(20), unidad.trim())
        .input("existencia", sql.Decimal(12, 3), existencia)
        .input("stockMinimo", sql.Decimal(12, 3), stockMinimo)
        .input("precioVenta", sql.Decimal(12, 2), precioVenta)
        .input("tipo", sql.VarChar(20), tipo)
        .input("isActive", sql.Bit, isActive);
    let resultado;
    if (productoId === null) {
        resultado = await peticion.query(`
            INSERT INTO dbo.inventario (nombre, descripcion, unidad, existencia, stockMinimo, precioVenta, tipo, isActive)
            OUTPUT INSERTED.*
            VALUES (@nombre, @descripcion, @unidad, @existencia, @stockMinimo, @precioVenta, @tipo, @isActive)
        `);
    } else {
        resultado = await peticion.input("productoId", sql.Int, productoId).query(`
            UPDATE dbo.inventario
            SET nombre=@nombre, descripcion=@descripcion, unidad=@unidad,
                stockMinimo=@stockMinimo, precioVenta=@precioVenta, tipo=@tipo, isActive=@isActive
            OUTPUT INSERTED.* WHERE productoId=@productoId
        `);
        exigir(resultado.recordset.length, "Producto no encontrado.", 404);
    }
    return { ...resultado.recordset[0], productoId: Number(resultado.recordset[0].productoId) };
}

async function agregarExistencia(productoId, cantidad) {
    exigir(idValido(productoId), "Producto no válido.");
    exigir(decimalValido(cantidad, 3) && cantidad > 0,
        "La cantidad a agregar debe ser un número positivo de hasta 3 decimales.");
    const pool = await getConnection();
    const resultado = await pool.request()
        .input("productoId", sql.Int, productoId)
        .input("cantidad", sql.Decimal(12, 3), cantidad)
        .query(`
            UPDATE dbo.inventario
            SET existencia = existencia + @cantidad
            OUTPUT INSERTED.*
            WHERE productoId = @productoId
        `);
    exigir(resultado.recordset.length, "Producto no encontrado.", 404);
    return { ...resultado.recordset[0], productoId: Number(resultado.recordset[0].productoId) };
}

async function eliminarProducto(productoId) {
    exigir(idValido(productoId), "Producto no válido.");
    const pool = await getConnection();
    const movimientos = await pool.request().input("productoId", sql.Int, productoId).query(`
        SELECT CASE WHEN
            EXISTS (SELECT 1 FROM dbo.detalleVenta WHERE productoId = @productoId)
            OR EXISTS (SELECT 1 FROM dbo.compras WHERE productoId = @productoId)
            OR EXISTS (SELECT 1 FROM dbo.produccion WHERE materiaPrimaId = @productoId OR productoId = @productoId)
        THEN 1 ELSE 0 END AS tieneMovimientos
    `);
    exigir(!movimientos.recordset[0].tieneMovimientos,
        "Este producto tiene ventas, compras o producción registradas y no se puede eliminar. Para retirarlo de la venta, entra en Editar, desmarca Activo y guarda.", 409);
    let resultado;
    try {
        resultado = await pool.request().input("productoId", sql.Int, productoId)
            .query("DELETE FROM dbo.inventario OUTPUT DELETED.productoId WHERE productoId = @productoId");
    } catch (error) {
        const errores = [error, ...(error.precedingErrors || [])];
        if (errores.some(e => e.number === 547 || e.originalError?.info?.number === 547 || e.originalError?.code === 547)) {
            exigir(false, "Este producto tiene movimientos registrados y no se puede eliminar. Puedes desactivarlo desde Editar.", 409);
        }
        throw error;
    }
    exigir(resultado.recordset.length, "Producto no encontrado.", 404);
    return { productoId, mensaje: "Producto eliminado." };
}

module.exports = {
    eliminarProducto,
    listarInventario, obtenerProducto,
    crearProducto: datos => guardarProducto(datos),
    editarProducto: (id, datos) => guardarProducto(datos, id),
    agregarExistencia
};
