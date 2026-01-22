import React, { useState, useEffect, useCallback } from 'react';
import { 
    User, Mail, Phone, MapPin, IndianRupee, Clock, Check, Building, 
    Edit, Shield, Loader, Info, Save, X, Activity, Globe
} from 'lucide-react';
import API from '../config/api';

// --- HELPER COMPONENT ---
const ProfileInputField = ({ label, name, value, icon: Icon, readOnly = false, placeholder = '', onChange, isEditing, darkMode }) => (
    <div className="flex flex-col space-y-2">
        <label className={`text-[10px] font-bold tracking-[0.2em] flex items-center ml-1 ${darkMode ? 'text-gray-500' : 'text-slate-500'}`}>
            <Icon className="w-3 h-3 mr-2 text-indigo-500" /> {label}
        </label>
        <div className="relative group">
            <input 
                type={name.includes('phone') ? 'tel' : name.includes('email') ? 'email' : 'text'} 
                name={name}
                value={value || ''}
                onChange={onChange}
                placeholder={placeholder}
                readOnly={readOnly || !isEditing}
                /* MOBILE ZOOM FIX: text-[16px] md:text-xs prevents auto-zoom on mobile */
                className={`w-full p-4 rounded-xl transition-all text-[16px] md:text-xs font-bold outline-none border tabular-nums
                    ${readOnly || !isEditing 
                        ? (darkMode ? 'border-gray-800/50 bg-gray-900/20 text-gray-500 cursor-not-allowed' : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed')
                        : (darkMode ? 'border-gray-700 bg-gray-950 text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-2xl shadow-indigo-500/5' 
                                   : 'border-slate-300 bg-white text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-lg shadow-indigo-500/5')
                    }
                `}
            />
            {!readOnly && isEditing && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity">
                    <Edit className="w-3.5 h-3.5 text-indigo-400" />
                </div>
            )}
        </div>
    </div>
);

