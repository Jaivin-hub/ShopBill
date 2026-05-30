import React from 'react';
import { Loader2 } from 'lucide-react';
import {
  BillingTerminalInitialSkeleton,
  StockHubInitialSkeleton,
  LedgerInitialSkeleton,
  ReportsInitialSkeleton,
  ChatInitialSkeleton,
  OffersInitialSkeleton,
  TeamManagementInitialSkeleton,
  SupplyChainInitialSkeleton,
  SettingsHomeSkeleton,
  ProfileInitialSkeleton,
  OutletManagerInitialSkeleton,
  SuperAdminDashboardInitialSkeleton,
  SuperAdminShopsInitialSkeleton,
  SystemConfigInitialSkeleton,
} from './skeletons/PageSkeletons';
import { USER_ROLES } from '../utils/constants';

export default function PageRouteFallback({ page, darkMode = true, userRole }) {
  switch (page) {
    case 'dashboard':
      if (userRole === USER_ROLES.SUPERADMIN) {
        return <SuperAdminDashboardInitialSkeleton darkMode={darkMode} />;
      }
      break;
    case 'settings':
      if (userRole === USER_ROLES.SUPERADMIN) {
        return <SettingsHomeSkeleton darkMode={darkMode} />;
      }
      break;
    case 'superadmin_users':
      if (userRole === USER_ROLES.SUPERADMIN) {
        return <SuperAdminShopsInitialSkeleton darkMode={darkMode} />;
      }
      break;
    case 'superadmin_systems':
      if (userRole === USER_ROLES.SUPERADMIN) {
        return <SystemConfigInitialSkeleton darkMode={darkMode} />;
      }
      break;
    case 'billing':
      return <BillingTerminalInitialSkeleton darkMode={darkMode} />;
    case 'inventory':
      return <StockHubInitialSkeleton darkMode={darkMode} />;
    case 'khata':
      return <LedgerInitialSkeleton darkMode={darkMode} />;
    case 'reports':
      return <ReportsInitialSkeleton darkMode={darkMode} />;
    case 'chat':
      return <ChatInitialSkeleton darkMode={darkMode} />;
    case 'offers':
      return <OffersInitialSkeleton darkMode={darkMode} />;
    case 'staffPermissions':
      return <TeamManagementInitialSkeleton darkMode={darkMode} />;
    case 'scm':
      return <SupplyChainInitialSkeleton darkMode={darkMode} />;
    case 'settings':
      return <SettingsHomeSkeleton darkMode={darkMode} />;
    case 'profile':
      return <ProfileInitialSkeleton darkMode={darkMode} />;
    case 'outlets':
      return <OutletManagerInitialSkeleton darkMode={darkMode} />;
    default:
      return (
        <div
          className={`flex min-h-[min(50vh,400px)] flex-1 flex-col items-center justify-center gap-3 p-8 ${
            darkMode ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" aria-hidden />
          <p className="text-xs font-black uppercase tracking-widest">Loading page…</p>
        </div>
      );
  }
}
