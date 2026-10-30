import express, { Request, Response } from 'express';
import cors from 'cors';
import { inicializarBD, registrarVisitaBD, obtenerEstadisticas } from './baseDatos.js';

const app = express();
const PUERTO = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Endpoint para recibir visitas desde Unity
app.post('/api/visitas', async (req: Request, res: Response) => {
  try {
    const { poi_id, latitud, longitud, id_dispositivo, version_app } = req.body;

    if (!poi_id) {
      return res.status(400).json({ error: 'Falta el campo poi_id' });
    }

    const visita = await registrarVisitaBD({
      poi_id,
      latitud: Number(latitud) || 0,
      longitud: Number(longitud) || 0,
      id_dispositivo: String(id_dispositivo || 'desconocido'),
      version_app: String(version_app || '1.0.0')
    });

    console.log(`[DescubreUBB] Visita registrada: ${poi_id} | Dispositivo: ${id_dispositivo}`);
    return res.status(201).json({ exito: true, visita });
  } catch (error) {
    console.error('Error al registrar visita:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para el panel web
app.get('/api/estadisticas', async (_req: Request, res: Response) => {
  try {
    const stats = await obtenerEstadisticas();
    return res.json(stats);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return res.status(500).json({ error: 'Error al consultar datos' });
  }
});

// Inicialización
inicializarBD().then(() => {
  app.listen(PUERTO, () => {
    console.log(`Servidor DescubreUBB activo en http://localhost:${PUERTO}`);
  });
}).catch((err: any) => {
  console.error('Error al inicializar el servidor:', err);
});