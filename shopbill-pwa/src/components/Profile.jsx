import React, { useState, useEffect, useCallback } from 'react';
import { 
    User, Mail, Phone, MapPin, IndianRupee, Clock, Check, Building, 
    Edit, Shield, Loader, Info, Save, X, Activity, Globe
} from 'lucide-react';
import API from '../config/api';

// --- HELPER COMPONENT ---
const ProfileInputField = ({ label, name, value, icon: Icon, readOnly = false, placeholder = '', onChange, isEditing }) => (
    <div className="flex flex-col space-y-2">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] flex items-center ml-1">
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
                className={`w-full p-4 rounded-2xl transition-all text-xs font-bold outline-none border tabular-nums
                    ${readOnly || !isEditing 
                        ? 'border-gray-800/50 bg-gray-900/20 text-gray-500 cursor-not-allowed'
                        : 'border-gray-700 bg-gray-950 text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-2xl shadow-indigo-500/5'
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

function Profile({ apiClient, showToast }) {
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
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950">
                <Loader className="w-6 h-6 animate-spin text-indigo-500" />
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em] mt-6">Decoding Identity Buffer</p>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gray-950 text-gray-200">
            {/* --- ELITE HEADER --- */}
            <header className="sticky top-0 z-[100] bg-gray-950/90 backdrop-blur-md border-b border-gray-800/60 px-6 py-6">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className="text-lg font-bold tracking-tight text-white uppercase leading-none">
                                Profile <span className="text-indigo-500">Center</span>
                            </h1>
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.25em] mt-1.5 flex items-center gap-1.5">
                                Merchant Identity Verified
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {isEditing ? (
                            <>
                                <button 
                                    onClick={() => setIsEditing(false)}
                                    className="p-2.5 bg-gray-900 border border-gray-800 text-gray-500 rounded-xl hover:text-white transition-all active:scale-95"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={handleSave}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-indigo-900/20 active:scale-95 transition-all"
                                >
                                    <Save className="w-3.5 h-3.5" /> Save Changes
                                </button>
                            </>
                        ) : (
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 border border-gray-800 text-indigo-400 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-gray-800 transition-all active:scale-95"
                            >
                                <Edit className="w-3.5 h-3.5" /> Modify Identity
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <div className="max-w-5xl mx-auto px-6 py-10 space-y-8 pb-32">
                
                {/* 1. Account Security & Identity */}
                <section className="bg-gray-900/40 border border-gray-800 rounded-3xl overflow-hidden">
                    <div className="px-6 py-5 bg-gray-900/60 border-b border-gray-800 flex justify-between items-center">
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500 flex items-center">
                            <Shield className="w-4 h-4 mr-3 text-indigo-500" /> Security Credentials
                        </h2>
                        <span className="text-[8px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/20 uppercase">Encrypted</span>
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
                        />
                        <ProfileInputField 
                            label="Verified Communication Line" 
                            name="phone" 
                            value={profile.phone} 
                            icon={Phone} 
                            placeholder="+91 00000 00000"
                            onChange={handleChange}
                            isEditing={isEditing}
                        />
                    </div>
                </section>

                {/* 2. Business Entity Configuration */}
                <section className="bg-gray-900/40 border border-gray-800 rounded-3xl overflow-hidden">
                    <div className="px-6 py-5 bg-gray-900/60 border-b border-gray-800">
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500 flex items-center">
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
                            />
                            <ProfileInputField 
                                label="Operational Headquarters" 
                                name="address" 
                                value={profile.address} 
                                icon={MapPin} 
                                placeholder="Physical Address"
                                onChange={handleChange}
                                isEditing={isEditing}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-gray-800/60">
                            <ProfileInputField 
                                label="Default Ledger Currency" 
                                name="currency" 
                                value={profile.currency} 
                                icon={IndianRupee} 
                                readOnly={true}
                                onChange={handleChange}
                                isEditing={isEditing}
                            />
                            <ProfileInputField 
                                label="Regional Synchronization Timezone" 
                                name="timezone" 
                                value={profile.timezone} 
                                icon={Globe} 
                                readOnly={true}
                                onChange={handleChange}
                                isEditing={isEditing}
                            />
                        </div>
                    </div>
                </section>

                {/* SUPPORT NOTICE */}
                <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-6 flex gap-4">
                    <Info className="w-5 h-5 text-indigo-400 shrink-0" />
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Infrastructure Notice</p>
                        <p className="text-[10px] font-medium text-gray-500 leading-relaxed uppercase tracking-tight">
                            Regional localization (Currency & Timezone) is locked to your primary registration. Contact system architecture support to modify core regional headers.
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}

export default Profile;