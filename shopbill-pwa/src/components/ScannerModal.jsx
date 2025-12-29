import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, ScanLine, Loader, QrCode } from 'lucide-react';

const ScannerModal = ({ 
    isOpen, 
    onClose, 
    onScanSuccess, 
    onScanError,
    inventory, 
    onScanNotFound 
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

    // --- IMPROVED: High-Speed Refocus Logic ---
    const triggerFocus = useCallback(async () => {
        const track = streamRef.current?.getVideoTracks()[0];
        if (!track) return;

        const capabilities = track.getCapabilities();

        try {
            // Force hardware to reset focus by toggling modes
            if (capabilities.focusMode) {
                // Step 1: Break existing lock by switching to manual or none
                await track.applyConstraints({
                    advanced: [{ focusMode: capabilities.focusMode.includes('manual') ? 'manual' : 'none' }]
                });
                
                // Step 2: Immediate snap back to continuous autofocus
                await track.applyConstraints({
                    advanced: [{ 
                        focusMode: "continuous",
                        // If the phone supports distance control, nudge it to mid-range to trigger movement
                        ...(capabilities.focusDistance ? { focusDistance: 0.5 } : {})
                    }]
                });
            }
            console.log("Scanner: Focus snap triggered.");
        } catch (err) {
            console.warn("Scanner: Focus hardware nudge failed.", err);
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

        // Optimized decoding hints for speed
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
                    // Auto-focus burst 1 second after camera starts
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
            className="fixed inset-0 bg-gray-950/90 backdrop-blur-md flex items-center justify-center z-[60] p-4 font-inter"
            onClick={isAutoClosing ? null : onClose} 
        >
            <div 
                className="bg-gray-900 w-full max-w-xl rounded-2xl shadow-2xl border border-gray-800 transition-all transform"
                onClick={(e) => e.stopPropagation()} 
            >
                {/* Header */}
                <div className="p-5 flex justify-between items-center rounded-t-2xl border-b border-gray-800">
                    <h2 className="text-2xl font-extrabold text-white flex items-center">
                        <QrCode className="w-6 h-6 mr-3 text-cyan-500" /> Fast Scanner
                    </h2>
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="text-gray-400 hover:text-white p-2 rounded-full transition hover:bg-gray-800"
                        disabled={isBusy || isAutoClosing}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6">
                    {/* Camera Container */}
                    <div 
                        className="aspect-video w-full bg-black rounded-xl overflow-hidden relative border-4 border-cyan-900 cursor-crosshair active:border-cyan-400 transition-colors duration-100"
                        style={{ minHeight: '320px' }}
                        onClick={triggerFocus}
                    >
                        <video ref={videoRef} className="w-full h-full object-cover" playsInline />
                        
                        {/* Scanning Overlay UI */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            {/* Target Corners */}
                            <div className="relative w-48 h-48 border border-white/10 rounded-lg">
                                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-cyan-400" />
                                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-cyan-400" />
                                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-cyan-400" />
                                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-cyan-400" />
                                
                                {/* Animated Centered Line */}
                                {lookupStatus === 'scanning' && (
                                    <div className="absolute left-0 right-0 h-1 bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)] animate-scan-line" />
                                )}
                            </div>
                        </div>

                        {/* Initialization Screen */}
                        {(lookupStatus === 'initializing' || lookupStatus === 'loadingLib') && (
                             <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/80 p-4">
                                <Loader className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
                                <span className="text-xl text-gray-200 font-bold">Waking Camera...</span>
                            </div>
                        )}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-3 text-center uppercase tracking-widest font-bold">Tap area to force sharp focus</p>
                </div>
                
                {/* Footer / Status */}
                <div className="p-6 pt-2 text-center bg-gray-900/50 rounded-b-2xl">
                    <div className="flex flex-col items-center justify-center space-y-2 mb-4">
                        <p className={`text-lg font-bold ${lookupStatus === 'scanning' ? 'text-gray-300' : 'text-cyan-400'}`}>
                            {lookupStatus === 'scanning' ? "Searching for barcode..." : lookupStatus === 'lookingUp' ? "Identifying Item..." : "Ready"}
                        </p>
                    </div>

                    <button 
                        onClick={onClose}
                        className="w-full py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-500 transition shadow-lg shadow-cyan-900/20 disabled:opacity-50"
                        disabled={isBusy || isAutoClosing}
                    >
                        {isAutoClosing ? 'Loading Item...' : 'Cancel'}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes scan-move {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                .animate-scan-line { 
                    animation: scan-move 2.5s infinite ease-in-out; 
                }
            `}</style>
        </div>
    );
};

export default ScannerModal;