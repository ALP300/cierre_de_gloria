import { CalendarDays, MapPin, Navigation } from 'lucide-react';
import { EVENT, eventWhen, mapsUrl } from '../event.config';

export default function EventFacts({ dark = false }: { dark?: boolean }) {
  return (
    <ul className={dark ? 'facts dark' : 'facts'}>
      <li><CalendarDays size={18} />{eventWhen()}</li>
      <li className="place">
        <MapPin size={18} />
        <span>{EVENT.place}<small>{EVENT.address}</small></span>
      </li>
      <li>
        <a className="map-link" href={mapsUrl()} target="_blank" rel="noreferrer">
          <Navigation size={16} />Ver en Google Maps
        </a>
      </li>
    </ul>
  );
}
