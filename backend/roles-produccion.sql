-- Roles: 1 Empleado (vendedor), 2 Administrador, 3 Encargado de producción.
-- Solo la primera ejecución convierte las antiguas cuentas Desarrollador a Administrador.
IF OBJECT_ID(N'dbo.migraciones', N'U') IS NULL
    CREATE TABLE dbo.migraciones (nombre varchar(100) NOT NULL PRIMARY KEY, fecha datetime2 NOT NULL DEFAULT SYSDATETIME());
GO
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF NOT EXISTS (SELECT 1 FROM dbo.migraciones WITH (UPDLOCK, HOLDLOCK) WHERE nombre='roles-produccion-v1')
BEGIN
    UPDATE dbo.users SET accountType=2 WHERE accountType=3;
    INSERT INTO dbo.migraciones(nombre) VALUES ('roles-produccion-v1');
END
COMMIT;
GO
IF COL_LENGTH(N'dbo.inventario', N'tipo') IS NULL
    ALTER TABLE dbo.inventario ADD tipo varchar(20) NOT NULL CONSTRAINT DF_inventario_tipo DEFAULT 'Terminado'
        CONSTRAINT CK_inventario_tipo CHECK (tipo IN ('Terminado','Materia prima'));
GO
IF OBJECT_ID(N'dbo.compras', N'U') IS NULL
CREATE TABLE dbo.compras (
    compraId int IDENTITY PRIMARY KEY,
    fecha datetime2 NOT NULL DEFAULT SYSDATETIME(),
    userId int NOT NULL REFERENCES dbo.users(userId),
    productoId int NOT NULL REFERENCES dbo.inventario(productoId),
    proveedor nvarchar(150) NOT NULL,
    cantidad decimal(12,3) NOT NULL CHECK (cantidad>0),
    costoTotal decimal(12,2) NOT NULL CHECK (costoTotal>=0)
);
GO
IF OBJECT_ID(N'dbo.produccion', N'U') IS NULL
CREATE TABLE dbo.produccion (
    produccionId int IDENTITY PRIMARY KEY,
    fecha datetime2 NOT NULL DEFAULT SYSDATETIME(),
    userId int NOT NULL REFERENCES dbo.users(userId),
    materiaPrimaId int NOT NULL REFERENCES dbo.inventario(productoId),
    productoId int NOT NULL REFERENCES dbo.inventario(productoId),
    cantidadUtilizada decimal(12,3) NOT NULL CHECK (cantidadUtilizada>0),
    cantidadObtenida decimal(12,3) NOT NULL CHECK (cantidadObtenida>0),
    merma decimal(12,3) NOT NULL CHECK (merma>=0),
    observaciones nvarchar(255) NULL,
    CONSTRAINT CK_produccion_merma CHECK (merma<=cantidadUtilizada),
    CONSTRAINT CK_produccion_productos CHECK (materiaPrimaId<>productoId)
);
GO
