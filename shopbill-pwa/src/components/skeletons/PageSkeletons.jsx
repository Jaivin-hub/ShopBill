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

/** Sticky Groups/Staff + search row — pulse placeholders (matches ChatListSidebar chrome) */
export function ChatSidebarHeaderSkeleton({ darkMode }) {
  const stickyHeaderBorder = darkMode ? 'border-slate-800/60 bg-gray-950 backdrop-blur-xl' : 'border-slate-200 bg-white backdrop-blur-xl';
  const segmentWrap = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200';
  return (
    <div className={`sticky top-0 z-[100] border-b shadow-lg ${stickyHeaderBorder}`} aria-hidden>
      <div className="p-4 pb-3 md:p-6 md:pb-4">
        <div className="flex items-center gap-2">
          <div className={`flex flex-1 gap-1 rounded-xl border p-1 ${segmentWrap}`}>
            <div className={`min-h-[36px] flex-1 rounded-lg ${skel(darkMode)}`} />
            <div className={`min-h-[36px] flex-1 rounded-lg ${skel(darkMode)}`} />
          </div>
          <div className={`h-10 w-10 shrink-0 rounded-xl ${skel(darkMode)}`} />
        </div>
      </div>
    </div>
  );
}

/** Group chat list row placeholders */
export function ChatSidebarGroupsRowsSkeleton({ darkMode, count = 8 }) {
  return (
    <div className="flex min-h-0 flex-col">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={`flex w-full items-center gap-4 border-l-2 border-transparent px-5 py-4 ${
            darkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-100'
          }`}
        >
          <div className="relative shrink-0">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${skel(darkMode)}`} />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <div className={`h-3.5 max-w-[160px] flex-1 rounded ${skel(darkMode)}`} />
              <div className={`h-2.5 w-10 shrink-0 rounded ${skel(darkMode)}`} />
            </div>
            <div className={`h-2.5 max-w-[220px] rounded ${skel(darkMode)}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Staff list row placeholders */
export function ChatSidebarStaffRowsSkeleton({ darkMode, count = 8 }) {
  return (
    <div className="flex min-h-0 flex-col">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={`flex w-full items-center gap-4 border-l-2 border-transparent px-5 py-4 ${
            darkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-100'
          }`}
        >
          <div className={`h-10 w-10 shrink-0 rounded-xl ${skel(darkMode)}`} />
          <div className="min-w-0 flex-1 space-y-2">
            <div className={`h-3.5 max-w-[180px] rounded ${skel(darkMode)}`} />
            <div className={`h-2.5 max-w-[120px] rounded ${skel(darkMode)}`} />
          </div>
          <div className={`h-4 w-4 shrink-0 rounded ${skel(darkMode)}`} />
        </div>
      ))}
    </div>
  );
}

