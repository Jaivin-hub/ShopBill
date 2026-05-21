import React from 'react';
import { WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';
import { isBrowserOnline } from '../offline/connectivity';

function isConnectionRelatedError(error) {
  if (!isBrowserOnline()) return true;
  if (!error) return false;

  const msg = String(error.message || error).toLowerCase();
  const name = String(error.name || '').toLowerCase();

  const patterns = [
    'network error',
    'failed to fetch',
    'load failed',
    'networkrequestfailed',
    'err_network',
    'err_internet_disconnected',
    'timeout',
    'timed out',
    'aborted',
    'cancelled',
    'could not sync',
    'connection',
    'offline',
    'chunkloaderror',
    'loading chunk',
    'dynamically imported module',
    'importing a module script failed',
  ];

  return patterns.some((p) => msg.includes(p) || name.includes(p));
}

function getErrorCopy(error) {
  const offline = !isBrowserOnline();
  const connectionIssue = offline || isConnectionRelatedError(error);

  if (connectionIssue) {
    return {
      Icon: WifiOff,
      iconClass: 'text-amber-500',
      title: offline ? 'You are offline' : 'Connection problem',
      description: offline
        ? 'This page needs the internet to load. Check your Wi‑Fi or mobile data, then try again.'
        : 'We could not reach the server. Check your internet connection and try again.',
      buttonLabel: 'Try again',
    };
  }

  return {
    Icon: AlertTriangle,
    iconClass: 'text-amber-500',
    title: 'Something went wrong',
    description: 'This page failed to load. Please try again.',
    buttonLabel: 'Reload page',
  };
}

class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Page render crash:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    const { darkMode = true, children } = this.props;
    const { hasError, error } = this.state;

    if (hasError) {
      const { Icon, iconClass, title, description, buttonLabel } = getErrorCopy(error);

      return (
        <div
          className={`h-full min-h-[320px] flex items-center justify-center px-6 ${darkMode ? 'bg-gray-950' : 'bg-slate-50'}`}
        >
          <div
            className={`max-w-md w-full rounded-2xl border p-6 text-center ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}
          >
            <Icon className={`w-10 h-10 mx-auto mb-3 ${iconClass}`} aria-hidden />
            <h3 className="text-lg font-black tracking-tight">{title}</h3>
            <p className={`mt-2 text-sm font-bold leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {description}
            </p>
            <button
              type="button"
              onClick={this.handleRetry}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-500 transition-colors"
            >
              <RefreshCw className="w-4 h-4" aria-hidden />
              {buttonLabel}
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default PageErrorBoundary;
