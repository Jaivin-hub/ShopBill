import React, { useState, useEffect, useCallback } from 'react';
import { 
    User, Mail, Phone, MapPin, IndianRupee, Clock, Check, Building, 
    Edit, Shield, Loader
} from 'lucide-react';
import API from '../config/api';

// --- HELPER COMPONENT (Defined OUTSIDE to prevent focus loss) ---
const ProfileInputField = ({ label, name, value, icon: Icon, readOnly = false, placeholder = '', onChange, isEditing }) => (
    <div className="flex flex-col space-y-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
            <Icon className="w-4 h-4 mr-2 text-teal-400" /> {label}
        </label>
        <input 
            type={name.includes('phone') ? 'tel' : name.includes('email') ? 'email' : 'text'} 
            name={name}
            value={value || ''}
            onChange={onChange}
            placeholder={placeholder}
            readOnly={readOnly || !isEditing}
            className={`w-full p-3 border rounded-lg transition-all text-sm
                ${readOnly || !isEditing 
                    ? 'border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 cursor-default'
                    : 'border-indigo-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500 shadow-sm'
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

    // --- Data Fetching ---
    const fetchProfileData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.get(API.profile);
            const data = response.data.user || response.data;
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

    // --- Update Logic ---
    const handleSave = async () => {
        try {
            showToast('Updating profile...', 'info');
            const response = await apiClient.put(API.profile, profile);
            
            const updatedData = response.data.user || response.data;
            setProfile(updatedData);
            console.log('updatedData',updatedData)
            
            // Sync localStorage
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
            <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-950">
                <Loader className="w-10 h-10 animate-spin text-teal-400" />
                {/* <p className="mt-4 text-gray-500">Loading profile...</p> */}
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 pb-20 md:p-8 md:pt-4 bg-white dark:bg-gray-950 transition-colors duration-300 font-sans">
            
            <header className="mb-8 pt-4 md:pt-0 max-w-8xl mx-auto">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">My Profile</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">Refresh my core settings and identity.</p>
                    </div>

                    <button 
                        onClick={() => {
                            if (isEditing) {
                                handleSave();
                            } else {
                                setIsEditing(true);
                            }
                        }}
                        className={`flex items-center justify-center px-6 py-2.5 rounded-full font-bold transition duration-200 text-sm sm:text-base shadow-lg
                            ${isEditing 
                                ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-900/20' 
                                : 'bg-transparent border-2 border-indigo-600 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white shadow-indigo-900/10' 
                            }`}
                    >
                        {isEditing ? <Check className="w-5 h-5 mr-1.5" /> : <Edit className="w-5 h-5 mr-1.5" />}
                        {isEditing ? 'Save' : 'Edit'}
                    </button>
                </div>
            </header>
            
            <main className="space-y-6 max-w-8xl mx-auto">
                
                {/* 1. Personal Account Information */}
                <section className="bg-gray-100 dark:bg-gray-900 rounded-xl shadow-xl dark:shadow-indigo-900/5 overflow-hidden border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center mb-6 pb-2 border-b border-gray-200 dark:border-gray-700">
                        <User className="w-5 h-5 mr-2 text-teal-400" /> Account Identity
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <section className="bg-gray-100 dark:bg-gray-900 rounded-xl shadow-xl dark:shadow-indigo-900/5 overflow-hidden border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center mb-6 pb-2 border-b border-gray-200 dark:border-gray-700">
                        <Building className="w-5 h-5 mr-2 text-amber-400" /> Essential Business Details
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            label="Tax/GST ID / EIN (Required for Invoices)" 
                            name="taxId" 
                            value={profile.taxId} 
                            icon={Check} 
                            placeholder="e.g., ABCDE1234F5G"
                            onChange={handleChange}
                            isEditing={isEditing}
                        />
                        <ProfileInputField 
                            label="Business Address (Required for Invoices)" 
                            name="address" 
                            value={profile.address} 
                            icon={MapPin} 
                            placeholder="e.g., 123 Main St, City, State, Zip"
                            onChange={handleChange}
                            isEditing={isEditing}
                        />
                        <ProfileInputField 
                            label="Default Currency (Core Setting - Read-Only)" 
                            name="currency" 
                            value={profile.currency} 
                            icon={IndianRupee} 
                            readOnly={true}
                            onChange={handleChange}
                            isEditing={isEditing}
                        />
                        <ProfileInputField 
                            label="Timezone (Core Setting - Read-Only)" 
                            name="timezone" 
                            value={profile.timezone} 
                            icon={Clock} 
                            readOnly={true}
                            onChange={handleChange}
                            isEditing={isEditing}
                        />
                    </div>
                </section>
                
            </main>
        </div>
    );
}

export default Profile;