import React from 'react';

/** Tailwind pulse block — matches Dashboard skeleton style */
export const skel = (darkMode, className = '') =>
  `rounded-xl animate-pulse ${darkMode ? 'bg-slate-800' : 'bg-slate-200'} ${className}`.trim();

/** Full ledger shell: sticky header + filter row + list rows */
export function LedgerInitialSkeleton({ darkMode }) {
  const themeBase = darkMode ? 'bg-gray-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const borderStyle = darkMode ? 'border-slate-800' : 'border-slate-200';
  return (
    <div className={`flex flex-col ${themeBase} w-full h-full overflow-hidden`}>
      <div className={`w-full flex flex-col h-full ${darkMode ? 'bg-gray-950' : 'bg-slate-50'} overflow-hidden`}>
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          <div className={`sticky top-0 left-0 right-0 border-b ${borderStyle} ${darkMode ? 'bg-gray-950 backdrop-blur-xl' : 'bg-white backdrop-blur-xl'} shadow-lg z-[100] shrink-0`}>
            <div className="p-4 md:p-6 pb-3 md:pb-4">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 space-y-2.5 min-w-0">
                  <div className={`h-8 w-48 md:w-56 ${skel(darkMode)}`} />
                  <div className={`h-2.5 w-40 ${skel(darkMode)}`} />
                </div>
                <div className={`h-10 w-10 shrink-0 ${skel(darkMode, 'rounded-xl')}`} />
                <div className={`h-10 w-24 shrink-0 hidden md:block ${skel(darkMode, 'rounded-xl')}`} />
                <div className={`h-8 w-32 shrink-0 hidden md:block ${skel(darkMode)}`} />
              </div>
              <div className={`flex p-1 rounded-xl gap-1 border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                <div className={`flex-1 h-9 ${skel(darkMode, 'rounded-lg')}`} />
                <div className={`flex-1 h-9 ${skel(darkMode, 'rounded-lg')}`} />
              </div>
            </div>
          </div>
          <div className="p-4 md:p-6 space-y-3">
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                className={`h-16 rounded-xl border animate-pulse ${darkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-100 border-slate-200'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Chat: sidebar + main panel */
export function ChatInitialSkeleton({ darkMode }) {
  const themeBase = darkMode ? 'bg-gray-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const cardBase = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const borderSide = darkMode ? 'border-slate-800' : 'border-slate-200';
  return (
    <div className={`flex flex-col md:flex-row ${themeBase} w-full h-full overflow-hidden`}>
      <aside className={`w-full md:w-80 shrink-0 flex flex-col border-b md:border-b-0 md:border-r ${borderSide} h-full min-h-0`}>
        <div className={`p-4 border-b ${borderSide} space-y-3`}>
          <div className={`h-10 w-full ${skel(darkMode, 'rounded-xl')}`} />
          <div className={`h-9 w-full ${skel(darkMode, 'rounded-xl')}`} />
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={`p-3 rounded-xl border ${cardBase} flex gap-3`}>
              <div className={`h-10 w-10 shrink-0 ${skel(darkMode, 'rounded-full')}`} />
              <div className="flex-1 space-y-2 min-w-0">
                <div className={`h-3 w-3/4 max-w-[140px] ${skel(darkMode)}`} />
                <div className={`h-2.5 w-1/2 max-w-[100px] ${skel(darkMode)}`} />
              </div>
            </div>
          ))}
        </div>
      </aside>
      <div className={`hidden md:flex flex-1 flex-col min-h-0 border-l ${borderSide}`}>
        <div className={`shrink-0 p-4 border-b ${borderSide} flex items-center gap-3`}>
          <div className={`h-10 w-10 ${skel(darkMode, 'rounded-full')}`} />
          <div className="flex-1 space-y-2">
            <div className={`h-4 w-40 ${skel(darkMode)}`} />
            <div className={`h-2.5 w-24 ${skel(darkMode)}`} />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-4 overflow-hidden">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[70%] h-12 rounded-2xl ${skel(darkMode)}`} style={{ width: `${45 + (i % 3) * 12}%` }} />
            </div>
          ))}
        </div>
        <div className={`shrink-0 p-4 border-t ${borderSide}`}>
          <div className={`h-12 w-full ${skel(darkMode, 'rounded-xl')}`} />
        </div>
      </div>
    </div>
  );
}

