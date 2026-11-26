import { createContext, useContext } from 'react';
import type { AvisoBorderMode, AvisoSizeStep } from '@/components/home/avisoLookSpec';

/** Ajuste de los avisos (pedido 51). Por defecto (letra 0, borde "actual") Inicio se dibuja exactamente como siempre; solo la pantalla de desarrollo "Todos los avisos" lo cambia. */
export type AvisoLook = { step: AvisoSizeStep; border: AvisoBorderMode };
export const AVISO_LOOK_DEFAULT: AvisoLook = { step: 0, border: 'actual' };
export const AvisoLookContext = createContext<AvisoLook>(AVISO_LOOK_DEFAULT);
export const useAvisoLook = (): AvisoLook => useContext(AvisoLookContext);
