import { useState } from 'react';

export default function BeforeAfter({ before, after }: { before: string; after: string }) {
  const [pos, setPos] = useState(50);
  return (
    <div className="relative select-none overflow-hidden rounded-xl" style={{ aspectRatio: '4/3' }}>
      <img src={after} alt="Después" className="absolute inset-0 h-full w-full object-cover" />
      <img src={before} alt="Antes" className="absolute inset-0 h-full w-full object-cover" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
      <input type="range" min="0" max="100" value={pos} onChange={(e) => setPos(Number(e.target.value))}
        className="absolute bottom-2 left-1/2 w-3/4 -translate-x-1/2" />
      <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">ANTES</span>
      <span className="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">DESPUÉS</span>
    </div>
  );
}