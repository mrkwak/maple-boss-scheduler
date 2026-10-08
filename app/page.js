import App from '@/components/App';
import { weekKey, monthKey } from '@/lib/week';

export const dynamic = 'force-dynamic';

export default function Home() {
  return <App week={weekKey()} month={monthKey()} />;
}
