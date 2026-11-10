const router = require('express').Router();
const { requireLogin, requireRole, ADMIN, PRODUCCION, EMPLEADO } = require('../middleware/auth');
const inventario = require('../servicios/inventario.service');
const ventas = require('../servicios/ventas.service');
const produccion = require('../servicios/produccion.service');
function responder(operacion, status=200) {
    return async(req,res)=>{ try { res.status(status).json(await operacion(req)); }
        catch(error){ const conocido=[400,403,404,409].includes(error.status);
            if(!conocido) console.error('Error comercial:',error.message);
            res.status(conocido?error.status:500).json({mensaje:conocido?error.message:'No se pudo completar la operación.'}); }
    };
}
const admin = requireRole(ADMIN), venta = requireRole(ADMIN,EMPLEADO), producir = requireRole(ADMIN,PRODUCCION);
const propietario = req => req.session.user.accountType===ADMIN ? null : req.session.user.userId;
router.use(requireLogin);
router.delete('/usuarios/:id',admin,responder(req=>require('../servicios/usuarios.service').deleteUser(Number(req.params.id),req.session.user.userId)));
router.get('/reportes',admin,responder(()=>require('../servicios/reportes.service').obtenerReporte()));
router.get('/inventario',responder(async req=>{
    const datos=await inventario.listarInventario();
    return req.session.user.accountType===EMPLEADO ? datos.filter(p=>p.isActive && p.tipo==='Terminado') : datos;
}));
router.get('/inventario/:id',responder(async req=>{
    const producto=await inventario.obtenerProducto(Number(req.params.id));
    if(req.session.user.accountType===EMPLEADO && (!producto.isActive || producto.tipo!=='Terminado'))
        throw Object.assign(new Error('Producto no disponible.'),{status:404});
    return producto;
}));
router.post('/inventario',admin,responder(req=>inventario.crearProducto(req.body),201));
router.put('/inventario/:id',admin,responder(req=>inventario.editarProducto(Number(req.params.id),req.body)));
router.delete('/inventario/:id',admin,responder(req=>inventario.eliminarProducto(Number(req.params.id))));
router.patch('/inventario/:id/existencia',admin,responder(req=>inventario.agregarExistencia(Number(req.params.id),req.body?.cantidad)));
router.get('/pedidos',venta,responder(req=>ventas.listarPedidos(req.query.estado,propietario(req))));
router.patch('/pedidos/:id/completar',venta,responder(req=>ventas.completarPedido(Number(req.params.id),propietario(req))));
router.get('/ventas',venta,responder(req=>ventas.listarVentas(propietario(req))));
router.get('/ventas/:id',venta,responder(req=>ventas.obtenerVenta(Number(req.params.id),propietario(req))));
router.post('/ventas',venta,responder(req=>ventas.registrarVenta(req.session.user.userId,req.body),201));
router.get('/compras',admin,responder(()=>produccion.listarCompras()));
router.post('/compras',admin,responder(req=>produccion.registrarCompra(req.session.user.userId,req.body),201));
router.get('/produccion',producir,responder(()=>produccion.listarProduccion()));
router.post('/produccion',producir,responder(req=>produccion.registrarProduccion(req.session.user.userId,req.body),201));
module.exports=router;
