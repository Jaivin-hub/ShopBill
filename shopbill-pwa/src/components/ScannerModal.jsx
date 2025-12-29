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

    // --- OPTIMIZED: Ultra-Fast Focus Toggle ---
    const triggerFocus = useCallback(async () => {
        const track = streamRef.current?.getVideoTracks()[0];
        if (!track) return;

        const capabilities = track.getCapabilities();

        try {
            if (capabilities.focusMode) {
                // Force hardware to "wake up" by cycling modes rapidly
                // This is faster than just waiting for continuous autofocus
                await track.applyConstraints({ advanced: [{ focusMode: "manual" }] });
                await track.applyConstraints({ 
                    advanced: [{ 
                        focusMode: "continuous",
                        // Points the laser/sensor to center if supported
                        ...(capabilities.whiteBalanceMode ? { whiteBalanceMode: "continuous" } : {})
                    }] 
                });
            }
            console.log("Scanner: Snap-focus triggered.");
        } catch (err) {
            console.warn("Scanner: Hardware focus jump failed.", err);
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
            ZXing.BarcodeFormat.QR_CODE, ZXing.BarcodeFormat.EAN_13, 
            ZXing.BarcodeFormat.CODE_128, ZXing.BarcodeFormat.UPC_A
        ]);
        hints.set(ZXing.DecodeHintType.TRY_HARDER, true); 

        codeReaderRef.current.decodeFromVideoDevice(null, videoRef.current, (result) => {
            if (videoRef.current?.srcObject && !streamRef.current) {
                streamRef.current = videoRef.current.srcObject;
                // Kickstart focus immediately
                setTimeout(triggerFocus, 500);
            }
            if (result) handleScanResult(result.getText());
        }, hints) 
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

    return (
        <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-md flex items-center justify-center z-[60] p-4 font-inter" onClick={isAutoClosing ? null : onClose}>
            <div className="bg-gray-800 w-full max-w-xl rounded-2xl shadow-2xl border border-gray-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                
                <div className="p-5 flex justify-between items-center border-b border-gray-700/50">
                    <h2 className="text-2xl font-extrabold text-white flex items-center">
                        <QrCode className="w-6 h-6 mr-3 text-cyan-500" /> Fast Scanner
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-2 rounded-full transition hover:bg-gray-700">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6">
                    <div 
                        className="aspect-video w-full bg-black rounded-xl overflow-hidden relative border-4 border-cyan-900 cursor-crosshair active:border-cyan-400 transition-colors"
                        onClick={triggerFocus}
                    >
                        <video ref={videoRef} className="w-full h-full object-cover" playsInline />
                        
                        {/* Centered Scanning UI */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="relative w-48 h-48">
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-cyan-400" />
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-cyan-400" />
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-cyan-400" />
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-cyan-400" />
                                
                                {lookupStatus === 'scanning' && (
                                    <div className="absolute left-0 right-0 h-[2px] bg-cyan-400 shadow-[0_0_15px_cyan] animate-scan-line" />
                                )}
                            </div>
                        </div>

                        {/* Status Overlays */}
                        {(lookupStatus === 'initializing' || lookupStatus === 'loadingLib') && (
                             <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80">
                                <Loader className="w-10 h-10 text-cyan-400 animate-spin mb-2" />
                                <span className="text-white font-bold tracking-tight">Waking Camera...</span>
                            </div>
                        )}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-3 text-center uppercase tracking-[0.2em] font-bold">Tap screen to force focus</p>
                </div>
                
                <div className={`p-6 text-center ${lookupStatus === 'found' ? 'bg-teal-900/20' : 'bg-gray-900/40'}`}>
                    <div className="flex flex-col items-center space-y-2">
                        <p className="text-lg font-bold text-white italic">
                            {lookupStatus === 'scanning' ? "Searching for barcode..." : lookupStatus === 'lookingUp' ? "Verifying..." : "Ready"}
                        </p>
                    </div>
                    <button onClick={onClose} className="mt-4 w-full py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-500 transition shadow-lg">
                        Close Scanner
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes scan-line {
                    0% { top: 0%; opacity: 0; }
                    20% { opacity: 1; }
                    80% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                .animate-scan-line {
                    animation: scan-line 2s infinite linear;
                }
            `}</style>
        </div>
    );
};

export default ScannerModal;