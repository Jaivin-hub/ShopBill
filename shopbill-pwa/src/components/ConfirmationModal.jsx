import React from 'react'

const ConfirmationModal = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl max-w-sm w-full transform transition-all">
            <div className="flex items-center mb-4">
                <AlertTriangle className="w-6 h-6 mr-3 text-red-500" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Confirm Action</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
            <div className="flex justify-end space-x-3">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    className="px-4 py-2 text-sm font-medium rounded-xl text-white bg-red-600 hover:bg-red-700 transition"
                >
                    Confirm Clear
                </button>
            </div>
        </div>
    </div>
);

export default ConfirmationModal