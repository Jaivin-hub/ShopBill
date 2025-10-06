import React from 'react';
import { CreditCard, Receipt, Package, Users, LineChart, UserCog, Cloud } from 'lucide-react';
import coverImage from '../../public/covermain.png'
// Placeholder for the cover image, ensuring the component remains self-contained.
// const coverImage = 'https://placehold.co/700x400/312e81/ffffff?text=Pocket+POS+Dashboard'; 

const LandingPage = ({ onStartApp }) => { 
    return (
        <div className="min-h-screen bg-gray-950 scroll-smooth text-gray-300 font-sans">
            {/* Custom Styles using a style block within the component */}
            <style jsx global>{`
                :root {
                    --color-primary: #818cf8; /* indigo-400 for dark theme contrast */
                    --color-secondary: #2dd4bf; /* teal-400 for dark theme contrast */
                }
                .text-gradient {
                    background-image: linear-gradient(to right, var(--color-primary), var(--color-secondary));
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    color: transparent;
                }
                .feature-card {
                    transition: all 0.3s ease;
                    transform: translateY(0);
                }
                .feature-card:hover {
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
                    transform: translateY(-5px);
                }
                @media (max-width: 767px) {
                    .hero-title {
                        font-size: 2.25rem; 
                    }
                }
            `}</style>

            {/* Navigation Header */}
            <nav className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-sm shadow-xl shadow-indigo-900/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <a href="#" className="flex items-center space-x-2">
                            <CreditCard className="w-6 h-6 text-indigo-400" />
                            <span className="text-xl font-bold text-white">Pocket POS</span>
                        </a>
                        
                        <button 
                            onClick={onStartApp}
                            className="bg-indigo-600 text-white cursor-pointer text-sm font-semibold py-2 px-4 rounded-full shadow-lg hover:bg-indigo-700 transition duration-300">
                            Get Started
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main>
                {/* 1. Hero Section */}
                <section className="py-16 md:py-24 bg-gray-950">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <span className="inline-block text-sm font-semibold text-teal-400 uppercase tracking-widest bg-teal-900/50 px-3 py-1 rounded-full mb-3 border border-teal-700/50">
                            #1 Retail Management Tool
                        </span>
                        
                        <h1 className="hero-title text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tighter mb-4 text-white">
                            Your Shop, Fully Managed. <br className="hidden sm:inline" />
                            Right in your <span className="text-gradient">Pocket.</span>
                        </h1>
                        
                        <p className="mt-4 text-lg text-gray-400 max-w-3xl mx-auto mb-8">
                            Pocket POS transforms your smartphone or tablet into a powerful <strong>Point of Sale</strong> and <strong>Business Manager</strong>. Cut down on clutter, save time, and track every rupee instantly.
                        </p>

                        {/* Primary CTAs */}
                        <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                            <a 
                                href="#pricing"
                                className="w-full sm:w-auto px-8 py-3 bg-indigo-600 text-white text-lg font-bold rounded-xl shadow-xl hover:bg-indigo-700 transition transform hover:scale-[1.02] duration-300 ease-in-out">
                                Start Your Free Trial
                            </a>
                            <a href="#features" className="w-full sm:w-auto px-8 py-3 bg-gray-800 text-indigo-400 text-lg font-bold rounded-xl border-2 border-indigo-900 hover:bg-gray-700 transition duration-300">
                                Explore Features
                            </a>
                        </div>

                        {/* Mock App Screenshot/Mockup */}
                        <div className="mt-12">
                            <img 
                                src={coverImage}
                                alt="Pocket POS Application Dashboard Preview" 
                                className="mx-auto rounded-xl shadow-[0_25px_50px_-12px_rgba(79,70,229,0.3)] border-4 border-gray-800 transform rotate-1 transition duration-500 ease-in-out hover:rotate-0 hover:scale-100" 
                            />
                        </div>
                    </div>
                </section>
                
                {/* 2. Core Features Section */}
                <section id="features" className="py-16 bg-gray-950">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
                                Manage Every Aspect of Your Business
                            </h2>
                            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                                From ultra-fast billing to deep financial insights, Pocket POS does the heavy lifting so you can focus on your customers.
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            
                            <div className="feature-card bg-gray-800 p-6 rounded-xl shadow-lg border border-indigo-900/50 hover:shadow-2xl">
                                <div className="p-3 inline-flex items-center justify-center rounded-full bg-indigo-900/50 text-indigo-400 mb-4">
                                    <Receipt className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Lightning-Fast POS</h3>
                                <p className="text-gray-400">Complete sales transactions in seconds. Intuitive touch interface designed for high-volume retail environments. Print receipts or share via SMS.</p>
                            </div>
                            
                            <div className="feature-card bg-gray-800 p-6 rounded-xl shadow-lg border border-teal-900/50 hover:shadow-2xl">
                                <div className="p-3 inline-flex items-center justify-center rounded-full bg-teal-900/50 text-teal-400 mb-4">
                                    <Package className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Real-Time Stock Control</h3>
                                <p className="text-gray-400">Add, edit, and track products effortlessly. Get instant low-stock alerts and set smart reorder levels to never miss a sale.</p>
                            </div>

                            <div className="feature-card bg-gray-800 p-6 rounded-xl shadow-lg border border-amber-900/50 hover:shadow-2xl">
                                <div className="p-3 inline-flex items-center justify-center rounded-full bg-amber-900/50 text-amber-400 mb-4">
                                    <Users className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Digital Khata (Credit Ledger)</h3>
                                <p className="text-gray-400">Manage customer credit and outstanding payments easily. Send gentle reminders and record payments, keeping your ledger always balanced.</p>
                            </div>

                            <div className="feature-card bg-gray-800 p-6 rounded-xl shadow-lg border border-purple-900/50 hover:shadow-2xl">
                                <div className="p-3 inline-flex items-center justify-center rounded-full bg-purple-900/50 text-purple-400 mb-4">
                                    <LineChart className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Instant Business Reports</h3>
                                <p className="text-gray-400">View daily, weekly, and custom sales trends. Identify top-selling items and busy hours to optimize purchasing and staffing.</p>
                            </div>
                            
                            <div className="feature-card bg-gray-800 p-6 rounded-xl shadow-lg border border-pink-900/50 hover:shadow-2xl">
                                <div className="p-3 inline-flex items-center justify-center rounded-full bg-pink-900/50 text-pink-400 mb-4">
                                    <UserCog className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Staff & Permissions</h3>
                                <p className="text-gray-400">Set specific roles (Owner, Cashier) for your staff members. Control access to sensitive data like reports and inventory management.</p>
                            </div>
                            
                            <div className="feature-card bg-gray-800 p-6 rounded-xl shadow-lg border border-blue-900/50 hover:shadow-2xl">
                                <div className="p-3 inline-flex items-center justify-center rounded-full bg-blue-900/50 text-blue-400 mb-4">
                                    <Cloud className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Secure Cloud Sync</h3>
                                <p className="text-gray-400">Your data is safe and constantly synchronized across all your devices. Never worry about losing sales data or inventory records again.</p>
                            </div>
                        </div>
                    </div>
                </section>
                
                {/* 3. Testimonial/Social Proof */}
                <section className="py-16 md:py-20 bg-indigo-700">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <blockquote className="text-white">
                            <p className="text-2xl md:text-3xl font-medium leading-relaxed italic">
                                "Pocket POS saved me hours every week. Managing credit accounts (Khata) used to be a headache, now it's just a tap away. The best mobile POS solution for my small retail shop."
                            </p>
                            <footer className="mt-8">
                                <p className="text-lg font-semibold text-indigo-200">
                                    Ravi Sharma, Owner
                                </p>
                                <p className="text-sm text-indigo-300">
                                    Sharma General Store, Kochi
                                </p>
                            </footer>
                        </blockquote>
                    </div>
                </section>

                {/* 4. Pricing / Final CTA */}
                <section id="pricing" className="py-16 md:py-20 bg-gray-950">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
                            Simple Pricing, Powerful Features
                        </h2>
                        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
                            Choose the plan that fits your business. No hidden fees, just everything you need to grow.
                        </p>

                        {/* Pricing Card Grid (3 Columns) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                            
                            {/* -------------------- FREE PLAN -------------------- */}
                            <div className="bg-gray-800 text-gray-300 p-8 rounded-2xl shadow-xl border-2 border-gray-700/50 hover:border-teal-600 transition duration-300">
                                <h3 className="text-2xl font-bold mb-2 text-white">Free Plan</h3>
                                <p className="text-gray-400 text-sm">Perfect for new sellers and home businesses.</p>
                                <div className="my-6">
                                    <span className="text-5xl font-extrabold text-white">₹0</span>
                                    <span className="text-xl font-medium text-gray-400">/month</span>
                                </div>
                                <ul className="text-left space-y-3 mb-8 text-gray-300">
                                    <li className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-teal-400"><polyline points="20 6 9 17 4 12"/></svg>
                                        Up to 50 Transactions/month
                                    </li>
                                    <li className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-teal-400"><polyline points="20 6 9 17 4 12"/></svg>
                                        1 User (Owner Only)
                                    </li>
                                    <li className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-teal-400"><polyline points="20 6 9 17 4 12"/></svg>
                                        Basic Inventory (100 items)
                                    </li>
                                    <li className="flex items-center text-gray-500">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-red-500"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                        Digital Khata (View Only)
                                    </li>
                                </ul>
                                
                                <button 
                                    onClick={onStartApp}
                                    className="block cursor-pointer w-full py-3 bg-teal-600 text-white text-lg font-bold rounded-xl shadow-lg hover:bg-teal-700 transition duration-300">
                                    Get Started Free
                                </button>
                            </div>

                            {/* -------------------- BASIC PLAN -------------------- */}
                            <div className="bg-gray-800 text-gray-300 p-8 rounded-2xl shadow-xl border-2 border-gray-700/50 hover:border-indigo-600 transition duration-300">
                                <h3 className="text-2xl font-bold mb-2 text-white">Basic Plan</h3>
                                <p className="text-gray-400 text-sm">Best for single outlets and small teams.</p>
                                <div className="my-6">
                                    <span className="text-5xl font-extrabold text-white">₹499</span>
                                    <span className="text-xl font-medium text-gray-400">/month</span>
                                </div>
                                <ul className="text-left space-y-3 mb-8 text-gray-300">
                                    <li className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-teal-400"><polyline points="20 6 9 17 4 12"/></svg>
                                        Unlimited Transactions
                                    </li>
                                    <li className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-teal-400"><polyline points="20 6 9 17 4 12"/></svg>
                                        2 Users (Owner + 1 Cashier)
                                    </li>
                                    <li className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-teal-400"><polyline points="20 6 9 17 4 12"/></svg>
                                        Full Inventory Management
                                    </li>
                                    <li className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-teal-400"><polyline points="20 6 9 17 4 12"/></svg>
                                        Full Digital Khata Ledger
                                    </li>
                                </ul>
                                
                                <button 
                                    onClick={onStartApp}
                                    className="block cursor-pointer w-full py-3 bg-indigo-600 text-white text-lg font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition duration-300">
                                    Select Basic
                                </button>
                            </div>


                            {/* -------------------- PRO PLAN (FEATURED - ₹999/month) -------------------- */}
                            <div className="bg-indigo-600 text-white p-8 rounded-2xl shadow-[0_25px_50px_-12px_rgba(79,70,229,0.5)] border-4 border-indigo-400 transform scale-100 lg:scale-[1.05] lg:relative lg:-top-3 transition duration-300">
                                <div className="absolute top-0 right-0 -mt-3 -mr-3 bg-teal-400 text-gray-900 text-xs font-bold py-1 px-3 rounded-full shadow-md">
                                    Recommended
                                </div>
                                <h3 className="text-2xl font-bold mb-2">Pro Plan</h3>
                                <p className="text-indigo-200 text-sm">Ideal for multiple outlets and high-growth businesses.</p>
                                <div className="my-6">
                                    <span className="text-5xl font-extrabold text-white">₹999</span>
                                    <span className="text-xl font-medium text-indigo-200">/month</span>
                                </div>
                                <ul className="text-left space-y-3 mb-8 text-indigo-100">
                                    <li className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-white"><polyline points="20 6 9 17 4 12"/></svg>
                                        Unlimited Transactions & Bills
                                    </li>
                                    <li className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-white"><polyline points="20 6 9 17 4 12"/></svg>
                                        Unlimited Users & Roles
                                    </li>
                                    <li className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-white"><polyline points="20 6 9 17 4 12"/></svg>
                                        Full Inventory & Bulk Tools
                                    </li>
                                    <li className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-white"><polyline points="20 6 9 17 4 12"/></svg>
                                        Khata + Automated SMS Reminders
                                    </li>
                                </ul>
                                
                                <button 
                                    onClick={onStartApp}
                                    className="block cursor-pointer w-full py-3 bg-white text-indigo-700 text-lg font-bold rounded-xl shadow-lg hover:bg-gray-100 transition duration-300">
                                    Choose Pro
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

            </main>

            {/* Footer */}
            <footer className="bg-gray-900 border-t border-gray-800 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500">
                    <div className="mb-4">
                        <a href="#" className="text-indigo-400 hover:text-indigo-300 mx-3">Privacy Policy</a>
                        <a href="#" className="text-indigo-400 hover:text-indigo-300 mx-3">Terms of Service</a>
                        <a href="#" className="text-indigo-400 hover:text-indigo-300 mx-3">Support</a>
                    </div>
                    <p>&copy; 2025 Pocket POS. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
