import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Page render crash:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    const { darkMode = true, children } = this.props;

    if (this.state.hasError) {
      return (
        <div className={`h-full min-h-[320px] flex items-center justify-center px-6 ${darkMode ? 'bg-gray-950' : 'bg-slate-50'}`}>
          <div className={`max-w-md w-full rounded-2xl border p-6 text-center ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}>
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-amber-500" />
            <h3 className="text-lg font-black tracking-tight">Something went wrong on this page</h3>
            <p className={`mt-2 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              The page failed to load. Please retry.
            </p>
            <button
              type="button"
              onClick={this.handleRetry}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-500 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default PageErrorBoundary;
