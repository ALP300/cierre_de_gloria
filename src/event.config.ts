// Datos del evento. Aparecen en la web y en los tickets.
export const EVENT = {
  name: 'Cierre de Gloria',
  organizer: 'Jesús el Buen Camino',
  date: '5 de diciembre',
  time: '6:00 p. m. a 10:00 p. m.',
  place: 'Iglesia Jesús el Buen Camino',
  address: 'Jr. Asbestos 663, San Juan de Lurigancho 15434',
};

export const eventWhen = () =>
  [EVENT.date, EVENT.time].filter(Boolean).join(' · ') || 'Fecha por confirmar';

export const mapsUrl = () =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${EVENT.address}, Lima, Perú`)}`;