/** Reports: KPI row + payment strip + chart + sections */
export function ReportsInitialSkeleton({ darkMode }) {
  const themeBase = darkMode ? 'bg-gray-950 text-gray-200' : 'bg-slate-50 text-slate-900';
  const cardBase = darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-slate-200 shadow-sm';
  const headerBase = darkMode ? 'bg-gray-950 border-gray-800/60' : 'bg-white border-slate-200 shadow-sm';
  const subCardBase = darkMode ? 'bg-gray-950 border-gray-800' : 'bg-slate-100 border-slate-200';
  return (
    <div className={`h-full flex flex-col min-h-0 ${themeBase} transition-colors duration-200`}>
      <header className={`sticky top-0 z-[100] shrink-0 ${headerBase} px-4 md:px-8 py-4 border-b backdrop-blur-md`}>
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="space-y-2">
              <div className={`h-7 w-48 ${skel(darkMode)}`} />
              <div className={`h-2.5 w-32 ${skel(darkMode)}`} />
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-10 flex-1 md:w-72 ${skel(darkMode, 'rounded-lg')}`} />
              <div className={`h-10 w-10 ${skel(darkMode, 'rounded-xl')}`} />
              <div className={`h-10 w-28 hidden md:block ${skel(darkMode, 'rounded-xl')}`} />
              <div className={`h-10 w-10 ${skel(darkMode, 'rounded-lg')}`} />
            </div>
          </div>
        </div>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 pb-20">
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`${cardBase} p-5 rounded-xl border`}>
                <div className={`h-2.5 w-20 mb-4 ${skel(darkMode)}`} />
                <div className={`h-8 w-28 ${skel(darkMode)}`} />
              </div>
            ))}
          </section>
          <section className={`${cardBase} rounded-xl p-4 md:p-5 border`}>
            <div className={`h-2.5 w-36 mb-3 ${skel(darkMode)}`} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`rounded-lg border p-3 ${subCardBase}`}>
                  <div className={`h-2 w-12 mb-2 ${skel(darkMode)}`} />
                  <div className={`h-5 w-20 ${skel(darkMode)}`} />
                </div>
              ))}
            </div>
          </section>
          <section className={`${cardBase} rounded-xl overflow-hidden border`}>
            <div className={`p-6 border-b ${darkMode ? 'border-gray-800' : 'border-slate-100'} flex justify-between gap-4`}>
              <div className={`h-5 w-40 ${skel(darkMode)}`} />
              <div className={`h-8 w-48 ${skel(darkMode, 'rounded-md')}`} />
            </div>
            <div className="p-6 h-[300px] md:h-[350px]">
              <div className={`h-full w-full ${skel(darkMode, 'rounded-xl')}`} />
            </div>
          </section>
          <div className={`${cardBase} rounded-xl p-6 border space-y-4`}>
            <div className={`h-5 w-48 ${skel(darkMode)}`} />
            <div className={`h-24 w-full ${skel(darkMode, 'rounded-lg')}`} />
            <div className={`h-24 w-full ${skel(darkMode, 'rounded-lg')}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Stock hub product grid only (used while list refreshes with real header visible) */
export function StockHubListSkeleton({ darkMode }) {
  const cardBase = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  return (
    <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className={`rounded-2xl border p-4 ${cardBase}`}>
          <div className={`h-24 w-full mb-3 ${skel(darkMode, 'rounded-xl')}`} />
          <div className={`h-4 w-full mb-2 ${skel(darkMode)}`} />
          <div className={`h-3 w-2/3 ${skel(darkMode)}`} />
        </div>
      ))}
    </div>
  );
}

