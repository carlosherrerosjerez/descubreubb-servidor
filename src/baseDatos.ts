import fs from 'fs';
import path from 'path';

export interface RegistroVisita {
  id: number;
  poi_id: string;
  latitud: number;
  longitud: number;
  id_dispositivo: string;
  version_app: string;
  fecha_hora: string;
}

const RUTA_DB = path.join(__dirname, '..', 'visitas_ubb.json');

function leerVisitas(): RegistroVisita[] {
  try {
    if (!fs.existsSync(RUTA_DB)) {
      fs.writeFileSync(RUTA_DB, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    const contenido = fs.readFileSync(RUTA_DB, 'utf-8');
    return JSON.parse(contenido || '[]');
  } catch (error) {
    console.error('Error al leer base de datos:', error);
    return [];
  }
}

function guardarVisitas(visitas: RegistroVisita[]): void {
  try {
    fs.writeFileSync(RUTA_DB, JSON.stringify(visitas, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error al guardar en base de datos:', error);
  }
}

export function inicializarBD(): Promise<void> {
  return new Promise((resolve) => {
    if (!fs.existsSync(RUTA_DB)) {
      fs.writeFileSync(RUTA_DB, JSON.stringify([], null, 2), 'utf-8');
    }
    resolve();
  });
}

export function registrarVisitaBD(datos: {
  poi_id: string;
  latitud: number;
  longitud: number;
  id_dispositivo: string;
  version_app: string;
}): Promise<RegistroVisita> {
  return new Promise((resolve) => {
    const visitas = leerVisitas();
    const nuevaVisita: RegistroVisita = {
      id: visitas.length > 0 ? visitas[visitas.length - 1].id + 1 : 1,
      poi_id: datos.poi_id,
      latitud: datos.latitud,
      longitud: datos.longitud,
      id_dispositivo: datos.id_dispositivo,
      version_app: datos.version_app,
      fecha_hora: new Date().toISOString()
    };

    visitas.push(nuevaVisita);
    guardarVisitas(visitas);
    resolve(nuevaVisita);
  });
}

export function obtenerEstadisticas(): Promise<{
  totalVisitas: number;
  resumenPoi: { poi_id: string; cantidad: number }[];
  visitasRecientes: RegistroVisita[];
}> {
  return new Promise((resolve) => {
    const visitas = leerVisitas();

    const mapaPois: { [key: string]: number } = {};
    visitas.forEach((v) => {
      mapaPois[v.poi_id] = (mapaPois[v.poi_id] || 0) + 1;
    });

    const resumenPoi = Object.keys(mapaPois)
      .map((poi_id) => ({ poi_id, cantidad: mapaPois[poi_id] }))
      .sort((a, b) => b.cantidad - a.cantidad);

    const visitasRecientes = [...visitas].reverse().slice(0, 15);

    resolve({
      totalVisitas: visitas.length,
      resumenPoi,
      visitasRecientes
    });
  });
}