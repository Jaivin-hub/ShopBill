// BarcodeScannerModal.jsx (Updated)

import React from 'react';
import Modal from 'react-modal'; 
import { X, CameraOff, Camera } from 'lucide-react';
// 🌟 New: Import the useZxing hook
import { useZxing } from 'react-zxing';

const BarcodeScannerModal = ({ isOpen, onClose, onScan, showToast }) => {

    // --- Zxing scanning logic using the hook ---
    const { ref } = useZxing({
        // This is the main callback when a code is detected
        onResult(result) {
            // Check if the result is a 1D or 2D code and pass the text
            if (result && result.getText()) {
                onScan(result.getText());
                // After a successful scan, you might want to automatically close the modal
                onClose(); 
            }
        },
        onError(error) {
            // Log errors but don't close the modal immediately, 
            // as temporary errors (like changing camera) are common.
            console.error("Scanner Error:", error);
        },
        // Only run the scanner when the modal is open
        paused: !isOpen, 
        // Optional: Can specify formats if you only want to read barcodes
        // formats: ['EAN_13', 'CODE_128', 'QR_CODE'], 
        
        // Use 'environment' for the back camera (best for scanning)
        constraints: {
            video: { facingMode: 'environment' }
        }
    });

    if (!isOpen) return null;
    
    // Set the app element for react-modal (important for accessibility and warnings)
    Modal.setAppElement('#root'); // Assuming your root element has the ID 'root'

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onClose}
            contentLabel="Barcode Scanner - Scan product barcodes using your device camera"
            className="fixed inset-0 bg-gray-900/95 flex items-center justify-center p-4 z-50"
            overlayClassName="fixed inset-0 bg-black/75 z-40"
            aria-labelledby="barcode-scanner-title"
        >
            <section className="bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl" role="dialog" aria-modal="true">
                <header className="flex justify-between items-center border-b pb-3 border-gray-700">
                    <h2 id="barcode-scanner-title" className="text-xl font-bold text-white flex items-center">
                        <Camera className="w-6 h-6 mr-2 text-teal-400" aria-hidden="true" /> Mobile Camera Scan
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="mt-4 p-4 text-center bg-gray-900 rounded-lg h-64 flex flex-col items-center justify-center relative">
                    {/* 🌟 NEW ELEMENT: The video feed for the scanner is referenced by 'ref' */}
                    <video ref={ref} className='w-full h-full object-cover rounded-lg' />
                    
                    {/* Placeholder content if the camera fails or is paused */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                         <CameraOff className='w-10 h-10 text-gray-500 mb-3'/>
                         <p className="text-gray-400">
                             Camera preview loading... Ensure permissions are granted.
                         </p>
                    </div>
                    
                    {/* Note: The Mock Scan Button is no longer needed with real scanning */}
                </div>
                
                <p className='text-sm text-gray-500 mt-4' aria-label="Camera permission notice">Ensure camera access is granted for scanning.</p>
            </section>
        </Modal>
    );
};

export default BarcodeScannerModal;