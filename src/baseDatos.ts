import sqlite3 from 'sqlite3';
import { Pool } from 'pg';

const esProduccion = !!process.env.DATABASE_URL;

let pgPool: Pool | null = null;
let sqliteDb: sqlite3.Database | null = null;

if (esProduccion) {
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
} else {
  sqliteDb = new sqlite3.Database('./visitas_ubb.db');
}

export const inicializarBD = async () => {
  if (esProduccion && pgPool) {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS visitas (
        id SERIAL PRIMARY KEY,
        poi_id VARCHAR(100) NOT NULL,
        latitud DOUBLE PRECISION,
        longitud DOUBLE PRECISION,
        id_dispositivo VARCHAR(100),
        version_app VARCHAR(50),
        fecha_hora TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  } else if (sqliteDb) {
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS visitas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        poi_id TEXT NOT NULL,
        latitud REAL,
        longitud REAL,
        id_dispositivo TEXT,
        version_app TEXT,
        fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }
};

export const registrarVisitaBD = async (datos: {
  poi_id: string;
  latitud: number;
  longitud: number;
  id_dispositivo: string;
  version_app: string;
  fecha_hora?: string;
}) => {
  if (esProduccion && pgPool) {
    const consulta = `
      INSERT INTO visitas (poi_id, latitud, longitud, id_dispositivo, version_app, fecha_hora)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const res = await pgPool.query(consulta, [
      datos.poi_id,
      datos.latitud,
      datos.longitud,
      datos.id_dispositivo,
      datos.version_app,
      datos.fecha_hora || new Date().toISOString()
    ]);
    return res.rows[0];
  } else if (sqliteDb) {
    return new Promise((resolve, reject) => {
      const consulta = `
        INSERT INTO visitas (poi_id, latitud, longitud, id_dispositivo, version_app, fecha_hora)
        VALUES (?, ?, ?, ?, ?, ?);
      `;
      sqliteDb!.run(
        consulta,
        [
          datos.poi_id,
          datos.latitud,
          datos.longitud,
          datos.id_dispositivo,
          datos.version_app,
          datos.fecha_hora || new Date().toISOString()
        ],
        function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...datos });
        }
      );
    });
  }
};

export const obtenerEstadisticas = async () => {
  if (esProduccion && pgPool) {
    const total = await pgPool.query(`SELECT COUNT(*) FROM visitas;`);
    const porPoi = await pgPool.query(`
      SELECT poi_id, COUNT(*) as cantidad 
      FROM visitas 
      GROUP BY poi_id 
      ORDER BY cantidad DESC;
    `);
    const recientes = await pgPool.query(`
      SELECT * FROM visitas 
      ORDER BY fecha_hora DESC 
      LIMIT 15;
    `);
    return {
      totalVisitas: parseInt(total.rows[0].count, 10),
      resumenPoi: porPoi.rows,
      visitasRecientes: recientes.rows
    };
  } else if (sqliteDb) {
    return new Promise((resolve, reject) => {
      sqliteDb!.all(`SELECT poi_id, COUNT(*) as cantidad FROM visitas GROUP BY poi_id ORDER BY cantidad DESC;`, (err, porPoi) => {
        if (err) return reject(err);
        sqliteDb!.all(`SELECT * FROM visitas ORDER BY fecha_hora DESC LIMIT 15;`, (err2, recientes) => {
          if (err2) return reject(err2);
          const total = (porPoi as any[]).reduce((acum: number, actual: any) => acum + actual.cantidad, 0);
          resolve({
            totalVisitas: total,
            resumenPoi: porPoi,
            visitasRecientes: recientes
          });
        });
      });
    });
  }
};