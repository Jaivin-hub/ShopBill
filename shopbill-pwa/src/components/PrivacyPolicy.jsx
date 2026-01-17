import React, { useEffect } from 'react';
import { Printer, Lock, ArrowLeft, EyeOff, Server, Smartphone, ShieldCheck } from 'lucide-react';

const PrivacyPolicy = ({ onBack, origin }) => {
    // Ensure the page starts at the top when opened
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const handlePrint = () => {
        window.print();
    };

    const handleBackClick = () => {
        // Returns to 'settings' if that's where the user came from, else 'dashboard' (landing)
        onBack(origin === 'settings' ? 'settings' : 'dashboard');
    };

    // Structured Data for Privacy Policy
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "Privacy Policy - Pocket POS",
        "description": "Privacy Policy for Pocket POS retail management software. Learn how we collect, protect, and handle your business data securely.",
        "url": "https://yourdomain.com/policy"
    };

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
            <article className="min-h-screen bg-gray-950 flex flex-col items-center text-white font-sans" itemScope itemType="https://schema.org/WebPage">
            {/* Styles for print and layout */}
            <style dangerouslySetInnerHTML={{
                __html: `
        @media print {
          .print-hidden { display: none !important; }
          .print-container { background: white !important; color: black !important; box-shadow: none !important; border: none !important; width: 100% !important; margin: 0 !important; }
          .dark-card { background: white !important; border: 1px solid #eee !important; color: black !important; }
          .accent-box { background: #f0fdfa !important; border-color: #2dd4bf !important; color: #134e4a !important; }
          @page { margin: 1.5cm; }
        }
      `}} />

            {/* Sticky Navigation */}
            <nav className="sticky top-0 w-full z-40 bg-gray-950/80 backdrop-blur-md border-b border-gray-800 print-hidden">
                <div className="max-w-4xl mx-auto px-4 h-16 flex justify-between items-center">
                    <button onClick={handleBackClick} className="flex items-center gap-2 text-gray-400 hover:text-teal-400 transition-colors font-medium text-sm sm:text-base group">
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        Back {origin === 'settings' ? 'to Settings' : ''}
                    </button>
                    <button onClick={handlePrint} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-800 text-gray-300 rounded-lg hover:bg-gray-800 shadow-lg transition-all text-sm">
                        <Printer size={18} /> Print Policy
                    </button>
                </div>
            </nav>

            <div className="w-full max-w-4xl px-4 py-8 print-container">
                <div className="bg-gray-900 rounded-2xl shadow-2xl shadow-teal-900/10 overflow-hidden border border-gray-800 dark-card">
                    
                    {/* Hero Header Section */}
                    <div className="bg-gradient-to-br from-teal-700 to-teal-900 p-8 text-center text-white relative overflow-hidden">
                        <div className="absolute -top-4 -right-4 p-4 opacity-10 rotate-12"><ShieldCheck size={100} /></div>
                        <div className="relative z-10">
                            <div className="flex justify-center mb-4">
                                <div className="bg-white/10 p-3 rounded-full backdrop-blur-md border border-white/20">
                                    <Lock className="w-8 h-8 text-teal-300" />
                                </div>
                            </div>
                            <h1 className="text-3xl font-extrabold tracking-tight" itemProp="headline">Privacy Policy</h1>
                            <p className="mt-2 text-teal-100 font-medium" itemProp="description">Your Data Security is Our Top Priority</p>
                            <p className="mt-2 text-teal-200/60 text-[10px] uppercase tracking-widest font-bold">Effective Date: 29/12/2025</p>
                        </div>
                    </div>

                    {/* Content Body */}
                    <div className="p-6 md:p-12 text-gray-300 leading-relaxed space-y-12">
                        <section className="text-center max-w-2xl mx-auto">
                            <p className="text-base sm:text-lg text-gray-400">
                                At Pocket POS, we understand that your business data is sensitive. This policy explains how 
                                <span className="font-bold text-white mx-1"> Jaivin JV </span> 
                                collects, protects, and handles your information.
                            </p>
                        </section>

                        <div className="space-y-12">
                            {/* 1. Information Collection */}
                            <section>
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="bg-teal-900/30 p-2.5 rounded-xl text-teal-400 border border-teal-800/50">
                                        <Smartphone size={22} />
                                    </div>
                                    <h2 className="text-xl font-bold text-white">1. Information We Collect</h2>
                                </div>
                                <div className="pl-2 sm:pl-14 space-y-4">
                                    <p className="text-sm text-gray-400">To provide our services, we collect:</p>
                                    <ul className="space-y-3">
                                        {[
                                            { label: "Business Profile", desc: "Name, phone number, and address." },
                                            { label: "Operational Data", desc: "Inventory items, sales records, and Digital Khata entries." },
                                            { label: "Customer Data", desc: "Phone numbers of your customers (only if you use Khata features)." }
                                        ].map((item, i) => (
                                            <li key={i} className="flex gap-3 text-sm">
                                                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-teal-500 flex-shrink-0" />
                                                <p><span className="text-white font-semibold">{item.label}:</span> {item.desc}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </section>

                            {/* 2. Usage */}
                            <section>
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="bg-teal-900/30 p-2.5 rounded-xl text-teal-400 border border-teal-800/50">
                                        <Server size={22} />
                                    </div>
                                    <h2 className="text-xl font-bold text-white">2. How We Use Your Data</h2>
                                </div>
                                <div className="pl-2 sm:pl-14 space-y-4">
                                    <p className="text-sm text-gray-400">Your data is used strictly for:</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {[
                                            "Cloud synchronization across devices.",
                                            "Generating business analytics.",
                                            "Automated SMS/WhatsApp reminders.",
                                            "Technical support & troubleshooting."
                                        ].map((text, i) => (
                                            <div key={i} className="bg-gray-950 p-3 rounded-lg border border-gray-800 text-xs text-gray-400">
                                                {text}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            {/* 3. Protection */}
                            <section>
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="bg-teal-900/30 p-2.5 rounded-xl text-teal-400 border border-teal-800/50">
                                        <EyeOff size={22} />
                                    </div>
                                    <h2 className="text-xl font-bold text-white">3. Data Sharing & Security</h2>
                                </div>
                                <div className="pl-2 sm:pl-14 space-y-5">
                                    <div className="bg-teal-900/20 border-l-4 border-teal-500 p-5 rounded-r-xl accent-box">
                                        <p className="font-bold text-teal-400 mb-1">The "No-Sell" Promise:</p>
                                        <p className="text-teal-100/70 text-sm">We do not sell, trade, or rent your business or customer data to third-party marketing companies. Ever.</p>
                                    </div>
                                    <p className="text-sm text-gray-400">All data is transmitted via secure encrypted protocols (SSL/TLS) and stored on protected cloud servers.</p>
                                </div>
                            </section>

                            {/* 4. Rights */}
                            <section>
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="bg-teal-900/30 p-2.5 rounded-xl text-teal-400 border border-teal-800/50">
                                        <ShieldCheck size={22} />
                                    </div>
                                    <h2 className="text-xl font-bold text-white">4. Your Rights</h2>
                                </div>
                                <div className="pl-2 sm:pl-14">
                                    <p className="text-sm text-gray-400 leading-relaxed">
                                        You have the right to access, export, or delete your business data at any time through the application settings. 
                                        Upon account deletion, all associated records are permanently removed from our active databases.
                                    </p>
                                </div>
                            </section>
                        </div>

                        {/* Footer Contact */}
                        <div className="mt-16 pt-8 border-t border-gray-800 grid grid-cols-1 md:grid-cols-2 gap-8 bg-gray-950 p-8 rounded-2xl">
                            <div>
                                <h3 className="font-bold text-teal-500 mb-3 uppercase text-[10px] tracking-widest">Privacy Officer</h3>
                                <p className="text-sm font-bold text-white">Jaivin JV</p>
                                <p className="text-sm text-gray-500">pocketpos.official@gmail.com</p>
                            </div>
                            <div>
                                <h3 className="font-bold text-teal-500 mb-3 uppercase text-[10px] tracking-widest">Data Protection Office</h3>
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    Madathara, Trivandrum<br />
                                    Kerala, India - 691541
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center text-gray-600 text-[10px] pb-12 print:hidden uppercase tracking-[0.2em]">
                    &copy; {new Date().getFullYear()} Pocket POS &bull; Secure & Reliable Billing
                </div>
            </div>
        </article>
        </>
    );
};

export default PrivacyPolicy;