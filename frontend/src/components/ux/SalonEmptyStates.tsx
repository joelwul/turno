import { CalendarCheck2, Gift, Images, Scissors, Sparkles, Ticket, UserPlus, Users } from 'lucide-react';
import { Button, EmptyState } from '../ui';

export function EmptyAgenda({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={<CalendarCheck2 className="h-7 w-7" />}
      title="Tu agenda está libre"
      description="Cuando cargues o recibas tu primer turno, va a aparecer acá. También podés aprovechar para revisar tus horarios."
      action={onCreate ? <Button onClick={onCreate}>Crear primer turno</Button> : undefined}
    />
  );
}

export function EmptyClients({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={<UserPlus className="h-7 w-7" />}
      title="Todavía no tenés clientes"
      description="Registrá tu primer cliente para guardar historial, notas, turnos y fotos en un solo lugar."
      action={onCreate ? <Button onClick={onCreate}>Agregar cliente</Button> : undefined}
    />
  );
}

export function EmptyServices({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={<Scissors className="h-7 w-7" />}
      title="Creá tus servicios"
      description="Los servicios definen duración, precio y ayudan a que la agenda y las reservas online funcionen mejor."
      action={onCreate ? <Button onClick={onCreate}>Crear servicio</Button> : undefined}
    />
  );
}

export function EmptyStaff({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={<Users className="h-7 w-7" />}
      title="Agregá tu equipo"
      description="Cargá profesionales para asignar turnos, horarios, comisiones y disponibilidad."
      action={onCreate ? <Button onClick={onCreate}>Agregar profesional</Button> : undefined}
    />
  );
}

export function EmptyPhotos() {
  return (
    <EmptyState
      icon={<Images className="h-7 w-7" />}
      title="Todavía no hay fotos"
      description="Cuando subas fotos de trabajos, van a aparecer acá para armar catálogos y mostrar resultados."
    />
  );
}

export function EmptyCoupons({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={<Ticket className="h-7 w-7" />}
      title="Todavía no creaste cupones"
      description="Los cupones ayudan a mover días flojos, medir promociones y atraer reservas online."
      action={onCreate ? <Button onClick={onCreate}>Crear cupón</Button> : undefined}
    />
  );
}

export function EmptyOpportunities() {
  return (
    <EmptyState
      icon={<Sparkles className="h-7 w-7" />}
      title="Aún no hay oportunidades"
      description="Cuando SalonFlow detecte clientes para recuperar, horarios flojos o patrones útiles, te los va a mostrar acá."
    />
  );
}

export function EmptyRewards() {
  return (
    <EmptyState
      icon={<Gift className="h-7 w-7" />}
      title="Todavía no hay beneficios"
      description="Más adelante podés sumar fidelización, referidos o promociones especiales para tus clientes."
    />
  );
}