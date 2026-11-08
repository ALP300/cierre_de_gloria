// Datos del evento. Cuando tengas la fecha, la hora y el lugar, escríbelos aquí.
// Mientras estén vacíos, la web y los tickets muestran "Por confirmar".
export const EVENT = {
  name: 'Cierre de Gloria',
  organizer: 'Jesús el Buen Camino',
  date: '', // Ejemplo de formato: 'Sábado 20 de diciembre'
  time: '', // Ejemplo de formato: '6:00 p. m.'
  place: '', // Nombre del local y dirección
};

export const eventWhen = () =>
  [EVENT.date, EVENT.time].filter(Boolean).join(' · ') || 'Fecha por confirmar';

export const eventWhere = () => EVENT.place || 'Lugar por confirmar';
