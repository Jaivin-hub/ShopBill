import { Loader2 } from 'lucide-react';

/** Centered loader for chat areas (replaces skeleton placeholders). */
export default function ChatSpinner({ darkMode, label = 'Loading…', className = 'py-16 min-h-[12rem]' }) {
    return (
        <div
            className={`flex flex-col items-center justify-center gap-3 ${className}`}
            role="status"
            aria-live="polite"
            aria-busy="true"
        >
            <Loader2 className="h-7 w-7 animate-spin text-indigo-500" aria-hidden />
            {label ? (
                <p
                    className={`text-[10px] font-black uppercase tracking-widest ${
                        darkMode ? 'text-slate-500' : 'text-slate-600'
                    }`}
                >
                    {label}
                </p>
            ) : null}
        </div>
    );
}
