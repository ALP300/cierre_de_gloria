# Cierre de Gloria

Web de registro y entradas del congreso **Cierre de Gloria** de la iglesia Jesús el Buen Camino.

| Página | Para qué sirve |
|---|---|
| `/` | Registro público |
| `/t/<código>` | Ticket del invitado |
| `/admin` | Acceso de administradores |
| `/admin/panel` | Lista, búsqueda y totales |
| `/admin/escaner` | Escáner de entrada con la cámara |

## Datos del evento

La fecha, la hora y el lugar se editan en `src/event.config.ts`.

## Desarrollo

```bash
npm install
npm run dev
```

Por defecto usa el API de producción. Para usar otro, crea `.env.local` a partir de `.env.example`.

## Publicación

1. **Base de datos:** ejecuta una vez `migration_cierre_gloria.sql`, del repositorio del backend. Solo crea la tabla `CierreGloriaTickets`.
2. **Administradores:** ejecuta `npm run crear-admin` para crear las tablas y cada cuenta. También sirve para cambiar una contraseña.
3. **Backend:** publica el módulo. Ejecuta antes el paso anterior para que el panel encuentre las tablas.
4. **Web:** publícala como sitio estático con `render.yaml`. El escáner necesita `https` para abrir la cámara.

El plan gratuito de Render apaga el backend cuando no recibe visitas y tarda cerca de un minuto en despertar. Ábrelo antes de empezar a recibir invitados.
