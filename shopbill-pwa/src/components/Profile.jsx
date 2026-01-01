import React, { useState, useEffect, useCallback } from 'react';
import { 
    User, Mail, Phone, MapPin, IndianRupee, Clock, Check, Building, 
    Edit, Shield, Loader
} from 'lucide-react';
import API from '../config/api';

// --- HELPER COMPONENT ---
const ProfileInputField = ({ label, name, value, icon: Icon, readOnly = false, placeholder = '', onChange, isEditing }) => (
    <div className="flex flex-col space-y-1.5">
        <label className="text-sm font-bold text-gray-400 flex items-center">
            <Icon className="w-4 h-4 mr-2 text-teal-400" /> {label}
        </label>
        <input 
            type={name.includes('phone') ? 'tel' : name.includes('email') ? 'email' : 'text'} 
            name={name}
            value={value || ''}
            onChange={onChange}
            placeholder={placeholder}
            readOnly={readOnly || !isEditing}
            className={`w-full p-3.5 border rounded-xl transition-all text-sm outline-none
                ${readOnly || !isEditing 
                    ? 'border-gray-800 bg-gray-800/50 text-gray-500 cursor-default'
                    : 'border-indigo-500/50 bg-gray-950 text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-inner'
                }
            `}
        />
    </div>
);

// --- MAIN APP COMPONENT ---
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
            // Handling common API response structures
            const data = response.data.user || response.data.data || response.data;
            setProfile(data);
        } catch (error) {
            console.error("Failed to load profile:", error);
            showToast('Error loading profile data.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [apiClient, showToast]);

    useEffect(() => {
        fetchProfileData();
    }, [fetchProfileData]);

    const handleSave = async () => {
        try {
            showToast('Updating profile...', 'info');
            const response = await apiClient.put(API.profile, profile);
            
            const updatedData = response.data.user || response.data.data || response.data;
            setProfile(updatedData);
            
            // Sync local storage so the sidebar/header updates name immediately
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            localStorage.setItem('currentUser', JSON.stringify({ ...currentUser, ...updatedData }));

            setIsEditing(false);
            showToast('Profile updated successfully!', 'success');
        } catch (error) {
            console.error("Profile update failed:", error);
            const errMsg = error.response?.data?.error || 'Failed to update profile.';
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
                <Loader className="w-10 h-10 animate-spin text-teal-400" />
            </div>
        );
    }

    return (
        <main className="min-h-screen p-4 pb-20 md:p-8 md:pt-4 bg-gray-950 transition-colors duration-300 font-sans text-gray-100">
            
            <header className="mb-8 pt-4 md:pt-0 max-w-7xl mx-auto">
                <div className="flex justify-between items-end border-b border-gray-800 pb-6">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">My Profile</h1>
                        <p className="text-gray-500 mt-1 text-sm font-medium">Shop & Account Settings</p>
                    </div>

                    <button 
                        onClick={() => {
                            if (isEditing) {
                                handleSave();
                            } else {
                                setIsEditing(true);
                            }
                        }}
                        className={`flex items-center justify-center px-6 py-2.5 rounded-xl font-bold transition-all duration-200 text-sm sm:text-base active:scale-95 shadow-lg
                            ${isEditing 
                                ? 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-900/40' 
                                : 'bg-gray-900 border border-indigo-500/30 text-indigo-400 hover:bg-gray-800 hover:border-indigo-400' 
                            }`}
                    >
                        {isEditing ? <Check className="w-5 h-5 mr-1.5" /> : <Edit className="w-5 h-5 mr-1.5" />}
                        {isEditing ? 'Save' : 'Edit Profile'}
                    </button>
                </div>
            </header>
            
            <div className="space-y-6 max-w-7xl mx-auto">
                {/* 1. Personal Account Information */}
                <section className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 p-5 sm:p-8">
                    <h2 className="text-xs font-black text-white flex items-center mb-8 uppercase tracking-widest opacity-70">
                        <User className="w-4 h-4 mr-2 text-teal-400" /> Account Identity
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <ProfileInputField 
                            label="Email Address (Login ID)" 
                            name="email" 
                            value={profile.email} 
                            icon={Mail} 
                            readOnly={true}
                            onChange={handleChange}
                            isEditing={isEditing}
                        />
                        <ProfileInputField 
                            label="Phone Number" 
                            name="phone" 
                            value={profile.phone} 
                            icon={Phone} 
                            placeholder="e.g., +91 98765 43210"
                            onChange={handleChange}
                            isEditing={isEditing}
                        />
                    </div>
                </section>

                {/* 2. Essential Business Details */}
                <section className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 p-5 sm:p-8">
                    <h2 className="text-xs font-black text-white flex items-center mb-8 uppercase tracking-widest opacity-70">
                        <Building className="w-4 h-4 mr-2 text-amber-400" /> Essential Business Details
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="md:col-span-2">
                            <ProfileInputField 
                                label="Shop / Business Name (Required for Invoices)" 
                                name="shopName" 
                                value={profile.shopName} 
                                icon={Shield} 
                                placeholder="e.g., ShopBill Retail"
                                onChange={handleChange}
                                isEditing={isEditing}
                            />
                        </div>
                        <ProfileInputField 
                            label="Tax/GST ID / EIN" 
                            name="taxId" 
                            value={profile.taxId} 
                            icon={Check} 
                            placeholder="e.g., ABCDE1234F5G"
                            onChange={handleChange}
                            isEditing={isEditing}
                        />
                        <ProfileInputField 
                            label="Business Address" 
                            name="address" 
                            value={profile.address} 
                            icon={MapPin} 
                            placeholder="e.g., 123 Main St, City, State"
                            onChange={handleChange}
                            isEditing={isEditing}
                        />
                        <ProfileInputField 
                            label="Default Currency (Read-Only)" 
                            name="currency" 
                            value={profile.currency} 
                            icon={IndianRupee} 
                            readOnly={true}
                            onChange={handleChange}
                            isEditing={isEditing}
                        />
                        <ProfileInputField 
                            label="System Timezone (Read-Only)" 
                            name="timezone" 
                            value={profile.timezone} 
                            icon={Clock} 
                            readOnly={true}
                            onChange={handleChange}
                            isEditing={isEditing}
                        />
                    </div>
                </section>
            </div>
        </main>
    );
}

export default Profile;