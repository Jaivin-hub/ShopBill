import React from 'react';
import { AlertCircle, CheckCircle, Info, X, XCircle } from 'lucide-react';

const STYLES = {
    success: {
        wrap: (dm) =>
            dm
                ? 'border-emerald-500/40 bg-emerald-950/40'
                : 'border-emerald-200 bg-emerald-50',
        icon: 'text-emerald-500',
        iconBg: (dm) => (dm ? 'bg-emerald-500/15' : 'bg-emerald-100'),
        title: (dm) => (dm ? 'text-emerald-200' : 'text-emerald-900'),
        body: (dm) => (dm ? 'text-emerald-300/90' : 'text-emerald-800'),
    },
    info: {
        wrap: (dm) =>
            dm ? 'border-indigo-500/40 bg-indigo-950/40' : 'border-indigo-200 bg-indigo-50',
        icon: 'text-indigo-500',
        iconBg: (dm) => (dm ? 'bg-indigo-500/15' : 'bg-indigo-100'),
        title: (dm) => (dm ? 'text-indigo-200' : 'text-indigo-900'),
        body: (dm) => (dm ? 'text-indigo-300/90' : 'text-indigo-800'),
    },
    warning: {
        wrap: (dm) =>
            dm ? 'border-amber-500/40 bg-amber-950/40' : 'border-amber-200 bg-amber-50',
        icon: 'text-amber-500',
        iconBg: (dm) => (dm ? 'bg-amber-500/15' : 'bg-amber-100'),
        title: (dm) => (dm ? 'text-amber-200' : 'text-amber-900'),
        body: (dm) => (dm ? 'text-amber-300/90' : 'text-amber-800'),
    },
    cancelled: {
        wrap: (dm) =>
            dm ? 'border-orange-500/40 bg-orange-950/30' : 'border-orange-200 bg-orange-50',
        icon: 'text-orange-500',
        iconBg: (dm) => (dm ? 'bg-orange-500/15' : 'bg-orange-100'),
        title: (dm) => (dm ? 'text-orange-200' : 'text-orange-900'),
        body: (dm) => (dm ? 'text-orange-300/90' : 'text-orange-800'),
    },
    danger: {
        wrap: (dm) =>
            dm ? 'border-rose-500/50 bg-rose-950/40' : 'border-rose-200 bg-rose-50',
        icon: 'text-rose-500',
        iconBg: (dm) => (dm ? 'bg-rose-500/15' : 'bg-rose-100'),
        title: (dm) => (dm ? 'text-rose-200' : 'text-rose-900'),
        body: (dm) => (dm ? 'text-rose-300/90' : 'text-rose-800'),
    },
};

function BannerIcon({ variant, className = 'w-5 h-5 shrink-0' }) {
    if (variant === 'success') return <CheckCircle className={className} />;
    if (variant === 'danger' || variant === 'cancelled') return <XCircle className={className} />;
    if (variant === 'warning') return <AlertCircle className={className} />;
    return <Info className={className} />;
}

/**
 * Persistent billing notice on Plan & Billing (and reusable elsewhere).
 */
const BillingNoticeBanner = ({
    variant = 'info',
    title,
    message,
    darkMode = true,
    onDismiss,
    className = '',
    footer = null,
}) => {
    if (!message) return null;
    const style = STYLES[variant] || STYLES.info;

    return (
        <div
            role="status"
            className={`rounded-xl border p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${style.wrap(darkMode)} ${className}`}
        >
            <div className={`flex-shrink-0 p-2 rounded-lg ${style.iconBg(darkMode)}`}>
                <BannerIcon variant={variant} className={`w-5 h-5 shrink-0 ${style.icon}`} />
            </div>
            <div className="flex-1 min-w-0">
                {title && (
                    <h3 className={`text-sm font-bold mb-1 ${style.title(darkMode)}`}>{title}</h3>
                )}
                <p className={`text-xs leading-relaxed font-medium ${style.body(darkMode)}`}>{message}</p>
                {footer ? <div className="mt-3">{footer}</div> : null}
            </div>
            {onDismiss && (
                <button
                    type="button"
                    onClick={onDismiss}
                    className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-black/5 text-slate-500'}`}
                    aria-label="Dismiss notice"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

export default BillingNoticeBanner;
