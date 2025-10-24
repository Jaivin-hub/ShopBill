import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, ScanLine, Loader, QrCode } from 'lucide-react';

// --- MOCK API CALL (Unchanged) ---
const mockItemLookup = (code) => {
    return new Promise(resolve => {
        setTimeout(() => {
            if (code && code.length > 5 && code.startsWith('8')) {
                resolve({ success: true, item: { name: "Scanned Product X", hsn: code, price: 125.50, quantity: 42, reorderLevel: 5 } });
            } else if (code && code.length > 5) { 
                resolve({ success: false, error: "Item not found in inventory. Please add it." });
            } else {
                resolve({ success: false, error: "No code scanned." });
            }
        }, 800);
    });
};

// --- SCANNER MODAL COMPONENT ---
const ScannerModal = ({ 
    isOpen, 
    onClose, 
    onScanSuccess, 
    onScanError,
    onScanNotFound 
}) => {
    
    const ZXing = window.ZXing;
    
    const qrcodeRegionId = "qr-code-full-region"; 
    const videoRef = useRef(null); 
    const codeReaderRef = useRef(null); 
    const containerRef = useRef(null); 

    const [result, setResult] = useState(null);
    // idle | initializing | scanning | lookingUp | found | notFound | loadingLib
    const [lookupStatus, setLookupStatus] = useState('idle'); 
    const [lookupError, setLookupError] = useState(null);
    const lastScannedCodeRef = useRef(null); 
    const isProcessingRef = useRef(false); 
    const [isScannerInitialized, setIsScannerInitialized] = useState(false);

    // --- Core Cleanup Logic ---
    // Moved to a simple function that can be called directly.
    const resetScannerState = () => {
        if (codeReaderRef.current) {
            // NOTE: The scanner is also reset inside handleScanResult upon a successful read.
            codeReaderRef.current.reset();
        }
        codeReaderRef.current = null; 
        isProcessingRef.current = false;
        lastScannedCodeRef.current = null;
        setIsScannerInitialized(false);
        setResult(null);
        setLookupStatus('idle');
        setLookupError(null);
    };

    // Handles the core scanning result and subsequent item lookup
    const handleScanResult = useCallback((decodedText) => {
        
        if (isProcessingRef.current) {
            return;
        }

        if (decodedText === lastScannedCodeRef.current) {
            return;
        }
        
        isProcessingRef.current = true; // Block further scans
        lastScannedCodeRef.current = decodedText; 
        
        setResult(decodedText);
        setLookupStatus('lookingUp');
        
        // Stop the camera feed after successful scan to prevent immediate re-scan
        if (codeReaderRef.current) {
            codeReaderRef.current.reset(); 
            codeReaderRef.current = null; // Mark as dead
        }

        // Start lookup
        mockItemLookup(decodedText).then(response => {
            isProcessingRef.current = false; 
            
            if (response.success) {
                setLookupStatus('found');
                onScanSuccess(response.item);
            } else {
                setLookupStatus('notFound'); 
                setLookupError(response.error);
                onScanError(response.error); 
            }
        }).catch(err => {
            isProcessingRef.current = false; 
            setLookupStatus('notFound');
            setLookupError("An unknown error occurred during lookup.");
            onScanError("An unknown error occurred during lookup.");
        });
    }, [onScanSuccess, onScanError]);


    // Effect to handle auto-closing after lookup completes
    useEffect(() => {
        let timer;
        if (lookupStatus === 'notFound' && lastScannedCodeRef.current) {
             timer = setTimeout(() => {
                onScanNotFound(lastScannedCodeRef.current);
                onClose(); 
             }, 1500);
        }
        if (lookupStatus === 'found') {
            timer = setTimeout(() => {
                onClose(); 
            }, 1000); 
        }
        return () => clearTimeout(timer);
    }, [lookupStatus, onScanNotFound, onClose]);

    // CORE SCANNER INITIALIZATION & CLEANUP EFFECT
    useEffect(() => {
        
        // If the modal is closed, we don't start initialization.
        if (!isOpen) {
             // CRITICAL FIX: Explicitly reset all state when `isOpen` becomes false.
             resetScannerState(); 
             return; 
        }
        
        // Prevent re-initialization if already scanning or busy/initialized
        if (isScannerInitialized || isProcessingRef.current || lookupStatus !== 'idle') {
            return;
        }

        // Check for library presence
        if (!ZXing) {
            setLookupStatus('loadingLib');
            setLookupError("ZXing library not found. Please ensure the CDN script is loaded in index.html.");
            console.error("ZXing not found on window object.");
            return; 
        }
        
        // --- Start Initialization ---
        if (isOpen && containerRef.current && ZXing && !isScannerInitialized) {
            
            setLookupStatus('initializing');
            setLookupError(null);

            codeReaderRef.current = new ZXing.BrowserMultiFormatReader();

            const hints = new Map();
            const decodeFormats = [
                ZXing.BarcodeFormat.QR_CODE,
                ZXing.BarcodeFormat.EAN_13,
                ZXing.BarcodeFormat.CODE_128,
                ZXing.BarcodeFormat.DATA_MATRIX
            ];
            hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, decodeFormats);
            
            codeReaderRef.current.decodeFromConstraints({ 
                video: { facingMode: "environment" } 
            }, videoRef.current, (result, err) => {
                if (result) {
                    handleScanResult(result.getText());
                }
                if (err && !(err instanceof ZXing.NotFoundException)) {
                    console.error("ZXing Decode Error:", err);
                }
            })
            .then(() => {
                setIsScannerInitialized(true);
                setLookupStatus('scanning');
                console.log("Scanner: ZXing stream started successfully.");
            })
            .catch(err => {
                console.error("ZXing Initialization Failed:", err);
                resetScannerState(); // Reset if startup fails
                setLookupStatus('notFound'); 
                setLookupError("Camera access denied or device unsupported. Please check permissions.");
            });
        } 

        // 5. RETURN CLEANUP FUNCTION
        // This function guarantees the stream is stopped if the component unmounts.
        return () => {
             // CRITICAL FIX: Re-integrate the cleanup logic into the return. 
             // This runs when the component unmounts OR before the effect re-runs 
             // (which only happens when dependencies change).
             if (codeReaderRef.current) {
                console.log("Scanner: Stream stopped via useEffect return.");
                codeReaderRef.current.reset();
             }
        };
        // Dependencies are the minimum required to re-run the effect when necessary
    }, [isOpen, ZXing, handleScanResult, isScannerInitialized, lookupStatus]); 

    if (!isOpen) return null;

    // --- UI LOGIC (Unchanged) ---
    let statusIcon, statusText, statusColor, statusBg;

    if (lookupStatus === 'loadingLib') {
        statusIcon = <Loader className="w-8 h-8 text-yellow-400 animate-spin" />;
        statusText = "Awaiting ZXing library load. Please check index.html...";
        statusColor = "text-yellow-300";
        statusBg = "bg-yellow-900/40";
    }
    else if (lookupStatus === 'initializing') {
        statusIcon = <Loader className="w-8 h-8 text-cyan-400 animate-spin" />;
        statusText = "Requesting camera access & starting feed...";
        statusColor = "text-cyan-300";
        statusBg = "bg-cyan-900/40";
    } else if (lookupStatus === 'scanning') {
        statusIcon = <ScanLine className="w-8 h-8 text-cyan-400" />;
        statusText = "Point camera at a barcode or QR code...";
        statusColor = "text-gray-300";
        statusBg = "bg-gray-700/40";
    } else if (lookupStatus === 'lookingUp') {
        statusIcon = <Loader className="w-8 h-8 text-indigo-400 animate-spin" />;
        statusText = "Code scanned! Looking up item in inventory...";
        statusColor = "text-indigo-300";
        statusBg = "bg-indigo-900/40";
    } else if (lookupStatus === 'found') {
        statusIcon = <CheckCircle className="w-8 h-8 text-teal-400" />;
        statusText = `Success! Item found.`;
        statusColor = "text-teal-300";
        statusBg = "bg-teal-900/40";
    } else if (lookupStatus === 'notFound') {
        statusIcon = <AlertTriangle className="w-8 h-8 text-red-400" />;
        statusText = lookupError || `Item not found. Check console for details.`; 
        statusColor = "text-red-300";
        statusBg = "bg-red-900/40";
    } else { // idle 
        statusIcon = <Loader className="w-8 h-8 text-gray-400 animate-spin" />;
        statusText = "Initializing...";
        statusColor = "text-gray-300";
        statusBg = "bg-gray-700/40";
    }

    const isBusy = lookupStatus === 'lookingUp' || lookupStatus === 'initializing' || lookupStatus === 'loadingLib';
    const isAutoClosing = lookupStatus === 'notFound' || lookupStatus === 'found';

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
                
                {/* Modal Header */}
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

                {/* Camera Feed Area - Core Focus */}
                <div className="p-6 pb-4">
                    <div 
                        id={qrcodeRegionId}
                        className="aspect-video w-full bg-gray-900 rounded-xl overflow-hidden shadow-inner shadow-gray-950 relative border-4 border-cyan-900"
                        style={{ minHeight: '320px' }}
                    >
                        {/* The video element is where ZXing renders the camera feed */}
                        <video ref={videoRef} id="scanner-video" className="w-full h-full object-cover" playsInline />
                        
                        {/* Viewfinder Overlay - Corner Brackets (Styling over the video) */}
                        <div className="absolute inset-0 pointer-events-none">
                             <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-cyan-400 opacity-80" />
                            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-cyan-400 opacity-80" />
                            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-cyan-400 opacity-80" />
                            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-cyan-400 opacity-80" />
                            
                            {/* Scanning Line Indicator */}
                            {lookupStatus === 'scanning' && (
                                <div className="absolute top-1/2 left-1/2 w-4/5 h-px bg-cyan-400 shadow-[0_0_10px_2px_rgba(40,200,255,0.7)] -translate-x-1/2 animate-pulse-line" style={{ transform: 'translateY(-50%)' }} />
                            )}
                        </div>
                        
                        {/* Custom CSS for the scanning line animation */}
                        <style>{`
                            @keyframes pulse-line {
                                0% { opacity: 0.2; }
                                50% { opacity: 1.0; }
                                100% { opacity: 0.2; }
                            }
                        `}</style>
                        

                        {/* Initialization/Error Overlay */}
                        {lookupStatus === 'initializing' || lookupStatus === 'notFound' || lookupStatus === 'loadingLib' ? (
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
                </div>
                
                {/* Status & Actions Area - Combined */}
                <div className={`p-6 pt-5 text-center transition-colors duration-300 ${statusBg} rounded-b-2xl`}>
                    
                    {/* Status Display */}
                    <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="p-3 rounded-full bg-gray-900/50 shadow-inner">
                            {statusIcon}
                        </div>
                        <p className={`text-lg font-bold ${statusColor}`}>
                            {statusText}
                        </p>
                    </div>

                    {/* Decoded Result */}
                    {lastScannedCodeRef.current && (lookupStatus === 'lookingUp' || lookupStatus === 'found' || lookupStatus === 'notFound') && (
                         <div className="mt-4 pt-4 border-t border-gray-700/50">
                             <p className="text-sm text-gray-400 mb-1">Scanned:</p>
                             <p className="font-mono text-xl text-white bg-gray-700 px-3 py-1.5 inline-block rounded-lg shadow-md">
                                {lastScannedCodeRef.current}
                             </p>
                         </div>
                    )}

                    {/* Close Button */}
                    <button 
                        onClick={onClose}
                        className="mt-6 w-full py-3 bg-cyan-600 text-white font-semibold rounded-xl hover:bg-cyan-700 transition shadow-lg shadow-cyan-900/50 disabled:opacity-50 disabled:bg-gray-600"
                        disabled={isBusy || isAutoClosing}
                    >
                        {isAutoClosing ? `Closing in ${lookupStatus === 'found' ? '1s' : '1.5s'}...` : isBusy ? 'Scanning in Progress...' : 'Close Scanner'}
                    </button>
                </div>
            </div>
        </div>
    );
};


export default ScannerModal;