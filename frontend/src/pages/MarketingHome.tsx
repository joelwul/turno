import { useEffect } from 'react';

export default function MarketingHome() {
  useEffect(() => {
    document.title = 'SalonFlow — Software de gestión para peluquerías y salones de belleza';
    const rob = document.querySelector('meta[name="robots"]');
    if (rob) rob.setAttribute('content', 'index,follow');
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', 'SalonFlow es el sistema para gestionar tu peluquería o salón: agenda, turnos online 24/7 con QR, clientas, cobros, historial fotográfico y fórmulas de color. Probá 30 días gratis.');
  }, []);
  return <iframe title="SalonFlow" src="/home.html" style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', border: '0' }} />;
}