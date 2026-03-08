import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, ScanLine, Loader, QrCode, Focus } from 'lucide-react';

const ScannerModal = ({ 
    isOpen, 
    onClose, 
    onScanSuccess, 
    onScanError,
    inventory = [], 
    onScanNotFound,
    onCodeScanned, // When set, scanner returns raw barcode only (no inventory lookup)
    darkMode = true // Defaulting to dark for professional scanner look
}) => {
    
    const ZXing = window.ZXing; 
    
    const videoRef = useRef(null); 
    const codeReaderRef = useRef(null); 
    const containerRef = useRef(null); 
    const streamRef = useRef(null); 

    const [result, setResult] = useState(null);
    const [lookupStatus, setLookupStatus] = useState('idle'); 
    const [lookupError, setLookupError] = useState(null);
    const lastScannedCodeRef = useRef(null); 
    const isProcessingRef = useRef(false); 
    const [isScannerInitialized, setIsScannerInitialized] = useState(false);

    // Hardware Logic: Focus Trigger
    const triggerFocus = useCallback(async () => {
        const track = streamRef.current?.getVideoTracks()[0];
        if (!track) return;
        const capabilities = track.getCapabilities();
        try {
            if (capabilities.focusMode) {
                await track.applyConstraints({
                    advanced: [{ focusMode: capabilities.focusMode.includes('manual') ? 'manual' : 'none' }]
                });
                await track.applyConstraints({
                    advanced: [{ 
                        focusMode: "continuous",
                        ...(capabilities.focusDistance ? { focusDistance: 0.5 } : {})
                    }]
                });
            }
        } catch (err) {
            console.warn("Scanner: Focus nudge failed.", err);
        }
    }, []);

    const resetScannerState = useCallback(() => {
        if (codeReaderRef.current) {
            try { codeReaderRef.current.reset(); } catch (e) {}
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject = null; 
        }
        codeReaderRef.current = null;
        isProcessingRef.current = false;
        lastScannedCodeRef.current = null;
        setIsScannerInitialized(false);
        setResult(null);
        setLookupStatus('idle'); 
        setLookupError(null);
    }, []); 

    const handleScanResult = useCallback((decodedText) => {
        if (isProcessingRef.current || decodedText === lastScannedCodeRef.current) return;
        isProcessingRef.current = true; 
        lastScannedCodeRef.current = decodedText; 
        setResult(decodedText);
        if (codeReaderRef.current) {
             try { codeReaderRef.current.reset(); } catch (e) {}
        }
        if (onCodeScanned) {
            setLookupStatus('found');
            isProcessingRef.current = false;
            onCodeScanned(decodedText);
            return;
        }
        setLookupStatus('lookingUp');
        const normalizedCode = decodedText.toLowerCase().trim();
        const existingItem = inventory.find(item => 
            item.hsn && item.hsn.toLowerCase().trim() === normalizedCode
        );
        setTimeout(() => {
            isProcessingRef.current = false; 
            if (existingItem) {
                setLookupStatus('found');
                if (onScanSuccess) onScanSuccess(existingItem);
            } else {
                setLookupStatus('notFound'); 
                setLookupError(`Item "${decodedText}" not found.`);
                if (onScanNotFound) onScanNotFound(decodedText); 
            }
        }, 500); 
    }, [inventory, onScanSuccess, onScanNotFound, onCodeScanned]);

    useEffect(() => {
        if (!isOpen) { resetScannerState(); return; }
        if (lookupStatus !== 'idle' || isProcessingRef.current || !ZXing || !videoRef.current) return;
        setLookupStatus('initializing');
        codeReaderRef.current = new ZXing.BrowserMultiFormatReader();
        const hints = new Map();
        hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
            ZXing.BarcodeFormat.QR_CODE, 
            ZXing.BarcodeFormat.EAN_13, 
            ZXing.BarcodeFormat.CODE_128,
            ZXing.BarcodeFormat.UPC_A
        ]);
        hints.set(ZXing.DecodeHintType.TRY_HARDER, true); 
        codeReaderRef.current.decodeFromVideoDevice(
            null, 
            videoRef.current, 
            (result, err) => {
                if (videoRef.current?.srcObject && !streamRef.current) {
                    streamRef.current = videoRef.current.srcObject;
                    setTimeout(triggerFocus, 1000);
                }
                if (result) handleScanResult(result.getText()); 
            }, 
            hints
        ) 
        .then(() => {
            setIsScannerInitialized(true);
            setLookupStatus('scanning');
        })
        .catch(err => {
            setLookupStatus('notFound'); 
            if (onScanError && typeof onScanError === 'function') {
                onScanError("Camera access failed."); 
            } else {
                console.error("Scanner error:", err);
            }
        });
        return () => resetScannerState();
    }, [isOpen, ZXing, handleScanResult, resetScannerState, onScanError, triggerFocus]); 

    if (!isOpen) return null;

    const isBusy = lookupStatus === 'lookingUp' || lookupStatus === 'initializing' || lookupStatus === 'loadingLib';
    const isAutoClosing = lookupStatus === 'found' || (lookupStatus === 'notFound' && lastScannedCodeRef.current); 

    return (
        <div 
            ref={containerRef} 
            className={`fixed inset-0 flex items-center justify-center z-[10000] p-3 sm:p-4 md:p-6 overflow-y-auto backdrop-blur-md ${darkMode ? 'bg-gray-950/80' : 'bg-black/50'}`}
            onClick={isAutoClosing ? null : onClose} 
            role="dialog"
            aria-modal="true"
            aria-label="Scan barcode"
        >
            <div 
                className={`w-full max-w-lg h-[85vh] sm:h-[80vh] max-h-[600px] rounded-xl sm:rounded-2xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
                onClick={(e) => e.stopPropagation()} 
            >
                {/* Header - matches other app modals */}
                <div className={`p-3 sm:p-4 border-b flex justify-between items-center flex-shrink-0 ${darkMode ? 'border-slate-800 bg-gray-950' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="p-1.5 sm:p-2 bg-indigo-500/10 rounded-lg text-indigo-500 shrink-0">
                            <ScanLine className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                            <h2 className={`text-sm sm:text-base font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                Scan Barcode
                            </h2>
                            <p className={`text-[9px] font-bold tracking-widest uppercase mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Camera
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className={`p-2 rounded-xl transition-colors shrink-0 ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                        disabled={isBusy || isAutoClosing}
                        aria-label="Close"
                    >
                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                </div>

                {/* Viewport Section */}
                <div className="p-3 sm:p-4 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
                    <div 
                        className={`aspect-square w-full rounded-xl sm:rounded-2xl overflow-hidden relative border-2 transition-all duration-300 ${darkMode ? 'bg-black border-slate-700' : 'bg-slate-100 border-slate-200'}`}
                        style={{ minHeight: '320px' }}
                        onClick={triggerFocus}
                    >
                        <video ref={videoRef} className="w-full h-full object-cover scale-110" playsInline />
                        
                        {/* Scan frame */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="relative w-64 h-64">
                                <div className={`absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 rounded-tl-lg ${darkMode ? 'border-indigo-500' : 'border-indigo-600'}`} />
                                <div className={`absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 rounded-tr-lg ${darkMode ? 'border-indigo-500' : 'border-indigo-600'}`} />
                                <div className={`absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 rounded-bl-lg ${darkMode ? 'border-indigo-500' : 'border-indigo-600'}`} />
                                <div className={`absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 rounded-br-lg ${darkMode ? 'border-indigo-500' : 'border-indigo-600'}`} />
                                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                                    <Focus className={`w-12 h-12 ${darkMode ? 'text-white' : 'text-slate-600'}`} />
                                </div>
                                {lookupStatus === 'scanning' && (
                                    <div className="absolute left-0 right-0 h-0.5 bg-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.8)] animate-laser-move" />
                                )}
                            </div>
                        </div>

                        {/* Loading overlay */}
                        {(lookupStatus === 'initializing' || lookupStatus === 'loadingLib') && (
                            <div className={`absolute inset-0 flex flex-col items-center justify-center p-4 backdrop-blur-sm ${darkMode ? 'bg-gray-950/90' : 'bg-slate-900/90'}`}>
                                <Loader className={`w-10 h-10 animate-spin mb-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                                <span className={`text-xs font-bold tracking-widest ${darkMode ? 'text-slate-300' : 'text-slate-200'}`}>Starting camera...</span>
                            </div>
                        )}

                        {/* Tap to focus */}
                        <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
                            <div className={`px-3 py-1.5 rounded-full border text-[10px] font-bold flex items-center gap-1.5 ${darkMode ? 'bg-black/50 border-slate-600 text-slate-300' : 'bg-white/80 border-slate-300 text-slate-600'}`}>
                                <Focus className="w-3 h-3 text-indigo-400" />
                                Tap to focus
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Footer - matches other modals */}
                <div className={`p-3 sm:p-4 border-t flex flex-col gap-3 flex-shrink-0 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                    <p className={`text-center text-xs font-bold tabular-nums ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {lookupStatus === 'scanning' && 'Scanning...'}
                        {lookupStatus === 'lookingUp' && 'Looking up...'}
                        {lookupStatus === 'found' && 'Found'}
                        {lookupStatus === 'notFound' && lookupError}
                        {(lookupStatus === 'idle' || lookupStatus === 'initializing') && 'Position barcode in frame'}
                    </p>
                    <button 
                        onClick={onClose}
                        className={`w-full py-2.5 sm:py-3 rounded-xl text-sm font-black transition-all active:scale-[0.98] ${darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'}`}
                        disabled={isBusy || isAutoClosing}
                    >
                        Cancel
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes laser-move {
                    0% { top: 10%; opacity: 0; }
                    20% { opacity: 1; }
                    80% { opacity: 1; }
                    100% { top: 90%; opacity: 0; }
                }
                .animate-laser-move { 
                    animation: laser-move 2s infinite linear; 
                }
                .custom-scroll::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scroll::-webkit-scrollbar-thumb {
                    background: #334155;
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
};

export default ScannerModal;