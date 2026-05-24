import { nip19 } from 'nostr-tools';
import { useParams } from 'react-router-dom';
import StationDetailPage from './StationDetailPage';
import NotFound from './NotFound';

export function NIP19Page() {
  const { nip19: identifier } = useParams<{ nip19: string }>();

  if (!identifier) {
    return <NotFound />;
  }

  let decoded;
  try {
    decoded = nip19.decode(identifier);
  } catch {
    return <NotFound />;
  }

  const { type } = decoded;

  switch (type) {
    case 'npub':
    case 'nprofile':
      // Render station detail page for weather station pubkeys
      return <StationDetailPage />;

    case 'note':
    case 'nevent':
    case 'naddr':
      // Not implemented for weather stations
      return <NotFound />;

    default:
      return <NotFound />;
  }
} 