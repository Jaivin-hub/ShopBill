import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmationModal = ({ message, onConfirm, onCancel, darkMode, confirmText = 'Confirm', cancelText = 'Cancel' }) => {
    const isDark = darkMode !== undefined ? darkMode : true; // Default to dark mode if not provided
    
    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] p-3 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="confirmation-title">
            <section className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} w-full max-w-md h-[85vh] sm:h-[80vh] max-h-[500px] rounded-xl sm:rounded-2xl shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col`}>
                <header className={`p-3 sm:p-4 border-b flex justify-between items-center flex-shrink-0 ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 bg-red-500/10 rounded-lg text-red-500">
                            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                        </div>
                        <div>
                            <h3 id="confirmation-title" className={`text-sm sm:text-base font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Confirm Action</h3>
                            <p className={`text-[8px] sm:text-[9px] font-black tracking-[0.2em] uppercase mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Warning</p>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        className={`p-1.5 sm:p-2 rounded-xl transition-colors shrink-0 ${isDark ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}
                        aria-label="Close modal"
                    >
                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                </header>
                <div className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
                    <p className={`text-sm sm:text-base leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`} aria-label="Confirmation message">{message}</p>
                </div>
                <div className={`p-3 sm:p-4 border-t flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 flex-shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    <button
                        onClick={onCancel}
                        className={`px-4 py-2.5 sm:py-3 text-sm font-black rounded-xl transition-all active:scale-95 ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'}`}
                        aria-label="Cancel action"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2.5 sm:py-3 text-sm font-black rounded-xl text-white bg-red-600 hover:bg-red-500 transition-all active:scale-95 shadow-lg shadow-red-600/20"
                        aria-label="Confirm action"
                    >
                        {confirmText}
                    </button>
                </div>
            </section>
        </div>
    );
};

export default ConfirmationModal