/** Chat list shell skeleton (sidebar + empty panel). Open-thread message placeholders: ChatThreadMessagesSkeleton. */
export function ChatThreadMessagesSkeleton({ darkMode }) {
  const rows = [1, 2, 3, 4, 5, 6, 7, 8];
  return (
    <div className="flex w-full flex-col space-y-3 px-2 py-2 md:px-4">
      {rows.map((i) => {
        const own = i % 3 === 0;
        return (
          <div key={i} className={`flex w-full ${own ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[78%] space-y-2 rounded-2xl border px-4 py-3 ${
                own
                  ? darkMode
                    ? 'border-indigo-500/30 bg-indigo-600/20'
                    : 'border-indigo-200 bg-indigo-50'
                  : darkMode
                    ? 'border-slate-800 bg-slate-900/80'
                    : 'border-slate-200 bg-white'
              }`}
            >
              <div className={`h-3 w-full max-w-[220px] rounded-md ${skel(darkMode)}`} />
              <div className={`h-3 w-full max-w-[160px] rounded-md ${skel(darkMode)}`} />
              {i % 2 === 0 ? <div className={`mt-2 h-16 w-full max-w-[200px] rounded-lg ${skel(darkMode)}`} /> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ChatInitialSkeleton({ darkMode }) {
  const themeBase = darkMode ? 'bg-gray-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const sidebarBg = darkMode ? 'bg-gray-950' : 'bg-slate-50';

  return (
    <div className={`flex h-full w-full flex-col overflow-hidden ${themeBase}`}>
      {/* Sidebar-only initial state (matches desktop no-thread layout) */}
      <div className={`flex h-full w-full shrink-0 flex-col overflow-hidden ${sidebarBg}`}>
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
          <ChatSidebarHeaderSkeleton darkMode={darkMode} />

          <ChatSidebarGroupsRowsSkeleton darkMode={darkMode} count={8} />
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
        <div className="w-full space-y-3">
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
        <div className="w-full p-4 md:p-8 space-y-6 pb-20">
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
    <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
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
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4">
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
        <div className="w-full mt-4">
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
    <div className="w-full space-y-8 pb-12">
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
        <div className="w-full flex justify-between items-center gap-4">
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
  return (
    <div className={`h-full flex flex-col min-h-0 ${themeBase}`}>
      <header className={`sticky top-0 z-[100] shrink-0 w-full backdrop-blur-xl border-b px-4 md:px-8 py-4 ${darkMode ? 'border-slate-800/60 bg-gray-950/95' : 'border-slate-200 bg-slate-50/95'}`}>
        <div className="w-full space-y-4">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className={`h-8 w-52 ${skel(darkMode)}`} />
              <div className={`h-2.5 w-52 ${skel(darkMode)}`} />
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-10 w-10 ${skel(darkMode, 'rounded-xl')}`} />
              <div className={`h-10 w-10 ${skel(darkMode, 'rounded-xl')}`} />
              <div className={`h-10 w-10 ${skel(darkMode, 'rounded-xl')}`} />
            </div>
          </div>
          <div className={`h-12 w-full ${skel(darkMode, 'rounded-2xl')}`} />
        </div>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar px-4 md:px-8 py-6">
        <div className="w-full space-y-8 pb-36 md:pb-44">
          <section>
            <div className="flex items-center gap-2 mb-4 px-1">
              <div className={`h-4 w-4 ${skel(darkMode, 'rounded')}`} />
              <div className={`h-3 w-40 ${skel(darkMode)}`} />
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
              {Array.from({ length: 20 }, (_, i) => (
                <div key={i} className={`h-20 rounded-xl ${skel(darkMode)}`} />
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4 px-1">
              <div className={`h-4 w-4 ${skel(darkMode, 'rounded')}`} />
              <div className={`h-3 w-36 ${skel(darkMode)}`} />
            </div>
            <div className={`mb-3 h-8 w-40 ${skel(darkMode, 'rounded-xl')}`} />
            <div className="space-y-2">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className={`h-16 rounded-2xl ${skel(darkMode)}`} />
              ))}
            </div>
          </section>
        </div>
      </div>

      <footer className={`fixed bottom-0 left-0 right-0 md:left-64 z-[40] md:z-[100] border-t backdrop-blur-2xl ${darkMode ? 'bg-gray-950/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
        <div className="w-full flex flex-col md:flex-row items-center gap-3 md:gap-4 px-3 py-2.5 md:px-8 md:py-5">
          <div className="w-full md:flex-1 flex items-center gap-2 md:gap-4">
            <div className={`flex-1 h-14 md:h-[68px] ${skel(darkMode, 'rounded-2xl')}`} />
          </div>
          <div className="w-full md:w-auto flex items-center gap-2 md:gap-3 h-11 md:h-[68px]">
            <div className={`h-full w-24 md:w-28 ${skel(darkMode, 'rounded-2xl')}`} />
            <div className={`h-full w-24 md:w-32 ${skel(darkMode, 'rounded-2xl')}`} />
            <div className={`h-full flex-1 md:w-[260px] ${skel(darkMode, 'rounded-2xl')}`} />
          </div>
        </div>
      </footer>
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
      <header className={`sticky top-0 z-[100] shrink-0 backdrop-blur-md border-b px-4 md:px-6 py-6 ${headerBg}`}>
        <div className="w-full flex justify-between items-center">
          <div className="space-y-2">
            <div className={`h-8 w-48 ${skel(darkMode)}`} />
            <div className={`h-2.5 w-36 ${skel(darkMode)}`} />
          </div>
          <div className={`h-10 w-24 ${skel(darkMode, 'rounded-xl')}`} />
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
        <div className="w-full space-y-6">
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
    <div className={`h-full min-h-0 flex flex-col ${darkMode ? 'bg-gray-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <header className={`sticky top-0 z-[100] shrink-0 border-b px-3 sm:px-4 md:px-8 pt-3 pb-3 md:py-4 backdrop-blur-md ${darkMode ? 'bg-gray-950/95 border-slate-800/60' : 'bg-white/95 border-slate-200 shadow-sm'}`}>
        <div className="w-full space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 pr-2">
              <div className={`h-7 w-44 sm:w-48 ${skel(darkMode)}`} />
              <div className={`h-2.5 w-32 mt-1.5 ${skel(darkMode)}`} />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className={`h-11 w-11 ${skel(darkMode, 'rounded-xl')}`} />
              <div className={`h-11 w-11 ${skel(darkMode, 'rounded-xl')}`} />
            </div>
          </div>
          <div className={`grid grid-cols-3 gap-1 p-1 rounded-xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-slate-100 border-slate-200'}`}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={`h-11 rounded-lg ${skel(darkMode)}`} />
            ))}
          </div>
        </div>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
        <div className="w-full px-3 sm:px-4 md:px-8 py-4 md:py-8 space-y-4 md:space-y-6 pb-28 md:pb-20">
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
        <div className="w-full space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className={`h-7 w-48 md:w-56 ${skel(darkMode)}`} />
              <div className={`h-2.5 w-40 ${skel(darkMode)}`} />
            </div>
            <div className={`h-10 w-10 shrink-0 ${skel(darkMode, 'rounded-xl')}`} />
          </div>
          <div className={`h-11 w-full rounded-xl ${skel(darkMode)}`} />
        </div>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
        <div className="w-full p-4 md:p-6 space-y-4 md:space-y-6 pb-24 md:pb-32">
          <TeamDirectorySkeleton darkMode={darkMode} />
        </div>
      </div>
    </div>
  );
}

/** Store control / outlet grid (Store Management sub-view in Settings) */
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

/** Outlet Manager full page — “Store Network” header + branch card grid */
export function OutletManagerInitialSkeleton({ darkMode }) {
  const themeBase = darkMode ? 'bg-gray-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const headerBg = darkMode ? 'bg-gray-950/95 border-slate-800/60' : 'bg-slate-50/95 border-slate-200';
  const cardBase = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  return (
    <div className={`h-full flex min-h-0 flex-col transition-colors duration-300 ${themeBase}`}>
      <header className={`sticky top-0 z-[100] shrink-0 border-b backdrop-blur-xl px-4 md:px-8 py-4 ${headerBg}`}>
        <div className="w-full flex justify-between items-center gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className={`h-8 w-52 max-w-[85%] ${skel(darkMode)}`} />
            <div className={`h-2.5 w-64 max-w-full ${skel(darkMode)}`} />
          </div>
          <div className={`h-10 w-10 shrink-0 ${skel(darkMode, 'rounded-xl')}`} />
        </div>
      </header>
      <div className="custom-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="px-4 md:px-8 py-6 w-full">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className={`rounded-2xl border p-6 ${cardBase}`}>
                <div className="mb-6 flex items-start justify-between">
                  <div className={`h-14 w-14 ${skel(darkMode, 'rounded-3xl')}`} />
                  <div className="flex gap-2">
                    <div className={`h-10 w-10 ${skel(darkMode, 'rounded-xl')}`} />
                    <div className={`h-10 w-10 ${skel(darkMode, 'rounded-xl')}`} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className={`h-4 w-3/4 ${skel(darkMode)}`} />
                  <div className={`h-3 w-full ${skel(darkMode)}`} />
                  <div className={`h-3 w-5/6 ${skel(darkMode)}`} />
                </div>
                <div className={`mt-6 h-11 w-full ${skel(darkMode, 'rounded-xl')}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Subscription / plan upgrade page — header + current plan strip + plan cards */
export function PlanUpgradeInitialSkeleton({ darkMode }) {
  const mainBg = darkMode ? 'bg-gray-950' : 'bg-slate-50';
  const headerBase = darkMode ? 'border-slate-800 bg-gray-950/95' : 'border-slate-200 bg-white/95';
  const cardBase = darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white shadow-sm';
  const planCard = darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white shadow-sm';
  return (
    <div className={`flex h-full min-h-0 flex-col transition-colors duration-300 ${mainBg}`}>
      <header className={`sticky top-0 z-[100] shrink-0 border-b px-4 py-4 backdrop-blur-md md:px-6 ${headerBase}`}>
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className={`h-10 w-10 shrink-0 ${skel(darkMode, 'rounded-xl')}`} />
          <div className={`h-9 w-9 shrink-0 ${skel(darkMode, 'rounded-lg')}`} />
          <div className="min-w-0 flex-1 space-y-2">
            <div className={`h-6 w-64 max-w-[80%] ${skel(darkMode)}`} />
            <div className={`h-2.5 w-40 ${skel(darkMode)}`} />
          </div>
        </div>
      </header>
      <div className="custom-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="mx-auto max-w-7xl space-y-8 p-4 pb-20 md:space-y-10 md:p-8 lg:p-10">
          <section className={`rounded-xl border p-4 sm:rounded-2xl sm:p-6 ${cardBase}`}>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <div className={`h-14 w-14 shrink-0 sm:h-16 sm:w-16 ${skel(darkMode, 'rounded-xl')}`} />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className={`h-2.5 w-24 ${skel(darkMode)}`} />
                  <div className={`h-6 w-32 ${skel(darkMode)}`} />
                  <div className={`h-3 w-48 ${skel(darkMode)}`} />
                </div>
              </div>
              <div className={`h-11 w-full shrink-0 sm:w-48 ${skel(darkMode, 'rounded-xl')}`} />
            </div>
          </section>
          <div className="space-y-4">
            <div className={`h-6 w-48 ${skel(darkMode)}`} />
            <div className={`h-3 w-64 max-w-full ${skel(darkMode)}`} />
            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`flex flex-col rounded-2xl border p-5 ${planCard}`}>
                  <div className={`mb-4 h-10 w-10 ${skel(darkMode, 'rounded-xl')}`} />
                  <div className={`mb-2 h-5 w-24 ${skel(darkMode)}`} />
                  <div className={`mb-4 h-8 w-20 ${skel(darkMode)}`} />
                  <div className="mb-4 space-y-2">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className={`h-2.5 w-full ${skel(darkMode)}`} />
                    ))}
                  </div>
                  <div className={`mt-auto h-11 w-full ${skel(darkMode, 'rounded-xl')}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Generic settings-style list (two columns of cards) */
export function SettingsHomeSkeleton({ darkMode }) {
  const sectionClass = `${darkMode ? 'bg-gray-900/40 border-gray-800' : 'bg-white border-slate-300 shadow-md'} border rounded-xl overflow-hidden`;
  return (
    <div className={`h-full flex flex-col min-h-0 ${darkMode ? 'bg-gray-950' : 'bg-slate-50'}`}>
      <header className={`sticky top-0 z-[100] shrink-0 border-b px-4 md:px-6 pt-0 pb-3 backdrop-blur-md ${darkMode ? 'bg-gray-950/95 border-gray-800' : 'bg-white/95 border-slate-200'}`}>
        <div className="w-full">
          <div className={`h-7 w-40 ${skel(darkMode)}`} />
          <div className={`h-2.5 w-56 mt-1.5 ${skel(darkMode)}`} />
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6 pb-8 md:pb-12">
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6 w-full">
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

/** Super Admin system config — header, tab grid, plan cards */
export function SystemConfigInitialSkeleton({ darkMode }) {
  const mainBg = darkMode ? 'bg-gray-950' : 'bg-slate-50';
  const cardBase = darkMode ? 'border-gray-700/50 bg-gray-800/50' : 'border-slate-200 bg-white shadow-sm';
  return (
    <main
      className={`min-h-0 h-full flex flex-col px-3 py-4 sm:px-6 sm:py-6 md:px-8 ${mainBg} overflow-hidden`}
      aria-busy="true"
      aria-live="polite"
    >
      <header className="mb-4 sm:mb-6 shrink-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className={`h-7 sm:h-8 w-44 sm:w-52 ${skel(darkMode)}`} />
            <div className={`h-3 w-full max-w-[280px] ${skel(darkMode)}`} />
          </div>
          <div className={`h-11 w-full sm:w-36 shrink-0 ${skel(darkMode, 'rounded-xl')}`} />
        </div>
      </header>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4 sm:mb-6 shrink-0">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className={`h-[52px] sm:h-10 ${skel(darkMode, 'rounded-xl')}`} />
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`rounded-xl border p-4 sm:p-6 ${cardBase}`}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className={`h-8 w-28 ${skel(darkMode, 'rounded-lg')}`} />
                <div className={`h-8 w-8 shrink-0 ${skel(darkMode, 'rounded-lg')}`} />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between gap-2">
                  <div className={`h-3.5 w-24 ${skel(darkMode)}`} />
                  <div className={`h-3.5 w-16 ${skel(darkMode)}`} />
                </div>
                <div className="flex justify-between gap-2">
                  <div className={`h-3.5 w-20 ${skel(darkMode)}`} />
                  <div className={`h-3.5 w-12 ${skel(darkMode)}`} />
                </div>
                <div className={`h-3.5 w-full ${skel(darkMode)}`} />
                <div className={`h-3.5 w-4/5 ${skel(darkMode)}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

/** Super Admin dashboard — header, stat cards, plan/payment panels, trend + activity */
export function SuperAdminDashboardInitialSkeleton({ darkMode }) {
  const mainBg = darkMode ? 'bg-gray-950' : 'bg-slate-50';
  const headerBg = darkMode ? 'bg-gray-950/95' : 'bg-white/95';
  const cardBase = darkMode ? 'border-gray-700/50 bg-gray-800/50' : 'border-slate-200 bg-white shadow-sm';
  return (
    <div className={`flex h-full min-h-0 flex-col transition-colors duration-300 ${mainBg}`}>
      <header className={`sticky top-0 z-[100] shrink-0 border-b px-4 pb-0 pt-4 backdrop-blur-md md:px-8 md:pt-8 ${headerBg} ${darkMode ? 'border-gray-800' : 'border-slate-200'}`}>
        <div className="mb-6 flex items-center justify-between">
          <div className={`h-8 w-40 ${skel(darkMode)}`} />
          <div className={`h-4 w-28 ${skel(darkMode)}`} />
        </div>
      </header>
      <div className="custom-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8">
        <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`rounded-xl border p-3 ${cardBase}`}>
              <div className={`mb-2 h-9 w-9 ${skel(darkMode, 'rounded-lg')}`} />
              <div className={`mb-1 h-3 w-20 ${skel(darkMode)}`} />
              <div className={`h-5 w-24 ${skel(darkMode)}`} />
            </div>
          ))}
        </div>
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className={`lg:col-span-2 rounded-xl border p-6 ${cardBase}`}>
            <div className={`mb-4 h-5 w-40 ${skel(darkMode)}`} />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between">
                    <div className={`h-6 w-24 ${skel(darkMode, 'rounded-lg')}`} />
                    <div className={`h-4 w-16 ${skel(darkMode)}`} />
                  </div>
                  <div className={`h-2 w-full ${skel(darkMode, 'rounded-full')}`} />
                </div>
              ))}
            </div>
          </div>
          <div className={`rounded-xl border p-6 ${cardBase}`}>
            <div className={`mb-4 h-5 w-32 ${skel(darkMode)}`} />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`h-12 w-full ${skel(darkMode, 'rounded-lg')}`} />
              ))}
            </div>
          </div>
        </div>
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className={`rounded-xl border p-6 ${cardBase}`}>
            <div className="mb-4 flex justify-between gap-3">
              <div className={`h-5 w-56 max-w-[70%] ${skel(darkMode)}`} />
              <div className={`h-9 w-24 shrink-0 ${skel(darkMode, 'rounded-lg')}`} />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`h-4 w-10 shrink-0 ${skel(darkMode)}`} />
                  <div className={`h-6 flex-1 ${skel(darkMode, 'rounded-full')}`} />
                </div>
              ))}
            </div>
          </div>
          <div className={`rounded-xl border p-6 ${cardBase}`}>
            <div className={`mb-4 h-5 w-36 ${skel(darkMode)}`} />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`h-14 w-full ${skel(darkMode, 'rounded-lg')}`} />
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`rounded-xl border p-5 ${cardBase}`}>
              <div className="mb-3 flex items-center gap-3">
                <div className={`h-10 w-10 shrink-0 ${skel(darkMode, 'rounded-lg')}`} />
                <div className="flex-1 space-y-2">
                  <div className={`h-3 w-20 ${skel(darkMode)}`} />
                  <div className={`h-5 w-28 ${skel(darkMode)}`} />
                </div>
              </div>
              <div className={`h-3 w-32 ${skel(darkMode)}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Super Admin — Manage Shops list */
export function SuperAdminShopsInitialSkeleton({ darkMode }) {
  const mainBg = darkMode ? 'bg-gray-950' : 'bg-slate-50';
  const headerBg = darkMode ? 'bg-gray-950' : 'bg-white';
  const borderColor = darkMode ? 'border-gray-800' : 'border-slate-200';
  const cardBase = darkMode ? 'border-gray-800 bg-gray-900' : 'border-slate-200 bg-white shadow-sm';
  return (
    <main className={`flex h-screen flex-col overflow-hidden ${mainBg}`}>
      <header className={`flex shrink-0 items-center justify-between border-b p-4 md:p-6 ${borderColor} ${headerBg}`}>
        <div className={`h-8 w-48 ${skel(darkMode)}`} />
        <div className={`hidden h-10 w-72 sm:block ${skel(darkMode, 'rounded-xl')}`} />
      </header>
      <div className={`border-b p-4 sm:hidden ${borderColor} ${headerBg}`}>
        <div className={`h-12 w-full ${skel(darkMode, 'rounded-xl')}`} />
      </div>
      <div className="custom-scrollbar flex-1 overflow-y-auto p-4 md:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`rounded-2xl border p-4 ${cardBase}`}>
              <div className="mb-4 flex justify-between">
                <div className="flex gap-3">
                  <div className={`h-10 w-10 ${skel(darkMode, 'rounded-xl')}`} />
                  <div className="space-y-2">
                    <div className={`h-4 w-32 ${skel(darkMode)}`} />
                    <div className={`h-3 w-20 ${skel(darkMode)}`} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className={`h-9 w-9 ${skel(darkMode, 'rounded-lg')}`} />
                  <div className={`h-9 w-9 ${skel(darkMode, 'rounded-lg')}`} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className={`h-14 ${skel(darkMode, 'rounded-lg')}`} />
                <div className={`h-14 ${skel(darkMode, 'rounded-lg')}`} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-0 hidden space-y-3 lg:block">
          <div className={`h-12 w-full ${skel(darkMode, 'rounded-2xl')}`} />
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={`h-16 w-full ${skel(darkMode, 'rounded-xl')}`} />
          ))}
        </div>
      </div>
    </main>
  );
}

/** Super Admin — Payment History modal body */
export function PaymentHistoryModalSkeleton({ darkMode }) {
  const cardInner = darkMode ? 'border-gray-700/50 bg-gray-800/50' : 'border-slate-200 bg-slate-50';
  const historyCard = darkMode ? 'border-gray-700/30 bg-gray-800/30' : 'border-slate-200 bg-slate-50';
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <div className={`rounded-xl border p-3 md:p-5 ${cardInner}`}>
          <div className={`mb-3 h-4 w-16 ${skel(darkMode)}`} />
          <div className={`mb-2 h-7 w-24 ${skel(darkMode)}`} />
          <div className={`h-3 w-14 ${skel(darkMode)}`} />
        </div>
        <div className={`rounded-xl border p-3 md:p-5 ${cardInner}`}>
          <div className={`mb-3 h-4 w-20 ${skel(darkMode)}`} />
          <div className={`mb-2 h-7 w-20 ${skel(darkMode)}`} />
          <div className={`h-3 w-28 ${skel(darkMode)}`} />
        </div>
      </div>
      <div>
        <div className={`mb-4 h-5 w-40 ${skel(darkMode)}`} />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`rounded-lg border p-3 md:p-4 ${historyCard}`}>
              <div className="mb-2 flex items-center gap-3">
                <div className={`h-4 w-16 ${skel(darkMode)}`} />
                <div className={`h-6 w-14 ${skel(darkMode, 'rounded-lg')}`} />
              </div>
              <div className="flex flex-wrap gap-3">
                <div className={`h-3 w-24 ${skel(darkMode)}`} />
                <div className={`h-3 w-28 ${skel(darkMode)}`} />
                <div className={`h-3 w-36 ${skel(darkMode)}`} />
              </div>
            </div>
          ))}
        </div>
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
