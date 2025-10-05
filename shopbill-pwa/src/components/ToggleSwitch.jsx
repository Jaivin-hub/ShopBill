import React from 'react'

const ToggleSwitch = ({ checked, onChange }) => (
    <button
        onClick={(e) => { e.stopPropagation(); onChange(); }}
        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
            checked ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
        }`}
    >
        <span
            className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out shadow ${
                checked ? 'translate-x-6' : 'translate-x-1'
            }`}
        />
    </button>
);

export default ToggleSwitch