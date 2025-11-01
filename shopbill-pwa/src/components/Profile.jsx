import React, { useState } from 'react';
import { 
    User, Mail, Phone, MapPin, DollarSign, Clock, Check, Building, 
    UploadCloud, Edit, Shield, AlertTriangle
} from 'lucide-react';

// --- Main App Component ---
function Profile() {
    // Combined State Initialization (Replaced useEffect and mockUser)
    const [profile, setProfile] = useState({
        name: 'Alex Johnson (Mock User)',
        email: 'alex.j@example.com',
        phone: '+91 99887 76655', 
        shopName: 'AJ Retail Solutions',
        taxId: 'MOCKGST123456',
        address: '101 Mock Street, Bengaluru, 560001',
        currency: 'INR - Indian Rupee',
        timezone: 'Asia/Kolkata (GMT+5:30)',
        profileImageUrl: 'https://placehold.co/120x120/1e293b/ffffff?text=A' 
    });

    const mockUserId = 'mock-user-1234567890';
    const [isEditing, setIsEditing] = useState(false);


    const handleSave = () => {
        setIsEditing(false); 
        console.log("Local Save Simulated. Updated Profile:", profile);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };
    
    // Helper Component: Editable Input Field
    const ProfileInputField = ({ label, name, value, icon: Icon, readOnly = false, placeholder = '' }) => (
        <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-gray-300 flex items-center">
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
                        ? 'border-gray-700 bg-gray-800 text-gray-400 cursor-default'
                        : 'border-indigo-600 bg-gray-900 text-white focus:ring-indigo-500 focus:border-indigo-500'
                    }
                `}
            />
        </div>
    );

    // --- Main Layout ---
    return (
        <div className="min-h-screen p-4 pb-20 md:p-8 md:pt-4 bg-gray-950 transition-colors duration-300 font-sans">
            
            {/* Page Header and Edit Button - FIX: Changed to flex-col on mobile */}
            <header className="mb-8 pt-4 md:pt-0 flex flex-col md:flex-row justify-between items-start md:items-center max-w-xl mx-auto">
                {/* Header Text Block */}
                <div>
                    <h1 className="text-3xl font-extrabold text-white">My Profile & Settings</h1>
                    <p className="text-gray-400 mt-1">Manage user identity and core business settings.</p>
                </div>
                {/* Edit/Save Button - Now takes full width on mobile, stacked below text */}
                <button 
                    onClick={() => {
                        if (isEditing) handleSave();
                        setIsEditing(prev => !prev);
                    }}
                    className={`mt-4 md:mt-0 w-full md:w-auto flex items-center justify-center md:justify-start px-4 py-2 rounded-full font-semibold transition duration-150 shadow-lg text-sm sm:text-base 
                        ${isEditing 
                            ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/40' 
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-900/40'
                        }`}
                >
                    {isEditing ? <Check className="w-5 h-5 mr-1" /> : <Edit className="w-5 h-5 mr-1" />}
                    {isEditing ? 'Save Changes' : 'Edit'}
                </button>
            </header>
            
            <main className="space-y-6 max-w-xl mx-auto">
                
                {/* 1. Personal Account Information */}
                <section className="bg-gray-900 rounded-xl shadow-2xl shadow-indigo-900/10 overflow-hidden border border-gray-800 p-4 sm:p-6">
                    <h2 className="text-lg font-bold text-white flex items-center mb-4 pb-2 border-b border-gray-700">
                        <User className="w-5 h-5 mr-2 text-teal-400" /> Account Identity
                    </h2>
                    
                    <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-6">
                        <div className="relative">
                            <img src={profile.profileImageUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover ring-4 ring-indigo-600"/>
                            {isEditing && (
                                <button className="absolute bottom-0 right-0 p-1 bg-indigo-600 rounded-full text-white hover:bg-indigo-700 transition shadow-lg">
                                    <UploadCloud className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <div className="text-center sm:text-left">
                            <p className="text-xl font-bold text-white">{profile.name}</p>
                            <p className="text-sm text-indigo-400 break-all font-mono mt-1">User ID: {mockUserId}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <ProfileInputField label="Full Name" name="name" value={profile.name} icon={User} placeholder="e.g., Jane Doe"/>
                        <ProfileInputField label="Email Address (Login ID)" name="email" value={profile.email} icon={Mail} readOnly={true} />
                        <ProfileInputField label="Phone Number" name="phone" value={profile.phone} icon={Phone} placeholder="e.g., +91 98765 43210"/>
                    </div>
                </section>

                {/* 2. Essential Business Details */}
                <section className="bg-gray-900 rounded-xl shadow-2xl shadow-indigo-900/10 overflow-hidden border border-gray-800 p-4 sm:p-6">
                    <h2 className="text-lg font-bold text-white flex items-center mb-4 pb-2 border-b border-gray-700">
                        <Building className="w-5 h-5 mr-2 text-amber-400" /> Essential Business Details
                    </h2>
                    <div className="space-y-4">
                        <ProfileInputField label="Shop / Business Name (Required for Invoices)" name="shopName" value={profile.shopName} icon={Shield} placeholder="e.g., ShopBill Retail"/>
                        <ProfileInputField label="Tax/GST ID / EIN (Required for Invoices)" name="taxId" value={profile.taxId} icon={Check} placeholder="e.g., ABCDE1234F5G"/>
                        <ProfileInputField label="Business Address (Required for Invoices)" name="address" value={profile.address} icon={MapPin} placeholder="e.g., 123 Main St, City, State, Zip"/>
                        <ProfileInputField label="Default Currency (Core Setting - Read-Only)" name="currency" value={profile.currency} icon={DollarSign} readOnly={true}/>
                        <ProfileInputField label="Timezone (Core Setting - Read-Only)" name="timezone" value={profile.timezone} icon={Clock} readOnly={true}/>
                    </div>
                </section>
                
                {/* Save Button (Visible only when editing) */}
                {isEditing && (
                    <div className="p-4 sm:p-0">
                        <button onClick={handleSave} className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition duration-150 shadow-lg shadow-indigo-900/40 flex items-center justify-center">
                            <Check className="w-5 h-5 mr-2" /> Finalize & Save All Changes
                        </button>
                    </div>
                )}
                
            </main>
        </div>
    );
}

export default Profile;
