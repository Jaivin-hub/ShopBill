import React from 'react';
import { CloudOff, RefreshCw, Wifi } from 'lucide-react';
import { isBrowserOnline } from '../offline/connectivity';

export default function OfflineUnavailableState({
  darkMode,
  title = 'You are offline',
  description = 'This page needs data from your last online visit. Connect to the internet, open this page once, then you can use it offline.',
  onRetry,
  compact = false,
}) {
  const online = isBrowserOnline();

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? 'min-h-[280px] p-6' : 'min-h-[min(70vh,520px)] flex-1 p-8'
      } ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}
    >
      <div
        className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border ${
          darkMode ? 'bg-slate-900 border-slate-700 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600'
        }`}
      >
        {online ? <Wifi className="h-7 w-7" aria-hidden /> : <CloudOff className="h-7 w-7" aria-hidden />}
      </div>
      <h2 className={`text-lg font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
      <p className={`mt-2 max-w-md text-sm font-bold leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
        {description}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:bg-indigo-500 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          {online ? 'Try again' : 'Retry when online'}
        </button>
      )}
    </div>
  );
}
