import { obtenerSesion, cerrarSesion } from './usuarios.service.js';
export const TIPOS = { 1: 'Empleado (vendedor)', 2: 'Administrador', 3: 'Encargado de producción' };
const paginas = {
    1: [['ventas', 'Ventas'], ['historial', 'Mi historial']],
    2: [['main', 'Inicio'], ['productos', 'Productos'], ['compras', 'Compras'], ['inventario', 'Inventario'], ['produccion', 'Producción'], ['ventas', 'Ventas'], ['historial', 'Historial de ventas'], ['reportes', 'Reportes'], ['usuarios', 'Usuarios']],
    3: [['produccion', 'Producción'], ['inventario', 'Existencias']]
};
export async function protegerPagina() {
    let sesion;
    try { sesion = await obtenerSesion(); }
    catch { location.href = './login.html'; return null; }
    const permitidas = paginas[sesion.accountType] || [];
    const actual = location.pathname.split('/').pop().replace('.html', '');
    if (!permitidas.some(([pagina]) => pagina === actual)) {
        location.href = './' + (permitidas[0]?.[0] || 'login') + '.html';
        return null;
    }
    const menu = document.querySelector('.sidebar');
    if (menu && !menu.dataset.preparado) {
        menu.dataset.preparado = 'true';
        const lista = menu.querySelector('ul');
        lista?.replaceChildren(...permitidas.map(([pagina, nombre]) => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = './' + pagina + '.html'; a.textContent = nombre;
            if (actual === pagina) a.setAttribute('aria-current', 'page');
            li.append(a); return li;
        }));
        const info = document.createElement('p'); info.className = 'sesion-info';
        info.textContent = `${sesion.userName} (${TIPOS[sesion.accountType]})`;
        const salir = document.createElement('button'); salir.type = 'button'; salir.className = 'btn-salir'; salir.textContent = 'Cerrar sesión';
        salir.addEventListener('click', async () => { try { await cerrarSesion(); } finally { location.href = './login.html'; } });
        menu.append(info, salir);
        const cabecera = document.getElementById('sesion-cabecera');
        if (cabecera && !document.getElementById('resumen-operativo')) {
            const usuario = document.createElement('span');
            usuario.textContent = `Usuario: ${sesion.userName}`;
            const rol = document.createElement('span');
            rol.className = 'rol';
            rol.textContent = `Rol: ${TIPOS[sesion.accountType]}`;
            cabecera.append(usuario, rol, salir);
            info.remove();
        }
        const style = document.createElement('style');
        style.textContent = '.sidebar .sesion-info{font-size:13px;line-height:1.5;overflow-wrap:anywhere;text-align:center;margin-top:24px}.sidebar .btn-salir{width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;background:#fff;color:#29220f;cursor:pointer}.sidebar a[aria-current="page"]{background:#ffe5a3}';
        document.head.append(style);
    }
    return sesion;
}
