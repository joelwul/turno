import { useLocation } from 'react-router-dom';
export default function DevCredit() {
  const loc = useLocation();
  if (loc.pathname.startsWith('/superadmin')) return null;
  return (
    <a href="https://buenpuerto.online" target="_blank" rel="noreferrer"
      className="fixed bottom-2 left-2 z-40 flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-ink-500 shadow-soft ring-1 ring-ink-900/10 backdrop-blur hover:text-ink-800">
      <img src="/logo-buenpuerto.png" alt="" className="h-4 w-4 rounded object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      <span>App desarrollada por <b className="text-ink-700">buenpuerto.online</b></span>
    </a>
  );
}