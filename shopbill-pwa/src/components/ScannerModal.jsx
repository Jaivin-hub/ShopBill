import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, AlertTriangle, ScanLine, Loader } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode'; 

// Mock function (No changes)
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
        }, 500);
    });
};


const ScannerModal = ({ 
    isOpen, 
    onClose, 
    onScanSuccess, 
    onScanError,
    onScanNotFound 
}) => {
    
    const qrcodeRegionId = "qr-code-full-region"; 
    const html5QrcodeScannerRef = useRef(null);
    const containerRef = useRef(null); // 🌟 NEW REF to check if the modal is mounted

    const [result, setResult] = useState(null);
    const [lookupStatus, setLookupStatus] = useState('idle'); 
    const [lookupError, setLookupError] = useState(null);
    const [lastScannedCode, setLastScannedCode] = useState(null); 
    const [isScannerInitialized, setIsScannerInitialized] = useState(false);


    // Effect to handle the instant action after lookup completes (No changes)
    useEffect(() => {
        if (lookupStatus === 'notFound' && lastScannedCode) {
             setTimeout(() => {
                onScanNotFound(lastScannedCode);
                onClose();
             }, 700);
        }
    }, [lookupStatus, lastScannedCode, onScanNotFound, onClose]);

    // CORE SCANNING LOGIC (No changes)
    const handleScanResult = (decodedText) => {
        if (decodedText === lastScannedCode || lookupStatus !== 'idle') {
            return;
        }

        setLastScannedCode(decodedText);
        setResult(decodedText);
        setLookupStatus('lookingUp');
        
        // 1. Stop the scanner feed immediately to prevent rescanning
        html5QrcodeScannerRef.current.pause(true);

        // 2. Start lookup
        mockItemLookup(decodedText).then(response => {
            if (response.success) {
                setLookupStatus('found');
                onScanSuccess(response.item);
            } else {
                setLookupStatus('notFound'); 
                setLookupError(response.error);
                onScanError(response.error); 
            }
        }).catch(err => {
            setLookupStatus('notFound');
            setLookupError("An error occurred during lookup.");
            onScanError("An error occurred during lookup.");
        });
    };

    // ----------------------------------------------------
    // 🌟 UPDATED INITIALIZATION & CLEANUP EFFECT 🌟
    // ----------------------------------------------------
    useEffect(() => {
        // 1. Check if the modal is open AND the container element is ready
        if (isOpen && containerRef.current && !html5QrcodeScannerRef.current) {
            
            // Check if the target element exists before initializing
            if (document.getElementById(qrcodeRegionId)) {
                
                const config = {
                    fps: 15,
                    qrbox: { width: 250, height: 150 },
                    aspectRatio: 1.777778, 
                    disableFlip: false,
                    rememberLastUsedCamera: true
                };

                const scanner = new Html5QrcodeScanner(
                    qrcodeRegionId, 
                    config, 
                    false 
                );
                
                const onScanSuccess = (decodedText, decodedResult) => {
                    handleScanResult(decodedText);
                };

                const onScanError = (errorMessage) => {
                    // This is usually a continuous warning and can be ignored for success logic
                };

                // 🌟 The critical part: Safely handle the render promise
                const renderPromise = scanner.render(onScanSuccess, onScanError);
                
                // 🌟 Check if renderPromise is a Promise before chaining
                if (renderPromise && typeof renderPromise.then === 'function') {
                    renderPromise.then(() => {
                        html5QrcodeScannerRef.current = scanner;
                        setIsScannerInitialized(true);
                        setLookupStatus('idle');
                    })
                    .catch(err => {
                        console.error("Failed to initialize scanner:", err);
                        setLookupStatus('notFound');
                        setLookupError("Camera access denied or device unsupported.");
                        html5QrcodeScannerRef.current = null;
                    });
                } else {
                    // Fallback for immediate non-Promise return (where the original error might occur)
                    console.error("html5-qrcode render did not return a valid promise.");
                    setLookupStatus('notFound');
                    setLookupError("Failed to start scanner (Element issue).");
                }
            }
        }
        
        // Cleanup function for when the modal is closed or component unmounts
        return () => {
             if (html5QrcodeScannerRef.current) {
                // Shut down the camera stream gracefully
                html5QrcodeScannerRef.current.stop().finally(() => {
                    html5QrcodeScannerRef.current = null;
                    setIsScannerInitialized(false);
                }).catch(err => {
                    console.warn("Failed to stop scanner cleanly:", err);
                    html5QrcodeScannerRef.current = null;
                    setIsScannerInitialized(false);
                });
            }
        };
    }, [isOpen]); 

    // Reset state on close
    useEffect(() => {
        if (!isOpen) {
            setResult(null);
            setLookupStatus('idle');
            setLookupError(null);
            setLastScannedCode(null);
            // We rely on the cleanup function in the main effect for stopping the camera
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // UI RENDERING LOGIC (No changes)
    let statusIcon = <ScanLine className="w-8 h-8 text-cyan-400" />;
    let statusText = isScannerInitialized 
        ? "Point camera at a barcode or QR code..."
        : "Initializing camera...";
    let statusColor = "text-gray-300";

    if (lookupStatus === 'lookingUp') {
        statusIcon = <Loader className="w-8 h-8 text-indigo-400 animate-spin" />;
        statusText = "Code scanned! Looking up item in inventory...";
        statusColor = "text-indigo-300";
    } else if (lookupStatus === 'found') {
        statusIcon = <CheckCircle className="w-8 h-8 text-teal-400" />;
        statusText = `Item found: ${result}!`;
        statusColor = "text-teal-300";
    } else if (lookupStatus === 'notFound') {
        statusIcon = <AlertTriangle className="w-8 h-8 text-red-400" />;
        statusText = `Item not found! Opening 'Add New' form now...`; 
        statusColor = "text-red-300";
    }

    return (
        <div ref={containerRef} className="fixed inset-0 bg-gray-900 bg-opacity-95 backdrop-blur-sm flex items-center justify-center z-[60] p-4 transition-opacity">
            <div className="bg-gray-800 w-full max-w-lg rounded-xl shadow-2xl border border-cyan-700/50">
                
                {/* Modal Header */}
                <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-cyan-900/40 rounded-t-xl">
                    <h2 className="text-xl font-bold text-cyan-300 flex items-center">
                        <ScanLine className="w-5 h-5 mr-2" /> Fast Barcode/QR Scanner
                    </h2>
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="text-gray-400 hover:text-white p-1"
                        disabled={lookupStatus === 'notFound' || lookupStatus === 'lookingUp'}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Camera Feed Area */}
                <div className="p-4">
                    <div 
                        id={qrcodeRegionId}
                        className="aspect-video w-full bg-gray-900 rounded-lg overflow-hidden border-2 border-dashed border-gray-700 relative"
                        style={{ minHeight: '300px' }}
                    >
                        {!isScannerInitialized && (
                             <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                                <Loader className="w-8 h-8 text-cyan-400 animate-spin" />
                                <span className="ml-3 text-gray-400">Loading Camera...</span>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Status/Result Area */}
                <div className="p-5 pt-3 text-center border-t border-gray-700/50">
                    <div className="flex items-center justify-center space-x-3 mb-2">
                        {statusIcon}
                        <p className={`text-lg font-semibold ${statusColor}`}>
                            {statusText}
                        </p>
                    </div>
                    {result && (lookupStatus === 'idle' || lookupStatus === 'lookingUp') && (
                         <p className="text-sm text-gray-400 mt-2">
                             Decoded: <span className="font-mono text-white bg-gray-700 px-2 py-0.5 rounded text-xs">{result}</span>
                         </p>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-5 border-t border-gray-700 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition font-medium disabled:opacity-50"
                        disabled={lookupStatus === 'notFound' || lookupStatus === 'lookingUp'}
                    >
                        Close Scanner
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScannerModal;