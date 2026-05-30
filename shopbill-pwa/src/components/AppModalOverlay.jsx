import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Full-screen modal shell: portals above app header/footer, blurs background, fits viewport.
 */
const AppModalOverlay = ({
    open = true,
    onClose,
    closeOnBackdrop = true,
    lockBody = true,
    busy = false,
    ariaLabelledby,
    panelClassName = '',
    children,
}) => {
    useEffect(() => {
        if (!open || !lockBody) return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open, lockBody]);

    if (!open) return null;

    const overlay = (
        <div
            className="fixed inset-0 z-[280] flex items-center justify-center bg-black/60 backdrop-blur-md p-3 max-md:pt-[calc(var(--app-mobile-header-offset,0px)+0.75rem)] max-md:pb-[calc(var(--app-mobile-footer-offset,0px)+0.75rem)] sm:p-4"
            style={{ WebkitBackdropFilter: 'blur(12px)' }}
            role="presentation"
            onClick={closeOnBackdrop && !busy && onClose ? onClose : undefined}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={ariaLabelledby}
                className={`max-h-full min-h-0 w-full flex flex-col ${panelClassName}`.trim()}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(overlay, document.body) : overlay;
};

export default AppModalOverlay;
