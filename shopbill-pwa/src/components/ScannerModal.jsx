import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, ScanLine, Loader, QrCode } from 'lucide-react';

// --- MOCK API CALL REMOVED ---
// const mockItemLookup = ... is now gone.

// --- SCANNER MODAL COMPONENT (UPDATED FOR REAL INVENTORY LOOKUP) ---
const ScannerModal = ({ 
    isOpen, 
    onClose, 
    onScanSuccess, 
    onScanError,
    inventory, // <<< The real inventory data is now used here
    onScanNotFound 
}) => {
    
    // CRITICAL: Ensure the ZXing object is safely accessed
    const ZXing = window.ZXing; 
    
    const videoRef = useRef(null); 
    const codeReaderRef = useRef(null); 
    const containerRef = useRef(null); 

    const [result, setResult] = useState(null);
    const [lookupStatus, setLookupStatus] = useState('idle'); 
    const [lookupError, setLookupError] = useState(null);
    const lastScannedCodeRef = useRef(null); 
    const isProcessingRef = useRef(false); 
    const [isScannerInitialized, setIsScannerInitialized] = useState(false);

    // --- Core Cleanup Logic (IMPROVED FOR ROBUSTNESS) ---
    const resetScannerState = useCallback(() => {
        // ... (Cleanup logic remains the same) ...
        if (codeReaderRef.current) {
            try {
                codeReaderRef.current.reset(); 
                console.log("Scanner: Stream stopped via ZXing reset.");
            } catch (e) {
                console.warn("Scanner: Failed to reset stream via ZXing. It may already be stopped.", e);
            }
        }
        
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject;
            if (stream && typeof stream.getTracks === 'function') {
                 stream.getTracks().forEach(track => {
                    if (track.kind === 'video' && track.stop) { 
                        track.stop();
                    }
                 });
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

    // Handles the core scanning result and subsequent item lookup (UPDATED)
    const handleScanResult = useCallback((decodedText) => {
        
        if (isProcessingRef.current || decodedText === lastScannedCodeRef.current) {
            return;
        }

        isProcessingRef.current = true; // Block further scans
        lastScannedCodeRef.current = decodedText; 
        
        setResult(decodedText);
        setLookupStatus('lookingUp');
        
        // Stop the camera stream after successful scan (prevents rapid re-scan)
        if (codeReaderRef.current) {
             try {
                codeReaderRef.current.reset();
             } catch (e) {
                 console.warn("Scanner: Failed to reset stream after scan.", e);
             }
        }
        
        // --- REAL INVENTORY LOOKUP IMPLEMENTATION ---
        
        // 1. Normalize the scanned code for robust, case-insensitive match
        const normalizedCode = decodedText.toLowerCase().trim();

        // 2. Search the actual inventory array for a matching HSN
        const existingItem = inventory.find(item => 
            item.hsn && item.hsn.toLowerCase().trim() === normalizedCode
        );

        // Simulate a slight delay for better UX before resolving the lookup
        setTimeout(() => {
            isProcessingRef.current = false; 

            if (existingItem) {
                // PRODUCT FOUND: Call success handler with the found item
                setLookupStatus('found');
                console.log("✅ Scanned Item Found in Inventory:", existingItem); 
                onScanSuccess(existingItem);
            } else {
                // PRODUCT NOT FOUND: Call not found handler
                setLookupStatus('notFound'); 
                setLookupError(`Item with HSN/Code "${decodedText}" not found in inventory.`);
                console.log(`⚠️ Scanned Item Not Found: ${decodedText}`);
                
                // Pass the raw code to the parent (InventoryContent)
                onScanNotFound(decodedText); 
            }
        }, 500); // Small delay to show 'lookingUp' status
        
    }, [inventory, onScanSuccess, onScanNotFound]); // Include inventory as a dependency


    // Effect to handle auto-closing after lookup completes
    useEffect(() => {
        // Auto-close when the parent components (onScanSuccess or onScanNotFound) are expected to take over
        if (lookupStatus === 'found' || (lookupStatus === 'notFound' && lastScannedCodeRef.current)) {
            // No need for a separate effect if the parent handles the close, 
            // but we keep the state here to control the UI transition.
            
            // Note: Since we are simulating a 500ms delay inside handleScanResult, 
            // the transition logic in the UI already gives enough time.
        }
        
        // A robust way to prevent auto-close on hard error (if no code was scanned):
        const isHardError = lookupStatus === 'notFound' && !lastScannedCodeRef.current;
        if (isHardError) {
            console.log("Hard camera error detected. Waiting for manual close.");
        }
    }, [lookupStatus]);


    // CORE SCANNER INITIALIZATION & CLEANUP EFFECT (Unchanged)
    useEffect(() => {
        // ... (Initialization logic remains the same) ...
        if (!isOpen) {
             resetScannerState(); 
             return; 
        }
        
        if (lookupStatus !== 'idle' || isProcessingRef.current) {
            return;
        }
        
        if (!ZXing) {
            setLookupStatus('loadingLib');
            setLookupError("ZXing library not found. Please ensure the CDN script is loaded in index.html.");
            console.error("ZXing not found on window object.");
            return; 
        }

        if (!videoRef.current) {
            return; 
        }
        
        setLookupStatus('initializing');
        setLookupError(null);

        if (codeReaderRef.current) {
            codeReaderRef.current.reset();
        }

        codeReaderRef.current = new ZXing.BrowserMultiFormatReader();

        // --- HINTS CONFIGURATION (OPTIMIZED FOR ALL COMMON 1D/2D) ---
        const hints = new Map();
        const decodeFormats = [
            // 2D Codes
            ZXing.BarcodeFormat.QR_CODE, ZXing.BarcodeFormat.DATA_MATRIX, ZXing.BarcodeFormat.AZTEC, ZXing.BarcodeFormat.PDF_417, 
            // 1D Codes
            ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8, ZXing.BarcodeFormat.UPC_A, ZXing.BarcodeFormat.UPC_E, 
            ZXing.BarcodeFormat.CODE_128, ZXing.BarcodeFormat.CODE_39, ZXing.BarcodeFormat.ITF, ZXing.BarcodeFormat.CODABAR, 
        ];
        
        hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, decodeFormats);
        hints.set(ZXing.DecodeHintType.TRY_HARDER, true); 
        hints.set(ZXing.DecodeHintType.CHARACTER_SET, 'utf-8'); 

        
        // Use decodeFromVideoDevice with null for compatibility
        codeReaderRef.current.decodeFromVideoDevice(
            null, 
            videoRef.current, 
            (result, err) => {
                if (result) {
                    handleScanResult(result.getText()); 
                }
                if (err && !(err instanceof ZXing.NotFoundException) && err.name !== 'NotAllowedError') {
                    console.error("ZXing Decode Error:", err);
                }
            }, 
            hints
        ) 
        .then(() => {
            setIsScannerInitialized(true);
            setLookupStatus('scanning');
            console.log("Scanner: ZXing stream started successfully.");
        })
        .catch(err => {
            console.error("ZXing Initialization Failed:", err);
            let userError = "Camera access denied or device unsupported. Please check permissions.";
            if (err.name === 'NotAllowedError') {
                 userError = "Camera access denied. Please grant permission in your browser settings.";
            } else if (err.name === 'NotFoundError') {
                 userError = "No camera found on this device.";
            } else if (err.name === 'ConstraintNotSatisfiedError' || err.name === 'OverconstrainedError') {
                 userError = "Camera failed to start. Try reloading the page or check device camera access.";
            }
            
            setLookupStatus('notFound'); 
            setLookupError(userError);
            onScanError(userError); 
        });
        
        return () => {
             resetScannerState(); 
        };
    }, [isOpen, ZXing, handleScanResult, resetScannerState, onScanError]); 

    if (!isOpen) return null;

    // --- UI LOGIC (Remains the same based on lookupStatus) ---
    let statusIcon, statusText, statusColor, statusBg;

    if (lookupStatus === 'loadingLib') {
        statusIcon = <Loader className="w-8 h-8 text-yellow-400 animate-spin" />;
        statusText = "Awaiting ZXing library load. Please ensure the CDN script is loaded in index.html.";
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
        statusText = `Success! Item found. Opening edit form...`;
        statusColor = "text-teal-300";
        statusBg = "bg-teal-900/40";
    } else if (lookupStatus === 'notFound' && lastScannedCodeRef.current) { 
        statusIcon = <CheckCircle className="w-8 h-8 text-teal-400" />;
        statusText = "New item detected! Opening 'Add Item' form..."; 
        statusColor = "text-teal-300";
        statusBg = "bg-teal-900/40";
    } else if (lookupStatus === 'notFound') { 
        statusIcon = <AlertTriangle className="w-8 h-8 text-red-400" />;
        statusText = lookupError || `Scanner Failed. Check console for details.`; 
        statusColor = "text-red-300";
        statusBg = "bg-red-900/40";
    } else { // idle 
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
                    {lastScannedCodeRef.current && (lookupStatus !== 'scanning' && lookupStatus !== 'initializing' && lookupStatus !== 'loadingLib') && (
                         <div className="mt-4 pt-4 border-t border-gray-700/50">
                             <p className="text-sm text-gray-400 mb-1">Scanned:</p>
                             <p className="font-mono text-xl text-white bg-gray-700 px-3 py-1.5 inline-block rounded-lg shadow-md">
                                 {/* Truncate the code if it's too long, but show full code on hover */}
                                 <span title={lastScannedCodeRef.current}>
                                     {lastScannedCodeRef.current.length > 30 
                                         ? `${lastScannedCodeRef.current.substring(0, 20)}...` 
                                         : lastScannedCodeRef.current
                                     }
                                 </span>
                             </p>
                         </div>
                    )}

                    {/* Close Button */}
                    <button 
                        onClick={onClose}
                        className="mt-6 w-full py-3 bg-cyan-600 text-white font-semibold rounded-xl hover:bg-cyan-700 transition shadow-lg shadow-cyan-900/50 disabled:opacity-50 disabled:bg-gray-600"
                        disabled={isBusy || isAutoClosing}
                    >
                        {isAutoClosing ? 'Opening Form...' : isBusy ? 'Scanning in Progress...' : 'Close Scanner'}
                    </button>
                </div>
            </div>
        </div>
    );
};


export default ScannerModal;