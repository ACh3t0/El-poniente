import { protegerPagina } from '../services/sesion.js';
import { pedir } from '../services/api.service.js';
const $=id=>document.getElementById(id);
const esCompra=location.pathname.endsWith('compras.html');
const ruta=esCompra?'/api/compras':'/api/produccion';
function aviso(texto,error=false){$('mensaje').hidden=false;$('mensaje').textContent=texto;$('mensaje').className=error?'error':'';}
function opciones(id,productos){
    const select=$(id);select.replaceChildren();
    const inicial=document.createElement('option');inicial.value='';inicial.textContent='Selecciona un producto';select.append(inicial);
    for(const p of productos){const o=document.createElement('option');o.value=p.productoId;o.textContent=`${p.nombre} (${p.existencia} ${p.unidad})`;select.append(o);}
}
async function cargar(){
    const [productos,historial]=await Promise.all([pedir('/api/inventario'),pedir(ruta)]);
    opciones('materia',productos.filter(p=>p.isActive&&p.tipo==='Materia prima'));
    if(!esCompra)opciones('producto',productos.filter(p=>p.isActive&&p.tipo==='Terminado'));
    $('historial').replaceChildren();
    for(const r of historial){
        const fila=document.createElement('tr');
        const datos=esCompra?[r.compraId,new Date(r.fecha).toLocaleString('es-MX'),r.proveedor,r.nombre,`${r.cantidad} ${r.unidad}`,`$${Number(r.costoTotal).toFixed(2)}`,r.userName]:
            [r.produccionId,new Date(r.fecha).toLocaleString('es-MX'),`${r.materiaPrima}: ${r.cantidadUtilizada} ${r.unidadMateria}`,`${r.producto}: ${r.cantidadObtenida} ${r.unidadProducto}`,`${r.merma} ${r.unidadMateria}`,r.userName,r.observaciones];
        for(const dato of datos){const td=document.createElement('td');td.textContent=dato;fila.append(td);}$('historial').append(fila);
    }
    if(!historial.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=7;td.textContent='Todavía no hay registros.';tr.append(td);$('historial').append(tr);}
}
$('operacion').addEventListener('submit',async e=>{
    e.preventDefault();const boton=e.submitter;boton.disabled=true;
    const datos=esCompra?{productoId:Number($('materia').value),proveedor:$('proveedor').value,cantidad:Number($('cantidad').value),costoTotal:Number($('costo').value)}:
        {materiaPrimaId:Number($('materia').value),productoId:Number($('producto').value),cantidadUtilizada:Number($('utilizada').value),cantidadObtenida:Number($('obtenida').value),merma:Number($('merma').value),observaciones:$('observaciones').value};
    try{await pedir(ruta,{method:'POST',body:JSON.stringify(datos)});$('operacion').reset();await cargar();aviso('Registro guardado. Las existencias se actualizaron.');}
    catch(error){aviso(error.message,true);}finally{boton.disabled=false;}
});
if(await protegerPagina()){try{await cargar();}catch(e){aviso(e.message,true);}}
