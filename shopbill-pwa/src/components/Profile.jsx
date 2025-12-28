import React, { useState } from 'react';
import { 
    User, Mail, Phone, MapPin, IndianRupee, Clock, Check, Building, 
    UploadCloud, Edit, Shield, AlertTriangle
} from 'lucide-react';

// --- Main App Component ---
function Profile() {
    // 1. Initialize data from localStorage
    const currentUserJSON = localStorage.getItem('currentUser');
    const currentUser = currentUserJSON ? JSON.parse(currentUserJSON) : {}; // Safe parsing
    // 2. State Initialization: Removed 'name' and use actual 'email' and 'phone' from currentUser
    console.log('currentUser',currentUser)
    const [profile, setProfile] = useState({
        email: currentUser.email || '',
        phone: currentUser.phone || '', 
    });

    const [isEditing, setIsEditing] = useState(false);


    const handleSave = () => {
        setIsEditing(false); 
        console.log("Local Save Simulated. Updated Profile:", profile);
        // NOTE: In a real app, you would call apiClient.put('/api/profile', profile) here
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };
    
    // Helper Component: Editable Input Field
    const ProfileInputField = ({ label, name, value, icon: Icon, readOnly = false, placeholder = '' }) => (
        <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                <Icon className="w-4 h-4 mr-2 text-teal-400" /> {label}
            </label>
            <input 
                type={name.includes('phone') ? 'tel' : name.includes('email') ? 'email' : 'text'} 
                name={name}
                value={value}
                onChange={handleChange}
                placeholder={placeholder}
                readOnly={readOnly || !isEditing}
                className={`w-full p-3 border rounded-lg transition-all text-sm
                    ${readOnly || !isEditing 
                        ? 'border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 cursor-default'
                        : 'border-indigo-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500'
                    }
                `}
            />
        </div>
    );

    // --- Main Layout ---
    return (
        <div className="min-h-screen p-4 pb-20 md:p-8 md:pt-4 bg-white dark:bg-gray-950 transition-colors duration-300 font-sans">
            
            {/* ⭐️ MODIFIED: Changed max-w-xl to max-w-3xl to increase content width */}
            <header className="mb-8 pt-4 md:pt-0 max-w-8xl mx-auto">
                <div className="flex justify-between items-center">
                    {/* Header Text Block */}
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">My Profile</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">Refresh my core settings and identity.</p> {/* Refined caption */}
                    </div>
                    {/* Edit/Save Button: Now sits next to the title text on all screens */}
                    <button 
                        onClick={() => {
                            if (isEditing) handleSave();
                            setIsEditing(prev => !prev);
                        }}
                        // Removed w-full and mt-4 to make it compact and inline
                        className={`md:w-auto flex items-center justify-center px-4 py-2 rounded-full font-semibold transition duration-200 text-sm sm:text-base 
                            ${isEditing 
                                ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/40' // Save state
                                : 'bg-transparent border border-indigo-600 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-700 hover:text-white hover:border-indigo-700' // Edit state
                            }`}
                    >
                        {isEditing ? <Check className="w-5 h-5 mr-1" /> : <Edit className="w-5 h-5 mr-1" />}
                        {isEditing ? 'Save' : 'Edit'}
                    </button>
                </div>
            </header>
            
            {/* ⭐️ MODIFIED: Changed max-w-xl to max-w-3xl to increase content width */}
            <main className="space-y-6 max-w-8xl mx-auto">
                
                {/* 1. Personal Account Information */}
                <section className="bg-gray-100 dark:bg-gray-900 rounded-xl shadow-2xl dark:shadow-indigo-900/10 overflow-hidden border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                        <User className="w-5 h-5 mr-2 text-teal-400" /> Account Identity
                    </h2>
                    
                    <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-6">
                        <div className="relative">
                            <img src={profile.profileImageUrl || 'https://cdn.vectorstock.com/i/500p/23/78/shopping-bag-icon-vector-27812378.jpg'} alt="Profile" className="w-24 h-24 rounded-full object-cover ring-4 ring-indigo-600"/>
                            {isEditing && (
                                <button className="absolute bottom-0 right-0 p-1 bg-indigo-600 rounded-full text-white hover:bg-indigo-700 transition shadow-lg">
                                    <UploadCloud className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <div className="text-center sm:text-left">
                            {/* Displaying Email as primary identity now */}
                            <p className="text-xl font-bold text-gray-900 dark:text-white break-all">{profile.shopName || 'Shop Name'}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Removed Full Name Field */}
                        <ProfileInputField label="Email Address (Login ID)" name="email" value={profile.email} icon={Mail} readOnly={true} />
                        <ProfileInputField label="Phone Number" name="phone" value={profile.phone} icon={Phone} placeholder="e.g., +91 98765 43210"/>
                    </div>
                </section>

                {/* 2. Essential Business Details */}
                <section className="bg-gray-100 dark:bg-gray-900 rounded-xl shadow-2xl dark:shadow-indigo-900/10 overflow-hidden border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                        <Building className="w-5 h-5 mr-2 text-amber-400" /> Essential Business Details
                    </h2>
                    <div className="space-y-4">
                        <ProfileInputField label="Shop / Business Name (Required for Invoices)" name="shopName" value={profile.shopName} icon={Shield} placeholder="e.g., ShopBill Retail"/>
                        <ProfileInputField label="Tax/GST ID / EIN (Required for Invoices)" name="taxId" value={profile.taxId} icon={Check} placeholder="e.g., ABCDE1234F5G"/>
                        <ProfileInputField label="Business Address (Required for Invoices)" name="address" value={profile.address} icon={MapPin} placeholder="e.g., 123 Main St, City, State, Zip"/>
                        <ProfileInputField label="Default Currency (Core Setting - Read-Only)" name="currency" value={profile.currency} icon={IndianRupee} readOnly={true}/>
                        <ProfileInputField label="Timezone (Core Setting - Read-Only)" name="timezone" value={profile.timezone} icon={Clock} readOnly={true}/>
                    </div>
                </section>
                
            </main>
        </div>
    );
}

export default Profile;