import { createPortal } from 'react-dom';

/** Render modals on document.body so fixed overlays sit above the mobile tab bar (z-50). */
export default function ModalPortal({ children }) {
  if (typeof document === 'undefined') return children;
  return createPortal(children, document.body);
}
