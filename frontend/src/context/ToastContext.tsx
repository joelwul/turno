import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';
interface ToastItem { id: number; message: string; type: ToastType; }

const Ctx = createContext<{ toast: (message: string, type?: ToastType) => void }>({ toast: () => {} });
export function useToast() { return useContext(Ctx); }

function friendly(m: string): string {
  const s = m.toLowerCase();
  if (s.includes('fetch') || s.includes('network')) return 'Problema de conexión. Revisá tu internet e intentá de nuevo.';
  if (s.includes('duplicate') || s.includes('unique') || s.includes('ya existe')) return 'Ese dato ya existe. Probá con otro.';
  if (s.includes('row-level') || s.includes('rls') || s.includes('permission') || s.includes('403')) return 'No tenés permisos para esta acción. Consultá con quien administra el salón.';
  if (s.includes('uuid') || s.includes('invalid input')) return 'Algo no quedó bien seleccionado. Intentá de nuevo.';
  if (s.includes('401') || s.includes('unauthorized') || s.includes('jwt')) return 'Tu sesión expiró. Volvé a iniciar sesión.';
  if (s.length > 120) return 'Algo salió mal. Intentá de nuevo o recargá la página.';
  return m;
}

const ICONS: Record<ToastType, typeof Info> = { success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info };
const COLORS: Record<ToastType, string> = {
  success: 'bg-emerald-600', error: 'bg-rose-600', warning: 'bg-amber-500', info: 'bg-ink-800',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++idRef.current;
    setItems((p) => [...p, { id, message: type === 'success' ? message : friendly(message), type }]);
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex flex-col items-center gap-2 px-4 md:items-end md:pr-6" role="status" aria-live="polite">
        {items.map((t) => {
          const Ic = ICONS[t.type];
          return (
            <div key={t.id} className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl px-4 py-3 text-white shadow-lift ${COLORS[t.type]}`}>
              <Ic className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm font-semibold leading-snug">{t.message}</p>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}