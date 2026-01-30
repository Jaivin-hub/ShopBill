import React from 'react';
import { MessageCircle, Plus } from 'lucide-react';

const EmptyChatView = ({
    chats,
    onNewChat,
    darkMode
}) => {
    const cardBase = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';

    return (
        <div className="flex-1 flex items-center justify-center p-8">
            <div className={`${cardBase} max-w-md w-full rounded-2xl border p-8 text-center`}>
                <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
                    darkMode ? 'bg-indigo-500/10' : 'bg-indigo-50'
                }`}>
                    <MessageCircle className={`w-10 h-10 ${
                        darkMode ? 'text-indigo-400' : 'text-indigo-600'
                    }`} />
                </div>
                <h3 className={`text-xl font-black mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {chats.length === 0 ? 'No Conversations Yet' : 'Select a Chat'}
                </h3>
                <p className={`text-sm mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {chats.length === 0 
                        ? 'Start communicating with your team members. Create your first chat to get started!'
                        : 'Choose a conversation from the sidebar to view messages or start a new one'
                    }
                </p>
                <button
                    onClick={onNewChat}
                    className="w-full py-3.5 px-6 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    <span>Start New Chat</span>
                </button>
                {chats.length > 0 && (
                    <p className={`text-xs mt-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        Or click on any chat from the sidebar
                    </p>
                )}
            </div>
        </div>
    );
};

export default EmptyChatView;