/** Stock hub: header + search + product grid */
export function StockHubInitialSkeleton({ darkMode }) {
  const themeBase = darkMode ? 'bg-gray-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  return (
    <div className={`h-full flex flex-col min-h-0 ${themeBase}`}>
      <header className={`sticky top-0 z-[100] shrink-0 border-b px-4 md:px-8 py-4 backdrop-blur-xl ${darkMode ? 'bg-gray-950/95 border-slate-800' : 'bg-white/95 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className={`h-8 w-56 ${skel(darkMode)}`} />
            <div className={`h-2.5 w-40 ${skel(darkMode)}`} />
          </div>
          <div className="flex gap-2">
            <div className={`h-10 w-10 ${skel(darkMode, 'rounded-xl')}`} />
            <div className={`h-10 w-10 ${skel(darkMode, 'rounded-xl')}`} />
            <div className={`h-10 w-32 ${skel(darkMode, 'rounded-xl')}`} />
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-4">
          <div className={`h-11 w-full max-w-xl ${skel(darkMode, 'rounded-xl')}`} />
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <StockHubListSkeleton darkMode={darkMode} />
      </div>
    </div>
  );
}

/** Supply chain scroll-area layout (purchase tab: form column + stock overview) */
export function SupplyChainContentSkeleton({ darkMode }) {
  const cardBase = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        <div className={`rounded-2xl border p-5 md:p-6 ${cardBase} space-y-5`}>
          <div className={`h-4 w-32 ${skel(darkMode)}`} />
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="space-y-2">
              <div className={`h-2.5 w-24 ${skel(darkMode)}`} />
              <div className={`h-12 w-full ${skel(darkMode, 'rounded-xl')}`} />
            </div>
          ))}
          <div className={`h-14 w-full ${skel(darkMode, 'rounded-xl')}`} />
        </div>
        <div className={`hidden lg:flex rounded-2xl border overflow-hidden flex-col ${cardBase}`}>
          <div className={`p-5 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'} space-y-3`}>
            <div className="flex justify-between gap-2">
              <div className={`h-4 w-36 ${skel(darkMode)}`} />
              <div className={`h-8 w-24 ${skel(darkMode, 'rounded-lg')}`} />
            </div>
            <div className={`h-10 w-full ${skel(darkMode, 'rounded-xl')}`} />
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className={`h-28 rounded-xl border p-4 ${darkMode ? 'border-slate-800 bg-gray-950/30' : 'border-slate-100 bg-slate-50'}`}>
                <div className={`h-3 w-3/4 mb-3 ${skel(darkMode)}`} />
                <div className={`h-8 w-16 mb-2 ${skel(darkMode)}`} />
                <div className={`h-2.5 w-20 ${skel(darkMode)}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Supply chain: full page first load */
export function SupplyChainInitialSkeleton({ darkMode }) {
  const themeBase = darkMode ? 'bg-gray-950 text-slate-200' : 'bg-slate-50 text-slate-900';
  const headerBg = darkMode ? 'bg-gray-950/95 border-slate-800/60' : 'bg-slate-50/95 border-slate-200';
  return (
    <div className={`h-full flex flex-col min-h-0 transition-colors duration-300 ${themeBase}`}>
      <header className={`sticky top-0 z-[100] shrink-0 backdrop-blur-xl border-b px-4 md:px-8 py-4 ${headerBg}`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
          <div className="space-y-2">
            <div className={`h-8 w-48 ${skel(darkMode)}`} />
            <div className={`h-2.5 w-40 ${skel(darkMode)}`} />
          </div>
          <div className={`h-10 w-56 md:w-72 ${skel(darkMode, 'rounded-xl')}`} />
        </div>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar px-4 md:px-8 py-6">
        <SupplyChainContentSkeleton darkMode={darkMode} />
      </div>
    </div>
  );
}

/** Billing POS: header + two columns */
export function BillingTerminalInitialSkeleton({ darkMode }) {
  const themeBase = darkMode ? 'bg-gray-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const cardBase = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  return (
    <div className={`h-full flex flex-col min-h-0 ${themeBase}`}>
      <header className={`sticky top-0 z-[100] shrink-0 w-full backdrop-blur-xl border-b px-4 md:px-8 py-4 ${darkMode ? 'border-slate-800/60 bg-gray-950/95' : 'border-slate-200 bg-slate-50/95'}`}>
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className={`h-8 w-44 ${skel(darkMode)}`} />
              <div className={`h-2.5 w-32 ${skel(darkMode)}`} />
            </div>
            <div className={`h-10 w-28 ${skel(darkMode, 'rounded-xl')}`} />
          </div>
          <div className={`h-12 w-full max-w-2xl ${skel(darkMode, 'rounded-xl')}`} />
        </div>
      </header>
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 p-4 md:p-6 overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
          <div className={`h-10 w-full ${skel(darkMode, 'rounded-xl')}`} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto content-start">
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className={`h-28 rounded-xl border ${cardBase} ${skel(darkMode, 'border-0')}`} />
            ))}
          </div>
        </div>
        <div className={`w-full lg:w-[380px] shrink-0 rounded-2xl border p-4 ${cardBase}`}>
          <div className={`h-6 w-24 mb-4 ${skel(darkMode)}`} />
          <div className="space-y-3 mb-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`h-12 ${skel(darkMode, 'rounded-lg')}`} />
            ))}
          </div>
          <div className={`h-12 w-full ${skel(darkMode, 'rounded-xl')}`} />
        </div>
      </div>
    </div>
  );
}

/** Profile center */
export function ProfileInitialSkeleton({ darkMode }) {
  const mainBg = darkMode ? 'bg-gray-950 text-gray-200' : 'bg-slate-50 text-slate-900';
  const headerBg = darkMode ? 'bg-gray-950/90 border-gray-800/60' : 'bg-white/90 border-slate-200 shadow-sm';
  const sectionBg = darkMode ? 'bg-gray-900/40 border-gray-800' : 'bg-white border-slate-200 shadow-sm';
  return (
    <div className={`h-full flex flex-col min-h-0 ${mainBg}`}>
      <header className={`sticky top-0 z-[100] shrink-0 backdrop-blur-md border-b px-6 py-6 ${headerBg}`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="space-y-2">
            <div className={`h-8 w-48 ${skel(darkMode)}`} />
            <div className={`h-2.5 w-36 ${skel(darkMode)}`} />
          </div>
          <div className={`h-10 w-24 ${skel(darkMode, 'rounded-xl')}`} />
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`rounded-xl border overflow-hidden ${sectionBg}`}>
              <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-800' : 'border-slate-200'}`}>
                <div className={`h-4 w-40 ${skel(darkMode)}`} />
              </div>
              <div className="p-6 space-y-4">
                <div className={`h-10 w-full ${skel(darkMode, 'rounded-lg')}`} />
                <div className={`h-10 w-full ${skel(darkMode, 'rounded-lg')}`} />
                <div className={`h-24 w-full ${skel(darkMode, 'rounded-lg')}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Offers manager */
export function OffersInitialSkeleton({ darkMode }) {
  const cardBase = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  return (
    <div className={`h-full min-h-0 overflow-y-auto px-4 md:px-8 py-6 ${darkMode ? 'bg-gray-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        <section className={`${cardBase} border rounded-2xl p-5`}>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className={`h-8 w-52 ${skel(darkMode)}`} />
              <div className={`h-2.5 w-40 ${skel(darkMode)}`} />
            </div>
            <div className="flex gap-2">
              <div className={`h-10 w-12 sm:w-36 ${skel(darkMode, 'rounded-xl')}`} />
              <div className={`h-10 w-10 ${skel(darkMode, 'rounded-xl')}`} />
            </div>
          </div>
        </section>

        <section className={`${cardBase} border rounded-2xl p-4 md:p-5`}>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className={`h-4 w-4 rounded ${skel(darkMode)}`} />
              <div className={`h-3.5 w-24 ${skel(darkMode)}`} />
            </div>
            <div className={`h-11 w-full sm:max-w-sm ${skel(darkMode, 'rounded-xl')}`} />
          </div>

          <div className="flex gap-3 overflow-hidden pb-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`shrink-0 w-[min(100%,380px)] border rounded-xl p-4 ${darkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-white'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className={`h-4 w-40 max-w-[90%] ${skel(darkMode)}`} />
                    <div className={`h-3 w-32 ${skel(darkMode)}`} />
                    <div className={`h-3 w-52 max-w-full ${skel(darkMode)}`} />
                  </div>
                  <div className={`h-8 w-8 rounded-lg ${skel(darkMode)}`} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/** Team / staff directory cards */
export function TeamDirectorySkeleton({ darkMode }) {
  const cardBase = darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  return (
    <div className="grid grid-cols-1 gap-3 md:gap-4">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className={`p-4 md:p-5 rounded-xl md:rounded-2xl border ${cardBase} flex gap-4 items-center`}>
          <div className={`h-12 w-12 md:h-14 md:w-14 shrink-0 ${skel(darkMode, 'rounded-full')}`} />
          <div className="flex-1 space-y-2 min-w-0">
            <div className={`h-4 w-40 max-w-[60%] ${skel(darkMode)}`} />
            <div className={`h-3 w-28 ${skel(darkMode)}`} />
            <div className={`h-3 w-full max-w-md ${skel(darkMode)}`} />
          </div>
          <div className={`h-9 w-20 shrink-0 ${skel(darkMode, 'rounded-lg')}`} />
        </div>
      ))}
    </div>
  );
}

/** Team management: sticky header + directory list (first load) */
export function TeamManagementInitialSkeleton({ darkMode }) {
  const themeBase = darkMode ? 'bg-gray-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const borderStyle = darkMode ? 'border-slate-800/60' : 'border-slate-200';
  const headerBg = darkMode ? 'bg-gray-950' : 'bg-white';
  return (
    <div className={`h-full flex flex-col min-h-0 ${themeBase}`}>
      <header className={`sticky top-0 z-[100] shrink-0 backdrop-blur-xl border-b px-4 md:px-6 py-4 ${headerBg} ${borderStyle} shadow-lg ${darkMode ? 'bg-gray-950/95' : 'bg-white/95'}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 shrink-0 ${skel(darkMode, 'rounded-xl')}`} />
            <div className="space-y-2">
              <div className={`h-7 w-48 md:w-56 ${skel(darkMode)}`} />
              <div className={`h-2.5 w-40 ${skel(darkMode)}`} />
            </div>
          </div>
          <div className={`h-10 w-32 shrink-0 hidden sm:block ${skel(darkMode, 'rounded-xl')}`} />
        </div>
      </header>
      <div className="flex-1 min-h-0 overflow-hidden px-4 md:px-6 py-4 md:py-6">
        <div className="max-w-7xl mx-auto">
          <TeamDirectorySkeleton darkMode={darkMode} />
        </div>
      </div>
    </div>
  );
}

/** Store control / outlet grid (Store Management sub-view) */
export function StoreControlInitialSkeleton({ darkMode }) {
  const cardBase = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className={`h-11 w-40 ${skel(darkMode, 'rounded-xl')}`} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`p-5 rounded-3xl border ${cardBase}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`h-12 w-12 ${skel(darkMode, 'rounded-2xl')}`} />
                <div className="space-y-2">
                  <div className={`h-4 w-36 ${skel(darkMode)}`} />
                  <div className={`h-3 w-48 max-w-full ${skel(darkMode)}`} />
                </div>
              </div>
              <div className={`h-6 w-20 ${skel(darkMode, 'rounded-full')}`} />
            </div>
            <div className="flex gap-2 mt-6">
              <div className={`flex-1 h-10 ${skel(darkMode, 'rounded-xl')}`} />
              <div className={`h-10 w-10 ${skel(darkMode, 'rounded-xl')}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Generic settings-style list (two columns of cards) */
export function SettingsHomeSkeleton({ darkMode }) {
  const sectionClass = `${darkMode ? 'bg-gray-900/40 border-gray-800' : 'bg-white border-slate-300 shadow-md'} border rounded-xl overflow-hidden`;
  return (
    <div className={`h-full flex flex-col min-h-0 ${darkMode ? 'bg-gray-950' : 'bg-slate-50'}`}>
      <header className={`sticky top-0 z-[100] shrink-0 border-b px-6 py-5 backdrop-blur-md ${darkMode ? 'bg-gray-950/95 border-gray-800' : 'bg-white/95 border-slate-200'}`}>
        <div className={`h-7 w-40 ${skel(darkMode)}`} />
        <div className={`h-2.5 w-56 mt-2 ${skel(darkMode)}`} />
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
          {[1, 2, 3, 4].map((i) => (
            <section key={i} className={sectionClass}>
              <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-800' : 'border-slate-200'}`}>
                <div className={`h-4 w-36 ${skel(darkMode)}`} />
              </div>
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className={`h-14 rounded-lg ${skel(darkMode)}`} />
                ))}
              </div>
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}

/** Sales history rows (inside existing page header) */
export function SalesHistoryListSkeleton({ darkMode }) {
  const cardBase = darkMode ? 'bg-gray-900/30 border-gray-800/40' : 'bg-white border-slate-200 shadow-sm';
  return (
    <div className="space-y-2">
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className={`flex items-center justify-between p-4 border rounded-2xl ${cardBase}`}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`h-10 w-10 shrink-0 rounded-xl ${skel(darkMode)}`} />
            <div className="space-y-2 flex-1 min-w-0">
              <div className={`h-3.5 w-40 max-w-[70%] ${skel(darkMode)}`} />
              <div className={`h-2.5 w-56 max-w-[90%] ${skel(darkMode)}`} />
            </div>
          </div>
          <div className={`h-8 w-16 shrink-0 ${skel(darkMode, 'rounded-lg')}`} />
        </div>
      ))}
    </div>
  );
}
