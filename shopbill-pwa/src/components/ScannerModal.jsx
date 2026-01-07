import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, ScanLine, Loader, QrCode, Focus } from 'lucide-react';

const ScannerModal = ({ 
    isOpen, 
    onClose, 
    onScanSuccess, 
    onScanError,
    inventory, 
    onScanNotFound,
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
        setLookupStatus('lookingUp');
        if (codeReaderRef.current) {
             try { codeReaderRef.current.reset(); } catch (e) {}
        }
        const normalizedCode = decodedText.toLowerCase().trim();
        const existingItem = inventory.find(item => 
            item.hsn && item.hsn.toLowerCase().trim() === normalizedCode
        );
        setTimeout(() => {
            isProcessingRef.current = false; 
            if (existingItem) {
                setLookupStatus('found');
                onScanSuccess(existingItem);
            } else {
                setLookupStatus('notFound'); 
                setLookupError(`Item "${decodedText}" not found.`);
                onScanNotFound(decodedText); 
            }
        }, 500); 
    }, [inventory, onScanSuccess, onScanNotFound]);

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
            onScanError("Camera access failed."); 
        });
        return () => resetScannerState();
    }, [isOpen, ZXing, handleScanResult, resetScannerState, onScanError, triggerFocus]); 

    if (!isOpen) return null;

    const isBusy = lookupStatus === 'lookingUp' || lookupStatus === 'initializing' || lookupStatus === 'loadingLib';
    const isAutoClosing = lookupStatus === 'found' || (lookupStatus === 'notFound' && lastScannedCodeRef.current); 

    return (
        <div 
            ref={containerRef} 
            className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-[1000] p-4 font-sans"
            onClick={isAutoClosing ? null : onClose} 
        >
            <div 
                className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden transition-all transform animate-in zoom-in-95 duration-200 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'}`}
                onClick={(e) => e.stopPropagation()} 
            >
                {/* Header Section */}
                <div className={`p-6 border-b flex justify-between items-center ${darkMode ? 'bg-gray-950/50 border-gray-800' : 'bg-slate-50 border-slate-100'}`}>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                            <span className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em]">Lens Intelligence</span>
                        </div>
                        <h2 className={`text-xl font-black uppercase tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            Live Scanner
                        </h2>
                    </div>
                    <button 
                        onClick={onClose} 
                        className={`p-2.5 rounded-xl transition-all ${darkMode ? 'hover:bg-gray-800 text-gray-500 hover:text-white' : 'hover:bg-slate-200 text-slate-400'}`}
                        disabled={isBusy || isAutoClosing}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Viewport Section */}
                <div className="p-6">
                    <div 
                        className={`aspect-square w-full rounded-2xl overflow-hidden relative border-2 group cursor-none transition-all duration-300 ${darkMode ? 'bg-black border-gray-800' : 'bg-slate-100 border-slate-200'}`}
                        style={{ minHeight: '320px' }}
                        onClick={triggerFocus}
                    >
                        <video ref={videoRef} className="w-full h-full object-cover scale-110" playsInline />
                        
                        {/* Interactive UI Overlays */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            {/* Scanning Square */}
                            <div className="relative w-64 h-64">
                                {/* Corners */}
                                <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-cyan-500 rounded-tl-lg" />
                                <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-cyan-500 rounded-tr-lg" />
                                <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-cyan-500 rounded-bl-lg" />
                                <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-cyan-500 rounded-br-lg" />
                                
                                {/* Target Reticle */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                                    <Focus className="w-12 h-12 text-white" />
                                </div>

                                {/* Laser Line */}
                                {lookupStatus === 'scanning' && (
                                    <div className="absolute left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,1)] animate-laser-move" />
                                )}
                            </div>
                        </div>

                        {/* Loading/Initializing Overlay */}
                        {(lookupStatus === 'initializing' || lookupStatus === 'loadingLib') && (
                             <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/90 p-4 backdrop-blur-sm">
                                <div className="relative mb-6">
                                    <Loader className="w-12 h-12 text-cyan-500 animate-spin" />
                                    <ScanLine className="absolute top-0 left-0 w-12 h-12 text-cyan-300/30" />
                                </div>
                                <span className="text-sm font-black text-white uppercase tracking-widest">Calibrating Optics...</span>
                            </div>
                        )}

                        {/* Tap to Focus Prompt */}
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
                            <div className="px-4 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
                                <Focus className="w-3 h-3 text-cyan-400" />
                                <span className="text-[10px] font-bold text-white uppercase tracking-tighter">Tap screen to manual focus</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Status/Footer Section */}
                <div className={`p-6 pt-2 border-t ${darkMode ? 'bg-gray-950/50 border-gray-800' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex flex-col items-center justify-center gap-1 mb-6">
                        <p className={`text-xs font-black uppercase tracking-widest ${lookupStatus === 'scanning' ? 'text-gray-500' : 'text-cyan-500'}`}>
                            System Status
                        </p>
                        <p className={`text-lg font-black italic tracking-tight tabular-nums ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {lookupStatus === 'scanning' ? "ALIGNED & SCANNING..." : 
                             lookupStatus === 'lookingUp' ? "DECODING SYMBOL..." : 
                             lookupStatus === 'found' ? "DATA RETRIEVED" : "IDLE"}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                         <button 
                            onClick={onClose}
                            className={`py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${darkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            disabled={isBusy || isAutoClosing}
                        >
                            Abort
                        </button>
                        <button 
                            disabled={true}
                            className={`py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 disabled:opacity-50`}
                        >
                            {isAutoClosing ? 'Redirecting...' : 'Manual Input'}
                        </button>
                    </div>
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