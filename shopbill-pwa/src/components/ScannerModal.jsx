import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, ScanLine, Loader, QrCode, Focus } from 'lucide-react';

const ScannerModal = ({ 
    isOpen, 
    onClose, 
    onScanSuccess, 
    onScanError,
    inventory, 
    onScanNotFound 
}) => {
    
    // CRITICAL: Ensure the ZXing object is safely accessed
    const ZXing = window.ZXing; 
    
    const videoRef = useRef(null); 
    const codeReaderRef = useRef(null); 
    const containerRef = useRef(null); 
    const streamRef = useRef(null); // Added to track the stream for forced shutdown

    const [result, setResult] = useState(null);
    const [lookupStatus, setLookupStatus] = useState('idle'); 
    const [lookupError, setLookupError] = useState(null);
    const lastScannedCodeRef = useRef(null); 
    const isProcessingRef = useRef(false); 
    const [isScannerInitialized, setIsScannerInitialized] = useState(false);

    // --- NEW: Focus Logic (Google Pay Style) ---
    const triggerFocus = useCallback(async () => {
        const track = streamRef.current?.getVideoTracks()[0];
        if (!track) return;

        try {
            // Attempting to force the camera to re-evaluate focus
            const constraints = track.getConstraints();
            // Toggling focusMode or applying advanced constraints triggers hardware autofocus
            await track.applyConstraints({
                advanced: [{ focusMode: "continuous" }, { focusMode: "manual" }]
            });
            // Reset back to continuous for ongoing scanning
            await track.applyConstraints({
                advanced: [{ focusMode: "continuous" }]
            });
            console.log("Scanner: Focus reset triggered.");
        } catch (err) {
            console.warn("Scanner: Manual focus control not supported on this device/browser.", err);
        }
    }, []);

    // --- Core Cleanup Logic (RE-OPTIMIZED TO FORCE CAMERA OFF) ---
    const resetScannerState = useCallback(() => {
        if (codeReaderRef.current) {
            try {
                codeReaderRef.current.reset(); 
            } catch (e) {
                console.warn("Scanner: Failed to reset stream via ZXing.", e);
            }
        }
        
        // MANUALLY STOP ALL TRACKS: This ensures the light/camera goes off
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject;
            if (stream && typeof stream.getTracks === 'function') {
                 stream.getTracks().forEach(track => track.stop());
            }
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

    // Handles the core scanning result and subsequent item lookup
    const handleScanResult = useCallback((decodedText) => {
        if (isProcessingRef.current || decodedText === lastScannedCodeRef.current) {
            return;
        }

        isProcessingRef.current = true; 
        lastScannedCodeRef.current = decodedText; 
        
        setResult(decodedText);
        setLookupStatus('lookingUp');
        
        if (codeReaderRef.current) {
             try {
                codeReaderRef.current.reset();
             } catch (e) {
                 console.warn("Scanner: Failed to reset stream after scan.", e);
             }
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
                setLookupError(`Item with HSN/Code "${decodedText}" not found in inventory.`);
                onScanNotFound(decodedText); 
            }
        }, 500); 
        
    }, [inventory, onScanSuccess, onScanNotFound]);


    // Effect to handle auto-closing after lookup completes
    useEffect(() => {
        if (lookupStatus === 'found' || (lookupStatus === 'notFound' && lastScannedCodeRef.current)) {
            // Logic handled by parent
        }
    }, [lookupStatus]);


    // CORE SCANNER INITIALIZATION (REVERTED TO YOUR WORKING LOGIC)
    useEffect(() => {
        if (!isOpen) {
             resetScannerState(); 
             return; 
        }
        
        if (lookupStatus !== 'idle' || isProcessingRef.current) {
            return;
        }
        
        if (!ZXing) {
            setLookupStatus('loadingLib');
            setLookupError("ZXing library not found.");
            return; 
        }

        if (!videoRef.current) {
            return; 
        }
        
        setLookupStatus('initializing');
        setLookupError(null);

        codeReaderRef.current = new ZXing.BrowserMultiFormatReader();

        const hints = new Map();
        const decodeFormats = [
            ZXing.BarcodeFormat.QR_CODE, ZXing.BarcodeFormat.DATA_MATRIX, ZXing.BarcodeFormat.AZTEC, ZXing.BarcodeFormat.PDF_417, 
            ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8, ZXing.BarcodeFormat.UPC_A, ZXing.BarcodeFormat.UPC_E, 
            ZXing.BarcodeFormat.CODE_128, ZXing.BarcodeFormat.CODE_39, ZXing.BarcodeFormat.ITF, ZXing.BarcodeFormat.CODABAR, 
        ];
        
        hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, decodeFormats);
        hints.set(ZXing.DecodeHintType.TRY_HARDER, true); 
        hints.set(ZXing.DecodeHintType.CHARACTER_SET, 'utf-8'); 

        // YOUR ORIGINAL WORKING METHOD
        codeReaderRef.current.decodeFromVideoDevice(
            null, 
            videoRef.current, 
            (result, err) => {
                // Capture stream for manual cleanup and focus control
                if (videoRef.current && videoRef.current.srcObject && !streamRef.current) {
                    streamRef.current = videoRef.current.srcObject;
                }

                if (result) {
                    handleScanResult(result.getText()); 
                }
            }, 
            hints
        ) 
        .then(() => {
            setIsScannerInitialized(true);
            setLookupStatus('scanning');
        })
        .catch(err => {
            console.error("ZXing Initialization Failed:", err);
            setLookupStatus('notFound'); 
            setLookupError("Camera access failed. Please check permissions.");
            onScanError("Camera access failed."); 
        });
        
        return () => {
             resetScannerState(); 
        };
    }, [isOpen, ZXing, handleScanResult, resetScannerState, onScanError]); 

    if (!isOpen) return null;

    // --- UI LOGIC ---
    let statusIcon, statusText, statusColor, statusBg;

    if (lookupStatus === 'loadingLib') {
        statusIcon = <Loader className="w-8 h-8 text-yellow-400 animate-spin" />;
        statusText = "Awaiting ZXing library load...";
        statusColor = "text-yellow-300";
        statusBg = "bg-yellow-900/40";
    }
    else if (lookupStatus === 'initializing') {
        statusIcon = <Loader className="w-8 h-8 text-cyan-400 animate-spin" />;
        statusText = "Requesting camera access...";
        statusColor = "text-cyan-300";
        statusBg = "bg-cyan-900/40";
    } else if (lookupStatus === 'scanning') {
        statusIcon = <ScanLine className="w-8 h-8 text-cyan-400" />;
        statusText = "Point camera at a barcode or QR code...";
        statusColor = "text-gray-300";
        statusBg = "bg-gray-700/40";
    } else if (lookupStatus === 'lookingUp') {
        statusIcon = <Loader className="w-8 h-8 text-indigo-400 animate-spin" />;
        statusText = "Code scanned! Looking up item...";
        statusColor = "text-indigo-300";
        statusBg = "bg-indigo-900/40";
    } else if (lookupStatus === 'found') {
        statusIcon = <CheckCircle className="w-8 h-8 text-teal-400" />;
        statusText = `Success! Item found.`;
        statusColor = "text-teal-300";
        statusBg = "bg-teal-900/40";
    } else if (lookupStatus === 'notFound' && lastScannedCodeRef.current) { 
        statusIcon = <CheckCircle className="w-8 h-8 text-teal-400" />;
        statusText = "New item detected! Opening 'Add Item'..."; 
        statusColor = "text-teal-300";
        statusBg = "bg-teal-900/40";
    } else if (lookupStatus === 'notFound') { 
        statusIcon = <AlertTriangle className="w-8 h-8 text-red-400" />;
        statusText = lookupError || `Scanner Failed.`; 
        statusColor = "text-red-300";
        statusBg = "bg-red-900/40";
    } else { 
        statusIcon = <Loader className="w-8 h-8 text-gray-400 animate-spin" />;
        statusText = "Initializing...";
        statusColor = "text-gray-300";
        statusBg = "bg-gray-700/40";
    }

    const isBusy = lookupStatus === 'lookingUp' || lookupStatus === 'initializing' || lookupStatus === 'loadingLib';
    const isAutoClosing = lookupStatus === 'found' || (lookupStatus === 'notFound' && lastScannedCodeRef.current); 

    return (
        <div 
            ref={containerRef} 
            className="fixed inset-0 bg-gray-900 bg-opacity-90 backdrop-blur-md flex items-center justify-center z-[60] p-4 font-inter"
            onClick={isAutoClosing ? null : onClose} 
        >
            <div 
                className="bg-gray-800 w-full max-w-xl rounded-2xl shadow-2xl border border-gray-700 transition-all transform"
                onClick={(e) => e.stopPropagation()} 
            >
                <div className="p-5 flex justify-between items-center rounded-t-2xl border-b border-gray-700/50">
                    <h2 className="text-2xl font-extrabold text-white flex items-center">
                        <QrCode className="w-6 h-6 mr-3 text-cyan-500" /> Inventory Scanner
                    </h2>
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="text-gray-400 hover:text-white p-2 rounded-full transition hover:bg-gray-700"
                        disabled={isBusy || isAutoClosing}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 pb-4">
                    <div 
                        className="aspect-video w-full bg-gray-900 rounded-xl overflow-hidden shadow-inner shadow-gray-950 relative border-4 border-cyan-900 cursor-crosshair"
                        style={{ minHeight: '320px' }}
                        onClick={triggerFocus}
                        title="Tap to focus"
                    >
                        <video ref={videoRef} id="scanner-video" className="w-full h-full object-cover" playsInline />
                        
                        <div className="absolute inset-0 pointer-events-none">
                             <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-cyan-400 opacity-80" />
                            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-cyan-400 opacity-80" />
                            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-cyan-400 opacity-80" />
                            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-cyan-400 opacity-80" />
                            
                            {/* Focus Target Square */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-cyan-400/20 rounded-lg flex items-center justify-center">
                                 <div className="w-2 h-2 bg-cyan-400/20 rounded-full" />
                            </div>

                            {lookupStatus === 'scanning' && (
                                <div className="absolute top-1/2 left-1/2 w-4/5 h-px bg-cyan-400 shadow-[0_0_10px_2px_rgba(40,200,255,0.7)] -translate-x-1/2 animate-pulse-line" style={{ transform: 'translateY(-50%)' }} />
                            )}
                        </div>

                        {/* Google Pay Style Focus Button */}
                        {lookupStatus === 'scanning' && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); triggerFocus(); }}
                                className="absolute bottom-4 right-4 bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-full shadow-lg transition-all active:scale-90 flex items-center gap-2 text-xs font-bold border border-indigo-400"
                            >
                                <Focus className="w-4 h-4" /> FOCUS
                            </button>
                        )}
                        
                        <style>{`
                            @keyframes pulse-line {
                                0% { opacity: 0.2; }
                                50% { opacity: 1.0; }
                                100% { opacity: 0.2; }
                            }
                            .animate-pulse-line { animation: pulse-line 1.5s infinite; }
                        `}</style>
                        
                        {lookupStatus === 'initializing' || lookupStatus === 'loadingLib' || (lookupStatus === 'notFound' && !lastScannedCodeRef.current) ? (
                             <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 p-4 text-center">
                                {lookupStatus === 'initializing' || lookupStatus === 'loadingLib' ? (
                                    <Loader className="w-10 h-10 text-cyan-400 animate-spin mb-4" />
                                ) : (
                                    <AlertTriangle className="w-10 h-10 text-red-400 mb-4" />
                                )}
                                <span className="text-xl text-gray-300 font-bold mb-2">
                                    {lookupStatus === 'initializing' ? "Starting Camera..." : lookupStatus === 'loadingLib' ? "Loading Library..." : "Scanner Failed"}
                                </span>
                                {lookupError && (
                                    <p className="text-sm text-red-400 px-4 mt-1">
                                        {lookupError}
                                    </p>
                                )}
                            </div>
                        ) : null}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2 text-center uppercase tracking-widest font-semibold">Tip: Tap the camera screen to refocus</p>
                </div>
                
                <div className={`p-6 pt-5 text-center transition-colors duration-300 ${statusBg} rounded-b-2xl`}>
                    <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="p-3 rounded-full bg-gray-900/50 shadow-inner">
                            {statusIcon}
                        </div>
                        <p className={`text-lg font-bold ${statusColor}`}>
                            {statusText}
                        </p>
                    </div>

                    {lastScannedCodeRef.current && (lookupStatus !== 'scanning' && lookupStatus !== 'initializing' && lookupStatus !== 'loadingLib') && (
                         <div className="mt-4 pt-4 border-t border-gray-700/50">
                             <p className="text-sm text-gray-400 mb-1">Scanned:</p>
                             <p className="font-mono text-xl text-white bg-gray-700 px-3 py-1.5 inline-block rounded-lg shadow-md">
                                 <span>{lastScannedCodeRef.current}</span>
                             </p>
                         </div>
                    )}

                    <button 
                        onClick={onClose}
                        className="mt-6 w-full py-3 bg-cyan-600 text-white font-semibold rounded-xl hover:bg-cyan-700 transition shadow-lg shadow-cyan-900/50 disabled:opacity-50"
                        disabled={isBusy || isAutoClosing}
                    >
                        {isAutoClosing ? 'Opening Form...' : 'Close Scanner'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScannerModal;