import React from 'react'
import {AlertTriangle, X, CheckCircle} from 'lucide-react'

const NotificationToast = ({ message, type, onClose }) => {
    if (!message) return null;

    const baseClasses = "fixed bottom-4 right-4 p-4 rounded-xl shadow-2xl transition-all duration-300 transform flex items-center max-w-sm z-50";
    let typeClasses = "";
    let Icon = CheckCircle;
    
    switch (type) {
        case 'success':
            typeClasses = "bg-green-500 text-white";
            Icon = CheckCircle;
            break;
        case 'error':
            typeClasses = "bg-red-500 text-white";
            Icon = AlertTriangle;
            break;
        case 'info':
        default:
            typeClasses = "bg-blue-500 text-white";
            Icon = AlertTriangle;
            break;
    }

    return (
        <div className={`${baseClasses} ${typeClasses}`}>
            <Icon className="w-6 h-6 mr-3" />
            <span className="flex-1">{message}</span>
            <button onClick={onClose} className="ml-4 p-1 hover:opacity-75">
                <X className="w-5 h-5" />
            </button>
        </div>
    );
};

export default NotificationToast