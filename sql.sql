USE [Carbón El Poniente];
GO

ALTER TABLE dbo.users
ADD CONSTRAINT DF_users_isActive DEFAULT 1 FOR isActive;