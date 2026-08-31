import { useState } from 'react';
import { cn } from '../../lib/utils';

export function SalonFlowMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('h-10 w-10', className)} aria-hidden="true">
      <path d="M40 10c-9.5 0-16 4.8-16 11 0 12 19 8.6 19 20 0 7-7.5 11.6-17 11.6" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M26 24c7.5-3.2 16-3.2 21.5 1" fill="none" stroke="#B489AD" strokeWidth="5" strokeLinecap="round" />
      <circle cx="45" cy="52" r="3.2" fill="#B489AD" />
      <circle cx="53.5" cy="52" r="3.2" fill="#C9C6D1" />
    </svg>
  );
}

export function SalonFlowLogo({ light = false, tagline = false, size = 'md' }: { light?: boolean; tagline?: boolean; size?: 'md' | 'lg' }) {
  const [failed, setFailed] = useState(false);
  if (!failed) {
    return (
      <img
        src="/logo-salonflow.png"
        alt="SalonFlow - Tu salón, tu tiempo, tus clientes"
        onError={() => setFailed(true)}
        className={cn('select-none', size === 'lg' ? 'w-72' : 'w-48')}
      />
    );
  }
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="flex items-center gap-3">
        <SalonFlowMark className={cn(size === 'lg' ? 'h-16 w-16' : 'h-11 w-11', light ? 'text-ink-50' : 'text-ink-900')} />
        <p className={cn('font-sans font-light tracking-tight', size === 'lg' ? 'text-5xl' : 'text-3xl', light ? 'text-ink-50' : 'text-ink-900')}>
          Salon<span className={light ? 'text-primary-300' : 'text-primary-500'}>Flow</span>
        </p>
      </div>
      {tagline && (
        <p className={cn('max-w-xs text-[0.7rem] font-semibold uppercase tracking-[0.22em]', light ? 'text-ink-300' : 'text-ink-500')}>
          Tu salón. Tu tiempo. Tus clientes. Todo en un solo lugar.
        </p>
      )}
    </div>
  );
}