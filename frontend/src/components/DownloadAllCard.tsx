import { useState } from 'react';
import { Database } from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { supabase } from '../lib/supabase';
import { Button, Card } from './ui';

export default function DownloadAllCard() {
  const { activeOrg } = useOrg();
  const [busy, setBusy] = useState(false);

  async function downloadAll() {
    if (!activeOrg) return;
    setBusy(true);
    try {
      const org = activeOrg.id;
      const [clients, staff, services, appointments, sales, photos] = await Promise.all([
        supabase.from('clients').select('*').eq('organization_id', org),
        supabase.from('staff').select('*').eq('organization_id', org),
        supabase.from('services').select('*').eq('organization_id', org),
        supabase.from('appointments').select('*').eq('organization_id', org),
        supabase.from('sales').select('*').eq('organization_id', org),
        supabase.from('photos').select('*').eq('organization_id', org),
      ]);
      const pack = {
        exportado_el: new Date().toISOString(),
        negocio: activeOrg,
        clientes: clients.data, profesionales: staff.data, servicios: services.data,
        turnos: appointments.data, ventas: sales.data, fotos: photos.data,
      };
      const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `turno-backup-${activeOrg.slug}.json`;
      a.click();
    } finally { setBusy(false); }
  }

  return (
    <Card>
      <h2 className="mb-2 text-sm font-bold">Tus datos son tuyos</h2>
      <p className="mb-3 text-xs text-stone-500">Descargá una copia completa de tu negocio (clientes, turnos, ventas, fotos) cuando quieras.</p>
      <Button variant="secondary" loading={busy} onClick={() => void downloadAll()}><Database className="h-4 w-4" /> Descargar todos mis datos</Button>
    </Card>
  );
}