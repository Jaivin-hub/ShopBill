import React from 'react'

const ConfirmationModal = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-labelledby="confirmation-title">
        <section className="bg-gray-800 p-6 rounded-xl shadow-2xl max-w-sm w-full transform transition-all">
            <header className="flex items-center mb-4">
                <AlertTriangle className="w-6 h-6 mr-3 text-red-500" aria-hidden="true" />
                <h3 id="confirmation-title" className="text-lg font-bold text-white">Confirm Action</h3>
            </header>
            <p className="text-gray-300 mb-6" aria-label="Confirmation message">{message}</p>
            <div className="flex justify-end space-x-3">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium rounded-xl text-gray-300 hover:bg-gray-700 transition"
                    aria-label="Cancel action"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    className="px-4 py-2 text-sm font-medium rounded-xl text-white bg-red-600 hover:bg-red-700 transition"
                    aria-label="Confirm action"
                >
                    Confirm Clear
                </button>
            </div>
        </section>
    </div>
);

export default ConfirmationModal