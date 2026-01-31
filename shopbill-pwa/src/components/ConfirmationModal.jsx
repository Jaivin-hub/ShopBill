import React from 'react';
import { AlertTriangle } from 'lucide-react';

const ConfirmationModal = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 md:p-6 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="confirmation-title">
        <section className="bg-gray-800 p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl shadow-2xl max-w-sm w-full transform transition-all my-auto max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            <header className="flex items-center mb-3 sm:mb-4 flex-shrink-0">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-red-500" aria-hidden="true" />
                <h3 id="confirmation-title" className="text-base sm:text-lg font-bold text-white">Confirm Action</h3>
            </header>
            <p className="text-gray-300 mb-4 sm:mb-6 text-sm sm:text-base flex-1" aria-label="Confirmation message">{message}</p>
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 sm:space-x-0 flex-shrink-0">
                <button
                    onClick={onCancel}
                    className="px-4 py-2.5 sm:py-2 text-sm font-medium rounded-xl text-gray-300 hover:bg-gray-700 transition order-2 sm:order-1"
                    aria-label="Cancel action"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    className="px-4 py-2.5 sm:py-2 text-sm font-medium rounded-xl text-white bg-red-600 hover:bg-red-700 transition order-1 sm:order-2"
                    aria-label="Confirm action"
                >
                    Confirm Clear
                </button>
            </div>
        </section>
    </div>
);

export default ConfirmationModal