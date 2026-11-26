import React from 'react';
import type { BoxAnnouncement, MyPlan } from '@workspace/api-client-react';
import { planNoticeLines } from '@/components/home/planNoticeModel';
import { NoticeBanner } from '@/components/ui/NoticeBanner';

/**
 * Los tres avisos de Inicio en la pieza NoticeBanner (pedido 43). Están conectados a Inicio real desde el pedido 50 (HomeView los usa en lugar de las tarjetas de ConditionalCards) y también se ven en "Estados de Inicio (dev)" → "Ver avisos".
 * No cambian textos, reglas ni destinos: los textos son los de las tarjetas anteriores (ya borradas; el mismo planNoticeLines) y el contrato sigue abriendo Contratos Activos.
 */

/** Contrato pendiente: importante, presionable (abre Contratos Activos). */
export function PendingContractBanner({ onPress }: { onPress: () => void }) {
  return (
    <NoticeBanner
      level="importante"
      kind="contrato"
      icon="file-text"
      title="Tienes un contrato pendiente de leer y aceptar"
      body="Toca aquí para revisarlo en Contratos Activos. Mientras esté pendiente, no podrás hacer nuevas reservas."
      onPress={onPress}
      accessibilityHint="Abre Contratos Activos"
    />
  );
}

/**
 * Aviso fijo del box: info, con imagen opcional bajo el texto y hasta 4 líneas de cuerpo. Con `onPress` es un botón (flecha pequeña de Inicio, presionado sólido) que abre el aviso completo en la hoja de solo lectura (decisión (af));
 * sin `onPress` (los ejemplos de desarrollo antiguos) se dibuja como antes.
 */
export function PinnedAvisoBanner({ announcement, onPress }: { announcement: BoxAnnouncement; onPress?: () => void }) {
  const text = [announcement.title, announcement.body].filter(Boolean).join('. ');
  return (
    <NoticeBanner
      level="info"
      kind="fijo"
      icon="bell"
      title={announcement.title}
      body={announcement.body}
      bodyMaxLines={4}
      image={announcement.imageUrl}
      onPress={onPress}
      arrow
      accessibilityLabel={onPress ? `Aviso del box: ${text}. Ver aviso completo` : undefined}
    />
  );
}

/** Aviso del plan: info. Con las dos reglas, las dos líneas van en la misma tarjeta, las dos con el estilo de título (una bajo la otra). Sin ninguna regla no dibuja nada. */
export function PlanNoticeBanner({ plan }: { plan: MyPlan }) {
  const lines = planNoticeLines(plan);
  if (lines.length === 0) return null;
  return <NoticeBanner level="info" kind="plan" icon="alert-circle" title={lines} />;
}
