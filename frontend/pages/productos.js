import { protegerPagina } from '../services/sesion.js';
import { pedir } from '../services/api.service.js';
import { eliminarProducto } from '../services/inventario.service.js';
const $=id=>document.getElementById(id);
let editando=null,productos=[];
function aviso(texto,error=false){$('mensaje').hidden=false;$('mensaje').textContent=texto;$('mensaje').className=error?'error':'';}
function configurarUnidadTipo(producto=null){
    const bloqueado=producto && !producto.permiteCambiarUnidadTipo;
    $('unidad').disabled=Boolean(bloqueado);$('tipo').disabled=Boolean(bloqueado);
    let ayuda=$('ayuda-unidad-tipo');
    if(!ayuda){ayuda=document.createElement('p');ayuda.id='ayuda-unidad-tipo';ayuda.className='ayuda';$('unidad').parentElement.append(ayuda);$('unidad').setAttribute('aria-describedby',ayuda.id);$('tipo').setAttribute('aria-describedby',ayuda.id);}
    ayuda.textContent=bloqueado?'La unidad y el tipo están bloqueados porque hay existencias o movimientos registrados. Para usar otra unidad, crea un producto nuevo.':'';
    ayuda.hidden=!bloqueado;
}
function limpiar(){editando=null;$('producto-form').reset();configurarUnidadTipo();$('titulo-form').textContent='Nuevo producto';}
async function cargar(){
    productos=await pedir('/api/inventario');$('catalogo').replaceChildren();
    for(const p of productos){const tr=document.createElement('tr');
        for(const dato of [p.nombre,p.tipo,p.unidad,p.existencia,`$${Number(p.precioVenta).toFixed(2)}`,p.isActive?'Activo':'Desactivado']){const td=document.createElement('td');td.textContent=dato;tr.append(td);}
        const td=document.createElement('td'),b=document.createElement('button');b.type='button';b.textContent='Editar';
        b.addEventListener('click',()=>{editando=p;configurarUnidadTipo(p);$('titulo-form').textContent='Editar producto';$('nombre').value=p.nombre;$('tipo').value=p.tipo;$('unidad').value=p.unidad;$('precio').value=p.precioVenta;$('minimo').value=p.stockMinimo;$('descripcion').value=p.descripcion||'';$('activo').checked=p.isActive;$('nombre').focus();});
        td.append(b);tr.append(td);$('catalogo').append(tr);
        const eliminar=document.createElement('button');eliminar.type='button';eliminar.className='btn-eliminar-registro';eliminar.textContent='Eliminar';
        eliminar.addEventListener('click',async()=>{
            if(!confirm(`¿Estás seguro de querer eliminar el producto "${p.nombre}"? Esta acción no se puede deshacer.`))return;
            eliminar.disabled=true;
            try{await eliminarProducto(p.productoId);if(editando?.productoId===p.productoId)limpiar();await cargar();aviso('Producto eliminado.');}
            catch(e){aviso(e.message,true);}finally{eliminar.disabled=false;}
        });td.append(eliminar);
        if (String(p.productoId) === new URLSearchParams(location.search).get('editar')) b.click();
    }
}
$('cancelar').addEventListener('click',limpiar);
$('producto-form').addEventListener('submit',async e=>{
    e.preventDefault();const b=e.submitter;b.disabled=true;
    const datos={nombre:$('nombre').value,tipo:$('tipo').value,unidad:$('unidad').value,precioVenta:Number($('precio').value),stockMinimo:Number($('minimo').value),descripcion:$('descripcion').value,isActive:$('activo').checked};
    try{await pedir('/api/inventario'+(editando?'/'+editando.productoId:''),{method:editando?'PUT':'POST',body:JSON.stringify(datos)});limpiar();await cargar();aviso('Producto guardado.');}
    catch(e){aviso(e.message,true);}finally{b.disabled=false;}
});
if(await protegerPagina()){try{await cargar();}catch(e){aviso(e.message,true);}}
