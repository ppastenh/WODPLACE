/** Lo que se lee del plan de la alumna (un MyPlan de la API cumple esta forma; se declara aquí para que el módulo sea puro y se pueda probar sin la librería de la API). */
export type PlanNoticeInput = { classesPerPeriod?: number | null; classesRemaining?: number | null; daysUntilRenewal?: number | null };

/**
 * Las líneas del aviso del plan, con sus reglas de siempre: "Te quedan N clase(s) este período." (plan por cantidad con 2 clases o menos) y "Tu plan vence hoy / en N día(s)." (7 días o menos).
 * Sale vacía si no se cumple ninguna. La usa PlanNoticeBanner (NoticeBanners.tsx), para que los textos y las reglas sean los mismos.
 */
export function planNoticeLines(plan: PlanNoticeInput): string[] {
  const lines: string[] = [];
  if (plan.classesPerPeriod != null && plan.classesRemaining != null && plan.classesRemaining <= 2) {
    lines.push(`Te quedan ${plan.classesRemaining} clase${plan.classesRemaining === 1 ? '' : 's'} este período.`);
  }
  if (plan.daysUntilRenewal != null && plan.daysUntilRenewal <= 7) {
    lines.push(`Tu plan ${plan.daysUntilRenewal <= 0 ? 'vence hoy' : `vence en ${plan.daysUntilRenewal} día${plan.daysUntilRenewal === 1 ? '' : 's'}`}.`);
  }
  return lines;
}
