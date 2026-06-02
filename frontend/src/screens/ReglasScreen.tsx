// File: frontend/src/screens/ReglasScreen.tsx
// Purpose: Rules sub-page accessible from Más.
// Functionality: Renders the eight static rule sections in the order
// defined by the mockup. Uses the back-button variant of Header to return
// to /mas; the TabBar remains visible because the user is still inside
// the Más tab.
// Role: Bound to /mas/reglas behind ProtectedRoute.

import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { TabBar } from '../components/TabBar';

// Section data lifted verbatim from the product spec / mockup.
type Rule = { title: string; body: string };
const RULES: Rule[] = [
  {
    title: '1. ¿Cómo se juega?',
    body:
      'Cargá tus predicciones de los partidos del Mundial 2026 hasta 15 minutos antes del inicio de cada partido. Los puntos se obtienen según aciertos en ganador, diferencia de gol y resultado exacto.',
  },
  {
    title: '2. Puntuación',
    body:
      '• 7 puntos por acertar ganador y resultado exacto.\n• 5 puntos por acertar ganador y diferencia de gol.\n• 3 puntos por acertar solo el ganador.\n• 0 puntos en cualquier otro caso.',
  },
  {
    title: '3. Resultado en fase de grupos',
    body:
      'Se toma el marcador al terminar los 90 minutos + adicional.',
  },
  {
    title: '4. Resultado en eliminatorias',
    body:
      'Se toma el marcador al minuto 120: si el partido se define por penales, esos goles no cuentan. Las predicciones se puntúan con las mismas reglas que la fase de grupos.',
  },
  {
    title: '5. Partidos postergados',
    body:
      'Si se reprograma dentro de la misma fecha, cuenta normalmente. Si se juega fuera de su fecha original, cuenta para la fecha en la que se juega. Si se resuelve administrativamente, no suma puntos.',
  },
  {
    title: '6. Predicciones sin completar',
    body:
      'Si no cargás una predicción antes del cierre, ese partido suma 0 puntos.',
  },
  {
    title: '7. Cuándo empezás a sumar',
    body:
      'Cada participante suma desde la fecha en la que fue dado de alta. Quien entra en fecha 5 no acumula puntos de fechas 1 a 4.',
  },
  {
    title: '8. Tabla de posiciones',
    body:
      'Se ordena por puntos de mayor a menor. Cada participante tiene una posición única (no se comparten puestos). En caso de empate en puntaje, se desempata por:\n1) Mayor cantidad de resultados exactos.\n2) Mayor cantidad de aciertos con diferencia de gol (predicciones de 5 o 7 puntos).\n3) Mayor cantidad de goles del equipo ganador en los partidos donde se acertó el ganador.',
  },
  {
    title: '9. Competencia de equipos',
    body:
      'Cada participante pertenece a un equipo de trabajo (ej: BI, Compras, SSGG). En la pantalla de Torneo, la pestaña "Equipos" muestra dos tablas:\n• Por fecha: ranking de equipos en cada jornada.\n• Total: ranking acumulado al final del torneo.\nEl puntaje de un equipo es el promedio de puntos de sus integrantes activos (puntos totales del equipo dividido la cantidad de miembros activos).',
  },
];

export function ReglasScreen() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Header title="Reglas del torneo" showBack onBack={() => navigate('/mas')} />
      <main className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {RULES.map((r) => (
          <section key={r.title}>
            <h4 className="text-sm font-extrabold mb-1 text-brand-orange">{r.title}</h4>
            <p className="text-[13px] leading-relaxed whitespace-pre-line text-ink">{r.body}</p>
          </section>
        ))}
      </main>
      <TabBar />
    </div>
  );
}
