import React, { useEffect } from 'react';
import { Printer, ShieldCheck, ArrowLeft, CreditCard, Scale, MessageSquare, UserCheck } from 'lucide-react';

const TermsAndConditions = ({ onBack, origin }) => {
    // Ensure the page starts at the top when opened
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const handlePrint = () => {
        window.print();
    };

    const handleBackClick = () => {
        // Navigates back based on the origin state established in App.jsx
        onBack(origin === 'settings' ? 'settings' : 'dashboard');
    };

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center text-white font-sans">
            {/* Styles for print and layout */}
            <style dangerouslySetInnerHTML={{
                __html: `
        @media print {
          .print-hidden { display: none !important; }
          .print-container { background: white !important; color: black !important; box-shadow: none !important; border: none !important; width: 100% !important; margin: 0 !important; }
          .dark-card { background: white !important; border: 1px solid #eee !important; color: black !important; }
          .accent-box { background: #fffbeb !important; border-color: #f59e0b !important; color: #92400e !important; }
          @page { margin: 1.5cm; }
        }
      `}} />

            {/* Sticky Navigation */}
            <nav className="sticky top-0 w-full z-40 bg-gray-950/80 backdrop-blur-md border-b border-gray-800 print-hidden">
                <div className="max-w-4xl mx-auto px-4 h-16 flex justify-between items-center">
                    <button onClick={handleBackClick} className="flex items-center gap-2 text-gray-400 hover:text-indigo-400 transition-colors font-medium text-sm sm:text-base group">
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        Back {origin === 'settings' ? 'to Settings' : ''}
                    </button>
                    <button onClick={handlePrint} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-800 text-gray-300 rounded-lg hover:bg-gray-800 shadow-lg transition-all text-sm">
                        <Printer size={18} /> Print Terms
                    </button>
                </div>
            </nav>

            <div className="w-full max-w-4xl px-4 py-8 print-container">
                <div className="bg-gray-900 rounded-2xl shadow-2xl shadow-indigo-900/10 overflow-hidden border border-gray-800 dark-card">
                    
                    {/* Hero Header Section */}
                    <div className="bg-gradient-to-br from-indigo-700 to-indigo-950 p-8 text-center text-white relative overflow-hidden">
                        <div className="absolute -top-4 -right-4 p-4 opacity-10 rotate-12"><Scale size={100} /></div>
                        <div className="relative z-10">
                            <div className="flex justify-center mb-4">
                                <div className="bg-white/10 p-3 rounded-full backdrop-blur-md border border-white/20">
                                    <ShieldCheck className="w-8 h-8 text-indigo-300" />
                                </div>
                            </div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-white">Terms and Conditions</h1>
                            <p className="mt-2 text-indigo-100 font-medium">Pocket POS Service Agreement</p>
                            <p className="mt-2 text-indigo-200/60 text-[10px] uppercase tracking-widest font-bold">Effective Date: 29/12/2025</p>
                        </div>
                    </div>

                    {/* Content Body */}
                    <div className="p-6 md:p-12 text-gray-300 leading-relaxed space-y-12">
                        <section className="text-center max-w-2xl mx-auto">
                            <p className="text-base sm:text-lg text-gray-400">
                                These Terms and Conditions govern your use of the Pocket POS application provided by 
                                <span className="font-bold text-white mx-1 border-b border-indigo-500/50"> Jaivin JV </span>. 
                                By registering for an account, you agree to these legally binding terms.
                            </p>
                        </section>

                        <div className="space-y-12">
                            {/* Section 1 */}
                            <section>
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="bg-indigo-900/30 p-2.5 rounded-xl text-indigo-400 border border-indigo-800/50">
                                        <UserCheck size={22} />
                                    </div>
                                    <h2 className="text-xl font-bold text-white">1. Account Registration</h2>
                                </div>
                                <div className="pl-2 sm:pl-14 space-y-3">
                                    <p className="text-sm text-gray-400">To use Pocket POS, you must provide accurate information, including a valid phone number and business name.</p>
                                    <p className="text-sm text-gray-400 font-medium italic">You are solely responsible for maintaining the confidentiality of your credentials.</p>
                                </div>
                            </section>

                            {/* Section 2 */}
                            <section>
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="bg-indigo-900/30 p-2.5 rounded-xl text-indigo-400 border border-indigo-800/50">
                                        <CreditCard size={22} />
                                    </div>
                                    <h2 className="text-xl font-bold text-white">2. Subscription & Payments</h2>
                                </div>
                                <div className="pl-2 sm:pl-14 space-y-4">
                                    <p className="text-sm text-gray-400">Fees are based on selected tiers (Basic, Pro, Premium) per month plus applicable taxes.</p>
                                    <div className="bg-amber-900/20 border-l-4 border-amber-500 p-5 rounded-r-xl accent-box">
                                        <p className="font-bold text-amber-400 mb-1">Trial Period:</p>
                                        <p className="text-amber-100/70 text-sm italic">Any free trial offered is for 30 days. Access may be restricted unless a payment method is added after the trial.</p>
                                    </div>
                                </div>
                            </section>

                            {/* Section 3 */}
                            <section>
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="bg-indigo-900/30 p-2.5 rounded-xl text-indigo-400 border border-indigo-800/50">
                                        <Scale size={22} />
                                    </div>
                                    <h2 className="text-xl font-bold text-white">3. Use of Service & Data</h2>
                                </div>
                                <div className="pl-2 sm:pl-14 space-y-3">
                                    <p className="text-sm text-gray-400">We grant you a revocable license for business use. Illegal activities like fraudulent accounting are strictly prohibited.</p>
                                    <p className="text-sm text-gray-400"><span className="text-white font-semibold">Digital Khata:</span> You own your data. Pocket POS is a digital ledger; we are not liable for physical cash discrepancies in your shop.</p>
                                </div>
                            </section>

                            {/* Section 4 */}
                            <section>
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="bg-indigo-900/30 p-2.5 rounded-xl text-indigo-400 border border-indigo-800/50">
                                        <MessageSquare size={22} />
                                    </div>
                                    <h2 className="text-xl font-bold text-white">4. SMS & Communication</h2>
                                </div>
                                <div className="pl-2 sm:pl-14">
                                    <p className="text-sm text-gray-400">By enabling Khata reminders, you authorize us to send automated SMS to your customers. You must ensure you have legal consent from your customers to receive these messages.</p>
                                </div>
                            </section>

                            {/* Section 5 */}
                            <section>
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="bg-indigo-900/30 p-2.5 rounded-xl text-indigo-400 border border-indigo-800/50">
                                        <Scale size={22} />
                                    </div>
                                    <h2 className="text-xl font-bold text-white">5. Governing Law</h2>
                                </div>
                                <div className="pl-2 sm:pl-14">
                                    <p className="text-sm text-gray-400">Governed by the laws of <span className="text-white">Kerala, India</span>. Exclusive jurisdiction is granted to the courts in <span className="text-white font-semibold text-indigo-300">Trivandrum, Kerala</span>.</p>
                                </div>
                            </section>
                        </div>

                        {/* Footer Contact */}
                        <div className="mt-16 pt-8 border-t border-gray-800 grid grid-cols-1 md:grid-cols-2 gap-8 bg-gray-950 p-8 rounded-2xl">
                            <div>
                                <h3 className="font-bold text-indigo-500 mb-3 uppercase text-[10px] tracking-widest">Support Contact</h3>
                                <p className="text-sm text-white">pocketpos.official@gmail.com</p>
                                <p className="text-sm text-gray-500">+91 9074607140</p>
                            </div>
                            <div>
                                <h3 className="font-bold text-indigo-500 mb-3 uppercase text-[10px] tracking-widest">Registered Address</h3>
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    Block no 181, Venkolla PO<br />
                                    Madathara, Kerala, India - 691541
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center text-gray-600 text-[10px] pb-12 print:hidden uppercase tracking-[0.2em]">
                    &copy; {new Date().getFullYear()} Pocket POS &bull; Built for Small Businesses
                </div>
            </div>
        </div>
    );
};

export default TermsAndConditions;