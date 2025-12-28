import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, ScanLine, Loader, QrCode, RefreshCw } from 'lucide-react';

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
    const streamRef = useRef(null); // Explicitly track the media stream

    const [result, setResult] = useState(null);
    const [lookupStatus, setLookupStatus] = useState('idle'); 
    const [lookupError, setLookupError] = useState(null);
    const lastScannedCodeRef = useRef(null); 
    const isProcessingRef = useRef(false); 
    const [isScannerInitialized, setIsScannerInitialized] = useState(false);

    // --- Core Cleanup Logic (IMPROVED TO FORCE KILL CAMERA) ---
    const resetScannerState = useCallback(async () => {
        console.log("Scanner: Initiating deep cleanup...");
        
        // 1. Stop ZXing decoding
        if (codeReaderRef.current) {
            try {
                await codeReaderRef.current.reset(); 
                codeReaderRef.current = null;
            } catch (e) {
                console.warn("Scanner: ZXing reset error", e);
            }
        }
        
        // 2. Force Stop all Media Tracks (The most reliable way to turn off the light/camera)
        const stopTracks = (stream) => {
            if (stream && stream.getTracks) {
                stream.getTracks().forEach(track => {
                    track.stop();
                    console.log(`Scanner: Track ${track.kind} stopped.`);
                });
            }
        };

        stopTracks(streamRef.current);
        if (videoRef.current && videoRef.current.srcObject) {
            stopTracks(videoRef.current.srcObject);
            videoRef.current.srcObject = null;
        }

        streamRef.current = null;
        isProcessingRef.current = false;
        lastScannedCodeRef.current = null;
        setIsScannerInitialized(false);
        setResult(null);
        setLookupStatus('idle'); 
        setLookupError(null);
    }, []); 

    const handleScanResult = useCallback((decodedText) => {
        if (isProcessingRef.current || decodedText === lastScannedCodeRef.current) {
            return;
        }

        isProcessingRef.current = true; 
        lastScannedCodeRef.current = decodedText; 
        
        setResult(decodedText);
        setLookupStatus('lookingUp');
        
        // Stop the camera stream immediately after successful scan
        resetScannerState();
        
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
                onScanNotFound(decodedText); 
            }
        }, 500);
        
    }, [inventory, onScanSuccess, onScanNotFound, resetScannerState]);

    useEffect(() => {
        if (!isOpen) {
             resetScannerState(); 
             return; 
        }
        
        if (lookupStatus !== 'idle' || isProcessingRef.current) return;
        
        if (!ZXing) {
            setLookupStatus('loadingLib');
            setLookupError("ZXing library load error.");
            return; 
        }

        const startScanner = async () => {
            try {
                setLookupStatus('initializing');
                setLookupError(null);

                codeReaderRef.current = new ZXing.BrowserMultiFormatReader();

                // Optimization: Prioritize common formats for faster detection
                const hints = new Map();
                const decodeFormats = [
                    ZXing.BarcodeFormat.QR_CODE,
                    ZXing.BarcodeFormat.CODE_128,
                    ZXing.BarcodeFormat.EAN_13,
                    ZXing.BarcodeFormat.UPC_A,
                    ZXing.BarcodeFormat.CODE_39
                ];
                
                hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, decodeFormats);
                hints.set(ZXing.DecodeHintType.TRY_HARDER, true); 

                // Get the stream and store it for cleanup
                const videoConstraints = { video: { facingMode: "environment" } };
                const stream = await navigator.mediaDevices.getUserMedia(videoConstraints);
                streamRef.current = stream;

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }

                codeReaderRef.current.decodeFromVideoElement(
                    videoRef.current,
                    (result, err) => {
                        if (result) handleScanResult(result.getText());
                        if (err && !(err instanceof ZXing.NotFoundException)) {
                            // Suppress normal noise
                        }
                    },
                    hints
                );

                setIsScannerInitialized(true);
                setLookupStatus('scanning');
            } catch (err) {
                console.error("Scanner Start Failed:", err);
                let userError = "Camera failed to start. Please retry.";
                if (err.name === 'NotAllowedError') userError = "Camera access denied.";
                setLookupStatus('notFound'); 
                setLookupError(userError);
            }
        };

        startScanner();
        
        return () => { resetScannerState(); };
    }, [isOpen, ZXing, handleScanResult, resetScannerState]); 

    if (!isOpen) return null;

    let statusIcon, statusText, statusColor, statusBg;

    if (lookupStatus === 'loadingLib') {
        statusIcon = <Loader className="w-8 h-8 text-yellow-400 animate-spin" />;
        statusText = "Awaiting library...";
        statusColor = "text-yellow-300";
        statusBg = "bg-yellow-900/40";
    }
    else if (lookupStatus === 'initializing') {
        statusIcon = <Loader className="w-8 h-8 text-cyan-400 animate-spin" />;
        statusText = "Starting camera...";
        statusColor = "text-cyan-300";
        statusBg = "bg-cyan-900/40";
    } else if (lookupStatus === 'scanning') {
        statusIcon = <ScanLine className="w-8 h-8 text-cyan-400" />;
        statusText = "Scanning barcode/QR...";
        statusColor = "text-gray-300";
        statusBg = "bg-gray-700/40";
    } else if (lookupStatus === 'lookingUp') {
        statusIcon = <Loader className="w-8 h-8 text-indigo-400 animate-spin" />;
        statusText = "Processing scan...";
        statusColor = "text-indigo-300";
        statusBg = "bg-indigo-900/40";
    } else if (lookupStatus === 'found') {
        statusIcon = <CheckCircle className="w-8 h-8 text-teal-400" />;
        statusText = `Item found!`;
        statusColor = "text-teal-300";
        statusBg = "bg-teal-900/40";
    } else if (lookupStatus === 'notFound' && lastScannedCodeRef.current) { 
        statusIcon = <CheckCircle className="w-8 h-8 text-teal-400" />;
        statusText = "New item detected!"; 
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
                        className="aspect-video w-full bg-gray-900 rounded-xl overflow-hidden shadow-inner shadow-gray-950 relative border-4 border-cyan-900"
                        style={{ minHeight: '320px' }}
                    >
                        <video ref={videoRef} id="scanner-video" className="w-full h-full object-cover" playsInline />
                        <div className="absolute inset-0 pointer-events-none">
                             <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-cyan-400 opacity-80" />
                            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-cyan-400 opacity-80" />
                            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-cyan-400 opacity-80" />
                            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-cyan-400 opacity-80" />
                            {lookupStatus === 'scanning' && (
                                <div className="absolute top-1/2 left-1/2 w-4/5 h-px bg-cyan-400 shadow-[0_0_10px_2px_rgba(40,200,255,0.7)] -translate-x-1/2 animate-pulse-line" style={{ transform: 'translateY(-50%)' }} />
                            )}
                        </div>
                        
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
                                    <div className="flex flex-col items-center">
                                        <AlertTriangle className="w-10 h-10 text-red-400 mb-4" />
                                        <button 
                                            onClick={() => window.location.reload()}
                                            className="mb-4 flex items-center gap-2 bg-gray-700 px-4 py-2 rounded-lg text-white hover:bg-gray-600"
                                        >
                                            <RefreshCw className="w-4 h-4" /> Reload Page
                                        </button>
                                    </div>
                                )}
                                <span className="text-xl text-gray-300 font-bold mb-2">
                                    {lookupStatus === 'initializing' ? "Starting Camera..." : lookupStatus === 'loadingLib' ? "Loading Library..." : "Scanner Failed"}
                                </span>
                                {lookupError && <p className="text-sm text-red-400 px-4 mt-1">{lookupError}</p>}
                            </div>
                        ) : null}
                    </div>
                </div>
                
                <div className={`p-6 pt-5 text-center transition-colors duration-300 ${statusBg} rounded-b-2xl`}>
                    <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="p-3 rounded-full bg-gray-900/50 shadow-inner">{statusIcon}</div>
                        <p className={`text-lg font-bold ${statusColor}`}>{statusText}</p>
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