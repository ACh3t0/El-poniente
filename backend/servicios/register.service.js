const { sql, getConnection } = require("./databaseLogin.service");
const { hashPassword } = require("./password.service");

async function necesitaConfiguracion() {
    const pool = await getConnection();
    const resultado = await pool.request().query("SELECT COUNT(*) AS total FROM dbo.users");
    return resultado.recordset[0].total === 0;
}

async function registerUser(usuario, password, accountType, modo = null) {
    const hashed = await hashPassword(password);
    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
        if (modo) {
            // Bloqueo compartido por todas las altas iniciales y publicas.
            const resultado = await new sql.Request(transaction)
                .query("SELECT COUNT(*) AS total FROM dbo.users WITH (TABLOCKX, HOLDLOCK)");
            const vacia = resultado.recordset[0].total === 0;
            if (modo === "inicial" && (!vacia || accountType !== 2)) {
                throw Object.assign(new Error("La configuracion inicial ya fue completada. Inicia sesion."), { status: 409 });
            }
            if (modo === "publico" && vacia) {
                throw Object.assign(new Error("Primero crea el Administrador desde la configuracion inicial."), { status: 409, code: "SETUP_REQUIRED" });
            }
        }
        const existing = await new sql.Request(transaction)
            .input("usuario", sql.VarChar(50), usuario)
            .query("SELECT userId FROM dbo.users WITH (UPDLOCK, HOLDLOCK) WHERE userName = @usuario");
        if (existing.recordset.length) {
            const error = new Error("Ese nombre de usuario ya está registrado.");
            error.status = 409;
            throw error;
        }
        await new sql.Request(transaction)
            .input("usuario", sql.VarChar(50), usuario)
            .input("password", sql.VarChar(255), hashed)
            .input("accountType", sql.TinyInt, accountType)
            .query("INSERT INTO dbo.users (userName, [password], accountType) VALUES (@usuario, @password, @accountType)");
        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}
module.exports = { registerUser, necesitaConfiguracion };
