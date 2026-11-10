const EMPLEADO = 1;
const ADMIN = 2;
const PRODUCCION = 3;
const PAGINAS = {
    [EMPLEADO]: ['ventas', 'historial'],
    [PRODUCCION]: ['produccion', 'inventario'],
    [ADMIN]: ['main', 'inventario', 'usuarios', 'ventas', 'historial', 'reportes', 'produccion', 'compras', 'productos']
};
function destinoRol(rol) {
    return '/pages/' + (rol === ADMIN ? 'main' : rol === PRODUCCION ? 'produccion' : 'ventas') + '.html';
}
function puedeAbrirPagina(rol, ruta) {
    const nombre = ruta.split('/').pop().split('.')[0];
    return (PAGINAS[rol] || []).includes(nombre);
}
function requireLogin(req, res, next) {
    if (!req.session?.user) return res.status(401).json({ mensaje: 'Inicia sesión para continuar.' });
    next();
}
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.session?.user) return res.status(401).json({ mensaje: 'Inicia sesión para continuar.' });
        if (!roles.includes(req.session.user.accountType)) return res.status(403).json({ mensaje: 'No tienes permiso para esta acción.' });
        next();
    };
}
module.exports = { EMPLEADO, ADMIN, PRODUCCION, requireLogin, requireRole, destinoRol, puedeAbrirPagina };
