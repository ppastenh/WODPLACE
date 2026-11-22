import React from 'react';
import type { BoxAnnouncement, MyPlan } from '@workspace/api-client-react';
import { planNoticeLines } from '@/components/home/planNoticeModel';
import { NoticeBanner } from '@/components/ui/NoticeBanner';

/**
 * Los tres avisos de Inicio en la pieza NoticeBanner (pedido 43). SOLO se ven en "Estados de Inicio (dev)" → "Ver avisos": NO están conectados a HomeView (una prueba lo exige).
 * No cambian textos, reglas ni destinos: los textos son los de ConditionalCards.tsx (el mismo planNoticeLines) y el contrato sigue abriendo Contratos Activos.
 */

/** Contrato pendiente: importante, presionable (abre Contratos Activos). */
export function PendingContractBanner({ onPress }: { onPress: () => void }) {
  return (
    <NoticeBanner
      level="importante"
      icon="file-text"
      title="Tienes un contrato pendiente de leer y aceptar"
      body="Toca aquí para revisarlo en Contratos Activos. Mientras esté pendiente, no podrás hacer nuevas reservas."
      onPress={onPress}
      accessibilityHint="Abre Contratos Activos"
    />
  );
}

/** Aviso fijo del box: info, con imagen opcional bajo el texto y hasta 3 líneas de cuerpo. */
export function PinnedAvisoBanner({ announcement }: { announcement: BoxAnnouncement }) {
  return <NoticeBanner level="info" icon="bell" title={announcement.title} body={announcement.body} bodyMaxLines={3} image={announcement.imageUrl} />;
}

/** Aviso del plan: info. Con las dos reglas, las dos líneas van en la misma tarjeta, las dos con el estilo de título (una bajo la otra). Sin ninguna regla no dibuja nada. */
export function PlanNoticeBanner({ plan }: { plan: MyPlan }) {
  const lines = planNoticeLines(plan);
  if (lines.length === 0) return null;
  return <NoticeBanner level="info" icon="alert-circle" title={lines} />;
}
