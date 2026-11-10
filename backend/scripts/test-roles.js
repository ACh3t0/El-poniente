const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { once } = require('node:events');
const { sql, getConnection, closeConnection } = require('../servicios/databaseLogin.service');
const { registerUser } = require('../servicios/register.service');
const app = require('../index');
(async()=>{
    const prefix='roles_'+randomBytes(5).toString('hex');
    const password=randomBytes(20).toString('hex');
    const pool=await getConnection();
    const server=app.listen(0,'127.0.0.1'); await once(server,'listening');
    const base='http://127.0.0.1:'+server.address().port;
    let materia,producto;
    const request=async(cookie,method,route,datos)=>{
        const r=await fetch(base+route,{method,redirect:'manual',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(datos?{body:JSON.stringify(datos)}:{})});
        const text=await r.text();let body;try{body=JSON.parse(text)}catch{body=text}
        return {status:r.status,body,headers:r.headers};
    };
    const expect=async(cookie,method,route,datos,status=200)=>{
        const r=await request(cookie,method,route,datos);assert.equal(r.status,status,`${method} ${route}: ${JSON.stringify(r.body)}`);return r;
    };
    try{
        const cookies={};
        for(const [name,rol] of [['admin',2],['produccion',3],['vendedor',1],['otro',1]]){
            await registerUser(prefix+'_'+name,password,rol);
            const r=await expect(null,'POST','/api/login',{usuario:prefix+'_'+name,password,accountType:rol});
            cookies[name]=r.headers.get('set-cookie').split(';')[0];
            assert.equal(r.body.tipoCuenta,rol);
        }
        for(const role of ['vendedor','produccion']){
            for(const route of ['/api/usuarios','/api/reportes','/api/compras'])await expect(cookies[role],'GET',route,null,403);
            await expect(cookies[role],'POST','/api/inventario',{},403);
            await expect(cookies[role],'PATCH','/api/inventario/1/existencia',{cantidad:1},403);
            await expect(cookies[role],'POST','/api/usuarios',{},403);
        }
        await expect(cookies.produccion,'GET','/api/ventas',null,403);
        await expect(cookies.produccion,'POST','/api/ventas',{},403);
        await expect(cookies.vendedor,'GET','/api/produccion',null,403);
        await expect(cookies.vendedor,'POST','/api/produccion',{},403);
        await expect(cookies.vendedor,'GET','/pages/usuarios.html',null,302);
        await expect(cookies.produccion,'GET','/pages/ventas.html',null,302);
        for(const role of ['admin','produccion'])await expect(cookies[role],'GET','/pages/produccion.html');
        for(const route of ['/pages/compras.html','/pages/productos.html','/pages/usuarios.html','/pages/reportes.html'])await expect(cookies.admin,'GET',route);
        const crear=async(nombre,tipo)=> (await expect(cookies.admin,'POST','/api/inventario',{nombre:prefix+nombre,tipo,unidad:'kg',precioVenta:100},201)).body;
        materia=await crear('_materia','Materia prima');producto=await crear('_terminado','Terminado');
        await expect(cookies.admin,'POST','/api/compras',{productoId:materia.productoId,proveedor:prefix,cantidad:10,costoTotal:500},201);
        const lote={materiaPrimaId:materia.productoId,productoId:producto.productoId,cantidadUtilizada:5,cantidadObtenida:4,merma:1,observaciones:prefix};
        await expect(cookies.produccion,'POST','/api/produccion',lote,201);
        await expect(cookies.produccion,'POST','/api/produccion',{...lote,cantidadUtilizada:20,cantidadObtenida:19},409);
        await expect(cookies.produccion,'POST','/api/produccion',{...lote,cantidadObtenida:5},400);
        const consultar=async(id)=>(await expect(cookies.admin,'GET','/api/inventario/'+id)).body;
        assert.equal(Number((await consultar(materia.productoId)).existencia),5);
        assert.equal(Number((await consultar(producto.productoId)).existencia),4);
        const disponibles=(await expect(cookies.vendedor,'GET','/api/inventario')).body;
        assert.ok(!disponibles.some(p=>p.tipo==='Materia prima'));
        await expect(cookies.vendedor,'GET','/api/inventario/'+materia.productoId,null,404);
        const venta=(await expect(cookies.vendedor,'POST','/api/ventas',{metodoPago:'Efectivo',detalles:[{productoId:producto.productoId,cantidad:1.5}]},201)).body;
        assert.equal(Number((await consultar(producto.productoId)).existencia),2.5);
        await expect(cookies.vendedor,'POST','/api/ventas',{metodoPago:'Efectivo',detalles:[{productoId:materia.productoId,cantidad:1}]},409);
        assert.ok((await expect(cookies.vendedor,'GET','/api/ventas')).body.some(v=>v.ventaId===venta.ventaId));
        assert.ok(!(await expect(cookies.otro,'GET','/api/ventas')).body.some(v=>v.ventaId===venta.ventaId));
        await expect(cookies.otro,'GET','/api/ventas/'+venta.ventaId,null,404);
        await expect(cookies.otro,'PATCH','/api/pedidos/'+venta.ventaId+'/completar',{},409);
        const users=(await expect(cookies.admin,'GET','/api/usuarios')).body;
        const encargado=users.find(u=>u.userName===prefix+'_produccion');
        await expect(cookies.admin,'PUT','/api/usuarios/'+encargado.userId,{usuario:encargado.userName,accountType:3});
        await expect(cookies.admin,'PATCH','/api/usuarios/'+encargado.userId+'/estado',{activo:false});
        await expect(cookies.produccion,'GET','/api/produccion',null,401);
        console.log('OK: tres roles; permisos de API y pantallas; compras; stock y mermas; rollback; venta fraccionada; historial privado; gestión y desactivación de usuarios.');
    } finally {
        // Remove only this test's data, respecting foreign keys.
        await pool.request().input('prefijo',sql.VarChar(60),prefix+'%').query(`
            DELETE d FROM dbo.detalleVenta d JOIN dbo.ventas v ON v.ventaId=d.ventaId JOIN dbo.users u ON u.userId=v.userId WHERE u.userName LIKE @prefijo;
            DELETE v FROM dbo.ventas v JOIN dbo.users u ON u.userId=v.userId WHERE u.userName LIKE @prefijo;
            DELETE p FROM dbo.produccion p JOIN dbo.users u ON u.userId=p.userId WHERE u.userName LIKE @prefijo;
            DELETE c FROM dbo.compras c JOIN dbo.users u ON u.userId=c.userId WHERE u.userName LIKE @prefijo;
            DELETE FROM dbo.inventario WHERE nombre LIKE @prefijo;
            DELETE FROM dbo.users WHERE userName LIKE @prefijo;
        `);
        await new Promise(resolve=>server.close(resolve));await closeConnection();
        console.log('Datos temporales eliminados.');
    }
})().catch(e=>{console.error(e);process.exitCode=1;});
