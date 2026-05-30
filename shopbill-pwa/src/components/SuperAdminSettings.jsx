import React, { useState } from 'react';
import {
    User, Lock, LogOut, Sun, Moon, Shield, Mail, Bell,
} from 'lucide-react';
import SettingItem from './SettingItem';
import ToggleSwitch from './ToggleSwitch';
import { SettingsHomeSkeleton } from './skeletons/PageSkeletons';

const ConfirmationModal = ({ message, onConfirm, onCancel, darkMode }) => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
        <div
            className={`w-full max-w-sm rounded-2xl border p-6 shadow-2xl ${
                darkMode ? 'border-gray-800 bg-gray-950' : 'border-slate-200 bg-white'
            }`}
        >
            <p className={`text-sm font-bold leading-relaxed ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                {message}
            </p>
            <div className="mt-6 flex gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className={`flex-1 rounded-xl py-3 text-xs font-black uppercase tracking-widest ${
                        darkMode ? 'bg-gray-800 text-gray-300' : 'bg-slate-100 text-slate-700'
                    }`}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={onConfirm}
                    className="flex-1 rounded-xl bg-rose-600 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-rose-500"
                >
                    Logout
                </button>
            </div>
        </div>
    </div>
);

const SuperAdminSettings = ({
    darkMode,
    setDarkMode,
    currentUser,
    setCurrentPage,
    setPageOrigin,
    onLogout,
}) => {
    const [confirmLogout, setConfirmLogout] = useState(false);

    const sectionClass = `${darkMode ? 'bg-slate-900/70 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl overflow-hidden transition-all`;
    const sectionHeaderClass = `px-5 md:px-6 py-4 border-b flex justify-between items-center ${darkMode ? 'bg-slate-950/70 border-slate-800/80' : 'bg-slate-50/90 border-slate-200'}`;
    const sectionLabelClass = `text-[10px] font-black tracking-[0.2em] flex items-center uppercase ${darkMode ? 'text-slate-400' : 'text-slate-700'}`;
    const headerBase = darkMode ? 'bg-gray-950/90 border-slate-800' : 'bg-white/95 border-slate-200 shadow-sm';

    if (!currentUser) {
        return <SettingsHomeSkeleton darkMode={darkMode} />;
    }

    const email = currentUser.email || '—';

    const handleChangePassword = () => {
        setPageOrigin('settings');
        setCurrentPage('passwordChange');
    };

    const handleLogout = () => {
        setConfirmLogout({
            message: 'This will end your super admin session. Continue?',
            onConfirm: () => {
                setConfirmLogout(null);
                if (onLogout) onLogout();
            },
            onCancel: () => setConfirmLogout(null),
        });
    };

    return (
        <div
            className={`flex h-full min-h-0 flex-col transition-colors duration-300 ${
                darkMode ? 'bg-gray-950 text-gray-200' : 'bg-slate-100 text-black'
            } selection:bg-indigo-500/30`}
        >
            <header
                className={`sticky top-0 z-[100] shrink-0 border-b px-4 py-5 backdrop-blur-md md:px-6 ${headerBase}`}
            >
                <div className="mx-auto flex max-w-7xl items-center justify-between">
                    <div>
                        <h1 className={`text-xl font-black tracking-tight md:text-2xl ${darkMode ? 'text-white' : 'text-black'}`}>
                            Settings
                        </h1>
                        <p
                            className={`mt-1.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.22em] ${
                                darkMode ? 'text-slate-500' : 'text-slate-700'
                            }`}
                        >
                            <Shield className="h-3.5 w-3.5 text-indigo-500" />
                            Super Admin
                        </p>
                    </div>
                </div>
            </header>

            <div className="custom-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
                <div className="mx-auto max-w-7xl p-4 pb-32 md:p-8">
                    <main className="mx-auto grid max-w-3xl grid-cols-1 gap-5 md:gap-6">
                        <section className={sectionClass}>
                            <div className={sectionHeaderClass}>
                                <h2 className={sectionLabelClass}>
                                    <User className="mr-3 h-4 w-4 text-indigo-500" />
                                    Account
                                </h2>
                            </div>
                            <div className={`px-5 py-4 md:px-6 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${
                                            darkMode
                                                ? 'border-indigo-500/30 bg-indigo-500/10'
                                                : 'border-indigo-200 bg-indigo-50'
                                        }`}
                                    >
                                        <Shield className="h-6 w-6 text-indigo-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`text-sm font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                            Platform Administrator
                                        </p>
                                        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs font-bold text-indigo-500">
                                            <Mail className="h-3.5 w-3.5 shrink-0" />
                                            {email}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-1.5 md:p-2">
                                <SettingItem
                                    icon={Lock}
                                    title="Change password"
                                    description="Update your login credentials."
                                    onClick={handleChangePassword}
                                    accentColor="text-rose-600"
                                    darkMode={darkMode}
                                />
                                <SettingItem
                                    icon={Bell}
                                    title="Notifications"
                                    description="View platform alerts and activity."
                                    onClick={() => setCurrentPage('notifications')}
                                    accentColor="text-sky-600"
                                    darkMode={darkMode}
                                />
                                <SettingItem
                                    icon={LogOut}
                                    title="Logout"
                                    description="End your super admin session."
                                    onClick={handleLogout}
                                    accentColor="text-rose-700"
                                    darkMode={darkMode}
                                />
                            </div>
                        </section>

                        <section className={sectionClass}>
                            <div className={sectionHeaderClass}>
                                <h2 className={sectionLabelClass}>
                                    {darkMode ? (
                                        <Sun className="mr-3 h-4 w-4 text-amber-500" />
                                    ) : (
                                        <Moon className="mr-3 h-4 w-4 text-indigo-600" />
                                    )}
                                    Appearance
                                </h2>
                            </div>
                            <div className="p-1.5 md:p-2">
                                <SettingItem
                                    icon={darkMode ? Sun : Moon}
                                    title="Theme"
                                    description={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                                    actionComponent={
                                        <ToggleSwitch
                                            checked={darkMode}
                                            onChange={() => setDarkMode(!darkMode)}
                                            darkMode={darkMode}
                                        />
                                    }
                                    accentColor={darkMode ? 'text-amber-500' : 'text-indigo-500'}
                                    darkMode={darkMode}
                                />
                            </div>
                        </section>

                        <button
                            type="button"
                            onClick={handleLogout}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 py-4 text-sm font-black uppercase tracking-widest text-rose-500 transition active:scale-[0.98] hover:bg-rose-500/20 md:hidden"
                        >
                            <LogOut className="h-5 w-5" />
                            Logout
                        </button>
                    </main>
                </div>
            </div>

            {confirmLogout && (
                <ConfirmationModal
                    message={confirmLogout.message}
                    onConfirm={confirmLogout.onConfirm}
                    onCancel={confirmLogout.onCancel}
                    darkMode={darkMode}
                />
            )}
        </div>
    );
};

export default SuperAdminSettings;
