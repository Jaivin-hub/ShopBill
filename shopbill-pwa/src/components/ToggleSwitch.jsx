import React from 'react'

const ToggleSwitch = ({ checked, onChange, disabled = false, 'aria-label': ariaLabel }) => (
    <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-pressed={checked}
        onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!disabled) onChange?.();
        }}
        className={`relative z-10 inline-flex h-7 w-11 shrink-0 items-center rounded-full p-0.5 touch-manipulation transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:pointer-events-none ${
            checked ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
        }`}
    >
        <span
            aria-hidden
            className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${
                checked ? 'translate-x-5' : 'translate-x-0.5'
            }`}
        />
    </button>
);

export default ToggleSwitch