function Profile({ apiClient, showToast, darkMode }) {
    const [profile, setProfile] = useState({
        email: '',
        phone: '',
        shopName: '',
        taxId: '',
        address: '',
        currency: 'INR',
        timezone: 'Asia/Kolkata'
    });

    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const fetchProfileData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.get(API.profile);
            const data = response.data.user || response.data.data || response.data;
            setProfile(data);
        } catch (error) {
            showToast('Error synchronizing profile data.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [apiClient, showToast]);

    useEffect(() => {
        fetchProfileData();
    }, [fetchProfileData]);

    const handleSave = async () => {
        try {
            showToast('Syncing changes...', 'info');
            const response = await apiClient.put(API.profile, profile);
            const updatedData = response.data.user || response.data.data || response.data;
            setProfile(updatedData);
            
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            localStorage.setItem('currentUser', JSON.stringify({ ...currentUser, ...updatedData }));

            setIsEditing(false);
            showToast('Identity updated successfully', 'success');
        } catch (error) {
            const errMsg = error.response?.data?.error || 'Update failed.';
            showToast(errMsg, 'error');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    if (isLoading) {
        return (
            <div className={`flex flex-col items-center justify-center min-h-screen ${darkMode ? 'bg-gray-950' : 'bg-slate-50'}`}>
                <Loader className="w-6 h-6 animate-spin text-indigo-500" />
                <p className={`text-[10px] font-bold tracking-[0.3em] mt-6 ${darkMode ? 'text-gray-600' : 'text-slate-400'}`}>Decoding Identity Buffer</p>
            </div>
        );
    }

    // Theme Variables
    const mainBg = darkMode ? 'bg-gray-950 text-gray-200' : 'bg-slate-50 text-slate-900';
    const headerBg = darkMode ? 'bg-gray-950/90 border-gray-800/60' : 'bg-white/90 border-slate-200 shadow-sm';
    const sectionBg = darkMode ? 'bg-gray-900/40 border-gray-800' : 'bg-white border-slate-200 shadow-sm';
    const sectionHeaderBg = darkMode ? 'bg-gray-900/60 border-gray-800' : 'bg-slate-50 border-slate-200';

    return (
        <main className={`min-h-screen transition-colors duration-300 ${mainBg}`}>
            {/* --- ELITE HEADER --- */}
            <header className={`sticky top-0 z-[100] backdrop-blur-md border-b px-6 py-6 ${headerBg}`}>
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className={`text-2xl font-bold tracking-tight leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                Profile <span className="text-indigo-500">Center</span>
                            </h1>
                            <p className={`text-[9px] font-bold tracking-[0.25em] mt-1.5 flex items-center gap-1.5 ${darkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                                Merchant Identity Verified
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {isEditing ? (
                            <>
                                <button 
                                    onClick={() => setIsEditing(false)}
                                    className={`p-2.5 rounded-xl transition-all active:scale-95 border ${darkMode ? 'bg-gray-900 border-gray-800 text-gray-500 hover:text-white' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'}`}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={handleSave}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-bold tracking-widest shadow-lg shadow-indigo-900/20 active:scale-95 transition-all"
                                >
                                    <Save className="w-3.5 h-3.5" /> Save Changes
                                </button>
                            </>
                        ) : (
                            <button 
                                onClick={() => setIsEditing(true)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-bold tracking-widest transition-all active:scale-95 border ${darkMode ? 'bg-gray-900 border-gray-800 text-indigo-400 hover:bg-gray-800' : 'bg-white border-slate-200 text-indigo-600 hover:bg-slate-50 shadow-sm'}`}
                            >
                                <Edit className="w-3.5 h-3.5" /> Modify Identity
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <div className="max-w-5xl mx-auto px-4 py-10 space-y-8 pb-32">
                
                {/* 1. Account Security & Identity */}
                <section className={`rounded-3xl overflow-hidden border transition-colors ${sectionBg}`}>
                    <div className={`px-6 py-5 border-b flex justify-between items-center transition-colors ${sectionHeaderBg}`}>
                        <h2 className={`text-[10px] font-bold tracking-[0.25em] flex items-center ${darkMode ? 'text-gray-500' : 'text-slate-500'}`}>
                            <Shield className="w-4 h-4 mr-3 text-indigo-500" /> Security Credentials
                        </h2>
                        <span className={`text-[8px] font-bold px-2 py-0.5 rounded border ${darkMode ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>Encrypted</span>
                    </div>

                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <ProfileInputField 
                            label="Terminal ID (Primary Email)" 
                            name="email" 
                            value={profile.email} 
                            icon={Mail} 
                            readOnly={true}
                            onChange={handleChange}
                            isEditing={isEditing}
                            darkMode={darkMode}
                        />
                        <ProfileInputField 
                            label="Verified Communication Line" 
                            name="phone" 
                            value={profile.phone} 
                            icon={Phone} 
                            placeholder="+91 00000 00000"
                            onChange={handleChange}
                            isEditing={isEditing}
                            darkMode={darkMode}
                        />
                    </div>
                </section>

                {/* 2. Business Entity Configuration */}
                <section className={`rounded-3xl overflow-hidden border transition-colors ${sectionBg}`}>
                    <div className={`px-6 py-5 border-b transition-colors ${sectionHeaderBg}`}>
                        <h2 className={`text-[10px] font-bold tracking-[0.25em] flex items-center ${darkMode ? 'text-gray-500' : 'text-slate-500'}`}>
                            <Building className="w-4 h-4 mr-3 text-amber-500" /> Business Infrastructure
                        </h2>
                    </div>
                    
                    <div className="p-8 space-y-8">
                        <ProfileInputField 
                            label="Registered Business Name" 
                            name="shopName" 
                            value={profile.shopName} 
                            icon={Activity} 
                            placeholder="e.g., ShopBill Retail"
                            onChange={handleChange}
                            isEditing={isEditing}
                            darkMode={darkMode}
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <ProfileInputField 
                                label="Tax / GST Identification" 
                                name="taxId" 
                                value={profile.taxId} 
                                icon={Check} 
                                placeholder="GSTIN-00XXXXX"
                                onChange={handleChange}
                                isEditing={isEditing}
                                darkMode={darkMode}
                            />
                            <ProfileInputField 
                                label="Operational Headquarters" 
                                name="address" 
                                value={profile.address} 
                                icon={MapPin} 
                                placeholder="Physical Address"
                                onChange={handleChange}
                                isEditing={isEditing}
                                darkMode={darkMode}
                            />
                        </div>

                        <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t transition-colors ${darkMode ? 'border-gray-800/60' : 'border-slate-100'}`}>
                            <ProfileInputField 
                                label="Default Ledger Currency" 
                                name="currency" 
                                value={profile.currency} 
                                icon={IndianRupee} 
                                readOnly={true}
                                onChange={handleChange}
                                isEditing={isEditing}
                                darkMode={darkMode}
                            />
                            <ProfileInputField 
                                label="Regional Synchronization Timezone" 
                                name="timezone" 
                                value={profile.timezone} 
                                icon={Globe} 
                                readOnly={true}
                                onChange={handleChange}
                                isEditing={isEditing}
                                darkMode={darkMode}
                            />
                        </div>
                    </div>
                </section>

                {/* SUPPORT NOTICE */}
                <div className={`border rounded-xl p-6 flex gap-4 transition-colors ${darkMode ? 'bg-indigo-500/5 border-indigo-500/10' : 'bg-indigo-50 border-indigo-100'}`}>
                    <Info className="w-5 h-5 text-indigo-400 shrink-0" />
                    <div>
                        <p className={`text-[10px] font-bold tracking-widest mb-1 ${darkMode ? 'text-gray-400' : 'text-slate-600'}`}>Infrastructure Notice</p>
                        <p className={`text-[10px] font-medium leading-relaxed tracking-tight ${darkMode ? 'text-gray-500' : 'text-slate-500'}`}>
                            Regional localization (Currency & Timezone) is locked to your primary registration. Contact system architecture support to modify core regional headers.
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}

export default Profile;