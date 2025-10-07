import React, { useState, useEffect } from 'react';
import { 
    User, Mail, Phone, MapPin, DollarSign, Clock, Check, Building, 
    UploadCloud, Edit, Shield
} from 'lucide-react';

function Profile() {
    // State for the authenticated user object retrieved from localStorage
    const [currentUser, setCurrentUser] = useState(null);
    
    // --- State for Profile and Business Details (Initialized with placeholders) ---
    const [profile, setProfile] = useState({
        name: '', // Will be updated from localStorage
        email: '', // Will be updated from localStorage
        phone: '', // Will be updated from localStorage
        shopName: 'Loading Business...',
        taxId: 'Loading...',
        address: 'Loading...',
        currency: 'Loading...',
        timezone: 'Loading...',
        profileImageUrl: 'https://placehold.co/120x120/4f46e5/ffffff?text=U' 
    });

    const [isEditing, setIsEditing] = useState(false);

    // --- useEffect to load user data from localStorage ---
    useEffect(() => {
        try {
            // 1. Get the raw string from localStorage
            const userString = localStorage.getItem('currentUser');
            
            if (userString) {
                // 2. Parse the JSON string into an object
                const userData = JSON.parse(userString);
                
                setCurrentUser(userData);

                // 3. Initialize the editable profile state with the user data
                setProfile({
                    name: userData.name || 'User Name Missing',
                    email: userData.email || 'N/A',
                    phone: userData.phone || '+91 XXXX XXXXX',
                    // Assume business details are nested or available here. 
                    // Adjust keys based on your actual userData structure.
                    shopName: userData.business?.shopName || 'ShopBill Retail Outlet',
                    taxId: userData.business?.taxId || 'N/A',
                    address: userData.business?.address || 'Address Not Set',
                    currency: userData.business?.currency || 'INR - Indian Rupee',
                    timezone: userData.business?.timezone || 'Asia/Kolkata (GMT+5:30)',
                    profileImageUrl: userData.profileImageUrl || 'https://placehold.co/120x120/4f46e5/ffffff?text=' + (userData.name ? userData.name[0] : 'U')
                });
            } else {
                 console.warn("No 'currentUser' found in localStorage.");
                 // Optionally, redirect to login or show an error
            }
        } catch (error) {
            console.error("Error parsing 'currentUser' from localStorage:", error);
        }
    }, []); // Empty dependency array means this runs only once on mount


    // Placeholder handler for saving data (simulating an API call)
    const handleSave = () => {
        // In a real app, you would send profile data to your backend here
        // e.g., saveProfile(profile);
        console.log("Saving updated profile:", profile);
        alert("Profile and Business Details updated!");
        setIsEditing(false);
        // OPTIONAL: Update localStorage with the new profile data after a successful save
        // localStorage.setItem('currentUser', JSON.stringify({ ...currentUser, ...profile })); 
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({
            ...prev,
            [name]: value
        }));
    };
    
    // --- Helper Component: Editable Input Field ---
    const ProfileInputField = ({ label, name, value, icon: Icon, type = 'text', readOnly = false }) => (
        <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                <Icon className="w-4 h-4 mr-2 text-indigo-500" /> {label}
            </label>
            <input 
                type={type} 
                name={name}
                value={value}
                onChange={handleChange}
                readOnly={readOnly || !isEditing}
                className={`w-full p-3 border rounded-lg transition-all 
                    ${readOnly || !isEditing 
                        ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-800 dark:text-gray-200 cursor-default'
                        : 'border-indigo-400 dark:border-indigo-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500'
                    }
                `}
            />
        </div>
    );

    // --- Main Layout (Mobile-First) ---
    return (
        <div className="min-h-screen p-4 pb-20 md:p-8 md:pt-4 bg-gray-50 dark:bg-gray-900 transition-colors duration-300 font-sans">
            
            {/* Page Header and Edit Button */}
            <header className="mb-8 pt-4 md:pt-0 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white flex items-center">
                        <User className="w-7 h-7 mr-2 text-indigo-600 dark:text-indigo-400" /> My Profile
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        View and update your personal and business details.
                    </p>
                </div>
                <button 
                    onClick={() => {
                        if (isEditing) handleSave(); // Save if currently editing
                        setIsEditing(prev => !prev); // Toggle editing state
                    }}
                    className={`flex items-center px-4 py-2 rounded-full font-semibold transition duration-150 shadow-md text-sm sm:text-base 
                        ${isEditing 
                            ? 'bg-red-500 hover:bg-red-600 text-white' 
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                >
                    {isEditing ? <Check className="w-5 h-5 mr-1" /> : <Edit className="w-5 h-5 mr-1" />}
                    {isEditing ? 'Save Changes' : 'Edit'}
                </button>
            </header>

            <main className="space-y-6 max-w-xl mx-auto">
                
                {/* 1. Personal Account Information */}
                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700 p-4 sm:p-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center mb-4 pb-2 border-b dark:border-gray-700">
                        <User className="w-5 h-5 mr-2 text-green-500" /> Personal Info
                    </h2>
                    
                    {/* Profile Picture */}
                    <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-6">
                        <div className="relative">
                            <img 
                                src={profile.profileImageUrl} 
                                alt="Profile" 
                                className="w-24 h-24 rounded-full object-cover ring-4 ring-indigo-300 dark:ring-indigo-600"
                            />
                            {isEditing && (
                                <button className="absolute bottom-0 right-0 p-1 bg-indigo-500 rounded-full text-white hover:bg-indigo-600 transition">
                                    <UploadCloud className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <div className="text-center sm:text-left">
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{profile.name}</p>
                            {/* Display a key piece of loaded info to confirm success */}
                            {/* <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                                {currentUser ? `User ID: ${currentUser.id || 'N/A'}` : 'Shop Owner / Administrator'}
                            </p> */}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <ProfileInputField 
                            label="Full Name" 
                            name="name" 
                            value={profile.name} 
                            icon={User} 
                        />
                        <ProfileInputField 
                            label="Email Address" 
                            name="email" 
                            value={profile.email} 
                            icon={Mail} 
                            type="email" 
                            readOnly={true} // Email usually requires a separate verification flow to change
                        />
                        <ProfileInputField 
                            label="Phone Number" 
                            name="phone" 
                            value={profile.phone} 
                            icon={Phone} 
                            type="tel"
                        />
                    </div>
                </section>

                {/* 2. Business Details (Moved from Settings) */}
                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700 p-4 sm:p-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center mb-4 pb-2 border-b dark:border-gray-700">
                        <Building className="w-5 h-5 mr-2 text-yellow-500" /> Business Details
                    </h2>
                    <div className="space-y-4">
                        <ProfileInputField 
                            label="Shop Name" 
                            name="shopName" 
                            value={profile.shopName} 
                            icon={Shield} 
                        />
                        <ProfileInputField 
                            label="Tax/GST ID" 
                            name="taxId" 
                            value={profile.taxId} 
                            icon={Check} 
                        />
                        <ProfileInputField 
                            label="Business Address" 
                            name="address" 
                            value={profile.address} 
                            icon={MapPin} 
                        />
                         <ProfileInputField 
                            label="Default Currency" 
                            name="currency" 
                            value={profile.currency} 
                            icon={DollarSign} 
                            readOnly={true}
                        />
                         <ProfileInputField 
                            label="Timezone" 
                            name="timezone" 
                            value={profile.timezone} 
                            icon={Clock} 
                            readOnly={true}
                        />
                    </div>
                </section>
                
                {/* Save Button (Visible only when editing) */}
                {isEditing && (
                    <div className="p-4 sm:p-0">
                        <button 
                            onClick={handleSave}
                            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition duration-150 shadow-lg flex items-center justify-center"
                        >
                            <Check className="w-5 h-5 mr-2" /> Finalize & Save All Changes
                        </button>
                    </div>
                )}
                
            </main>
        </div>
    );
}

export default Profile;