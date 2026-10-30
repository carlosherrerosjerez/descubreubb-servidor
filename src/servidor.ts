import express from 'express';
import cors from 'cors';
import { inicializarBD, registrarVisitaBD, obtenerEstadisticas } from './baseDatos.js';

const app = express();
const PUERTO = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Endpoint receptor para Unity
app.post('/api/visitas', async (req, res) => {
  try {
    const { poi_id, latitud, longitud, id_dispositivo, version_app, fecha_hora } = req.body;
    
    if (!poi_id) {
      return res.status(400).json({ error: 'poi_id es obligatorio' });
    }

    const guardado = await registrarVisitaBD({
      poi_id,
      latitud,
      longitud,
      id_dispositivo,
      version_app,
      fecha_hora
    });

    console.log(`[DescubreUBB] Visita registrada: ${poi_id} | Dispositivo: ${id_dispositivo}`);
    return res.status(201).json({ exito: true, visita: guardado });
  } catch (error) {
    console.error('Error al registrar visita:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para el panel web
app.get('/api/estadisticas', async (_req, res) => {
  try {
    const datos = await obtenerEstadisticas();
    res.json(datos);
  } catch (error) {
    console.error('Error al consultar estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

inicializarBD().then(() => {
  app.listen(PUERTO, () => {
    console.log(`Servidor DescubreUBB activo en http://localhost:${PUERTO}`);
  });
}).catch((err) => {
  console.error('Error al conectar la base de datos:', err);
});