import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, ScanLine, Loader } from 'lucide-react';
import { useZxing } from 'react-zxing'; // Import the main hook

// Assume this is passed from parent to simulate a search/lookup function
// This mock function would typically call an API to fetch product details
const mockItemLookup = (code) => {
    return new Promise(resolve => {
        setTimeout(() => {
            if (code && code.length > 5 && code.startsWith('8')) {
                // Simulate a successful product lookup
                resolve({
                    success: true,
                    item: {
                        name: "Scanned Product X",
                        hsn: code,
                        price: 125.50,
                        quantity: 42,
                        reorderLevel: 5
                    }
                });
            } else if (code) {
                // Simulate product not found
                resolve({
                    success: false,
                    error: "Item not found in inventory. Please add it."
                });
            } else {
                resolve({ success: false, error: "No code scanned." });
            }
        }, 1500);
    });
};


const ScannerModal = ({ isOpen, onClose, onScanSuccess, onScanError }) => {
    // State for the currently decoded result text
    const [result, setResult] = useState(null);
    // State for the lookup process
    const [lookupStatus, setLookupStatus] = useState('idle'); // 'idle', 'scanning', 'lookingUp', 'found', 'notFound'
    const [lookupError, setLookupError] = useState(null);

    // Reset component state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setResult(null);
            setLookupStatus('idle');
            setLookupError(null);
        }
    }, [isOpen]);

    // This function is called continuously by useZxing when a code is detected
    const onDecode = (code) => {
        if (code && code.getText() !== result) {
            setResult(code.getText());
            setLookupStatus('lookingUp');

            // Only proceed with lookup if we get a new, valid result
            mockItemLookup(code.getText()).then(response => {
                if (response.success) {
                    setLookupStatus('found');
                    onScanSuccess(response.item);
                    // You might want to close the modal here or after a short delay
                    // setTimeout(onClose, 2000); 
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
        }
    };

    // Initialize the scanner using the hook
    const { ref } = useZxing({
        onDecodeResult: onDecode,
        // Optional configuration for performance/device settings
        constraints: {
            video: {
                facingMode: 'environment', // Prefer rear camera
                // You can add resolution constraints here if needed
            },
        },
        // Only enable scanner when the modal is open and not already looking up a result
        paused: !isOpen || lookupStatus !== 'idle',
    });

    if (!isOpen) return null;

    // Determine content based on lookupStatus
    let statusIcon = <ScanLine className="w-8 h-8 text-cyan-400" />;
    let statusText = "Point camera at a barcode or QR code...";
    let statusColor = "text-gray-300";

    if (lookupStatus === 'lookingUp') {
        statusIcon = <Loader className="w-8 h-8 text-indigo-400 animate-spin" />;
        statusText = "Code scanned. Looking up item in inventory...";
        statusColor = "text-indigo-300";
    } else if (lookupStatus === 'found') {
        statusIcon = <CheckCircle className="w-8 h-8 text-teal-400" />;
        statusText = `Item found! Code: ${result}`;
        statusColor = "text-teal-300";
    } else if (lookupStatus === 'notFound') {
        statusIcon = <AlertTriangle className="w-8 h-8 text-red-400" />;
        statusText = `Error: ${lookupError || "Item not found."}`;
        statusColor = "text-red-300";
    }

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-95 backdrop-blur-sm flex items-center justify-center z-[60] p-4 transition-opacity">
            <div className="bg-gray-800 w-full max-w-lg rounded-xl shadow-2xl border border-cyan-700/50">

                {/* Modal Header */}
                <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-cyan-900/40 rounded-t-xl">
                    <h2 className="text-xl font-bold text-cyan-300 flex items-center">
                        <ScanLine className="w-5 h-5 mr-2" /> Barcode/QR Scanner
                    </h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-white p-1">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Camera Feed Area */}
                <div className="p-4">
                    <div className="aspect-video w-full bg-gray-900 rounded-lg overflow-hidden border-2 border-dashed border-gray-700 relative">
                        {/* Video element reference for zxing */}
                        <video ref={ref} className="w-full h-full object-cover" />

                        {/* Focus Border/Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-2/3 h-2/3 border-4 border-cyan-500 opacity-70 rounded-lg shadow-[0_0_10px_2px_rgba(6,182,212,0.8)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, 5% 5%, 95% 5%, 95% 95%, 5% 95%, 5% 5%)' }}></div>
                        </div>
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
                    {result && (
                        <p className="text-sm text-gray-400 mt-2">
                            Decoded: <span className="font-mono text-white bg-gray-700 px-2 py-0.5 rounded text-xs">{result}</span>
                        </p>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-5 border-t border-gray-700 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition font-medium"
                    >
                        Close Scanner
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScannerModal;
