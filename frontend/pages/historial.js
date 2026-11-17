import { protegerPagina } from '../services/sesion.js';
import { pedir } from '../services/api.service.js';
const $=id=>document.getElementById(id);
async function cargar(){
    try{
        const ventas=await pedir('/api/ventas');
        $('historial').replaceChildren();
        for(const v of ventas){
            const fila=document.createElement('tr');
            for(const valor of [v.ventaId,new Date(v.fecha).toLocaleString('es-MX'),v.userName,v.metodoPago,v.estadoPedido,`$${Number(v.total).toFixed(2)}`]){const td=document.createElement('td');td.textContent=valor;fila.append(td);}
            const td=document.createElement('td'),b=document.createElement('button');b.textContent='Ver detalle';b.type='button';
            b.addEventListener('click',async()=>{b.disabled=true;try{const detalle=await pedir('/api/ventas/'+v.ventaId);td.textContent=detalle.detalles.map(d=>`${d.nombre}: ${d.cantidad} × $${Number(d.precioUnitario).toFixed(2)} = $${Number(d.subtotal).toFixed(2)}`).join(' · ');}catch(e){b.disabled=false;mensaje(e.message);}});
            td.append(b);fila.append(td);$('historial').append(fila);
        }
        if(!ventas.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=7;td.textContent='Todavía no hay ventas.';tr.append(td);$('historial').append(tr);}
    }catch(e){mensaje(e.message);}
}
function mensaje(texto){$('mensaje').hidden=false;$('mensaje').className='error';$('mensaje').textContent=texto;}
$('actualizar').addEventListener('click',cargar);
if(await protegerPagina())await cargar();
