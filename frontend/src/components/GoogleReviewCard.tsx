import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { supabase } from '../lib/supabase';
import { Button, Card, Field, Input } from './ui';

export default function GoogleReviewCard() {
  const { activeOrg, refreshOrg } = useOrg();
  const [url, setUrl] = useState('');
  const [saved, setSaved] = useState(false);
  useEffect(() => { setUrl(((activeOrg as never as { google_review_url?: string })?.google_review_url) ?? ''); }, [activeOrg]);
  async function save() {
    if (!activeOrg) return;
    await supabase.from('organizations').update({ google_review_url: url || null }).eq('id', activeOrg.id);
    await refreshOrg();
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  }
  return (
    <Card>
      <p className="mb-2 flex items-center gap-2 text-sm font-bold"><Star className="h-4 w-4 text-primary-600" /> Reseñas de Google</p>
      <p className="mb-2 text-xs text-ink-500">Pegá acá el link de reseñas de tu salón. Lo usamos en el botón "Reseña" de Cobros del día.</p>
      <Field label="Link de reseñas de Google">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://g.page/r/…/review" />
      </Field>
      <div className="mt-2"><Button size="sm" onClick={() => void save()}>{saved ? 'Guardado ✓' : 'Guardar'}</Button></div>
    </Card>
  );
}