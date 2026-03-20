import React, { useEffect } from 'react';
import { Printer, ShieldCheck, ArrowLeft, CreditCard, Scale, MessageSquare, UserCheck } from 'lucide-react';

const TermsAndConditions = ({ onBack, origin, darkMode = true }) => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const handlePrint = () => window.print();
    const handleBackClick = () => onBack(origin === 'settings' ? 'settings' : 'dashboard');

    const bgPage = darkMode ? 'bg-gray-950' : 'bg-slate-50';
    const textPrimary = darkMode ? 'text-white' : 'text-slate-900';
    const textMuted = darkMode ? 'text-gray-400' : 'text-slate-600';
    const textDim = darkMode ? 'text-gray-500' : 'text-slate-500';
    const cardBg = darkMode ? 'bg-gray-900' : 'bg-white';
    const borderCl = darkMode ? 'border-gray-800' : 'border-slate-200';
    const navBg = darkMode ? 'bg-gray-950/80' : 'bg-white/80';
    const navBtnBg = darkMode ? 'bg-gray-900' : 'bg-slate-100';
    const navBtnBorder = darkMode ? 'border-gray-800' : 'border-slate-300';
    const navBtnText = darkMode ? 'text-gray-300' : 'text-slate-700';
    const navBtnHover = darkMode ? 'hover:bg-gray-800' : 'hover:bg-slate-200';
    const backHover = darkMode ? 'text-gray-400 hover:text-indigo-400' : 'text-slate-600 hover:text-indigo-600';

    // Structured Data for Terms and Conditions
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "Terms and Conditions - Pocket POS",
        "description": "Terms and Conditions for Pocket POS retail management software. Service agreement and legal terms for using Pocket POS.",
        "url": "https://yourdomain.com/terms"
    };

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
            <article className={`min-h-screen flex flex-col items-center font-sans transition-colors duration-300 ${bgPage} ${textPrimary}`} itemScope itemType="https://schema.org/WebPage">
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
            <nav className={`sticky top-0 w-full z-40 backdrop-blur-md border-b print-hidden transition-colors duration-300 ${navBg} ${borderCl}`}>
                <div className="max-w-4xl mx-auto px-4 h-16 flex justify-between items-center">
                    <button onClick={handleBackClick} className={`flex items-center gap-2 transition-colors font-medium text-sm sm:text-base group ${backHover}`}>
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        Back {origin === 'settings' ? 'to Settings' : ''}
                    </button>
                    <button onClick={handlePrint} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg transition-all text-sm ${navBtnBg} border ${navBtnBorder} ${navBtnText} ${navBtnHover}`}>
                        <Printer size={18} /> Print Terms
                    </button>
                </div>
            </nav>

            <div className="w-full max-w-4xl px-4 py-8 print-container">
                <div className={`rounded-2xl shadow-2xl overflow-hidden border dark-card transition-colors duration-300 ${cardBg} ${borderCl} ${darkMode ? 'shadow-indigo-900/10' : 'shadow-slate-200'}`}>
                    
                    {/* Hero Header Section */}
                    <div className="bg-gradient-to-br from-indigo-700 to-indigo-950 p-8 text-center text-white relative overflow-hidden">
                        <div className="absolute -top-4 -right-4 p-4 opacity-10 rotate-12"><Scale size={100} /></div>
                        <div className="relative z-10">
                            <div className="flex justify-center mb-4">
                                <div className="bg-white/10 p-3 rounded-full backdrop-blur-md border border-white/20">
                                    <ShieldCheck className="w-8 h-8 text-indigo-300" />
                                </div>
                            </div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-white" itemProp="headline">Terms and Conditions</h1>
                            <p className="mt-2 text-indigo-100 font-medium" itemProp="description">Pocket POS Service Agreement</p>
                            <p className="mt-2 text-indigo-200/60 text-[10px] uppercase tracking-widest font-bold">Effective Date: 29/12/2025</p>
                        </div>
                    </div>

                    {/* Content Body */}
                    <div className={`p-6 md:p-12 leading-relaxed space-y-12 transition-colors duration-300 ${textMuted}`}>
                        <section className="text-center max-w-2xl mx-auto">
                            <p className={`text-base sm:text-lg ${textMuted}`}>
                                These Terms and Conditions govern your use of the Pocket POS application provided by PocketPos. By registering for an account, you agree to these legally binding terms.
                            </p>
                        </section>

                        <div className="space-y-12">
                            {/* Section 1 */}
                            <section>
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="bg-indigo-900/30 p-2.5 rounded-xl text-indigo-400 border border-indigo-800/50">
                                        <UserCheck size={22} />
                                    </div>
                                    <h2 className={`text-xl font-bold ${textPrimary}`}>1. Account Registration</h2>
                                </div>
                                <div className="pl-2 sm:pl-14 space-y-3">
                                    <p className={`text-sm ${textMuted}`}>To use Pocket POS, you must provide accurate information, including a valid phone number and business name.</p>
                                    <p className={`text-sm font-medium ${textMuted}`}>You are solely responsible for maintaining the confidentiality of your credentials.</p>
                                </div>
                            </section>

                            {/* Section 2 */}
                            <section>
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="bg-indigo-900/30 p-2.5 rounded-xl text-indigo-400 border border-indigo-800/50">
                                        <CreditCard size={22} />
                                    </div>
                                    <h2 className={`text-xl font-bold ${textPrimary}`}>2. Subscription & Payments</h2>
                                </div>
                                <div className="pl-2 sm:pl-14 space-y-4">
                                    <p className={`text-sm ${textMuted}`}>Fees are based on selected tiers (Basic, Pro, Premium) per month plus applicable taxes.</p>
                                    <div className="bg-amber-900/20 border-l-4 border-amber-500 p-5 rounded-r-xl accent-box">
                                        <p className="font-bold text-amber-400 mb-1">Trial Period:</p>
                                        <p className="text-amber-100/70 text-sm">Any free trial offered is for 30 days. Access may be restricted unless a payment method is added after the trial.</p>
                                    </div>
                                </div>
                            </section>

                            {/* Section 3 */}
                            <section>
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="bg-indigo-900/30 p-2.5 rounded-xl text-indigo-400 border border-indigo-800/50">
                                        <Scale size={22} />
                                    </div>
                                    <h2 className={`text-xl font-bold ${textPrimary}`}>3. Use of Service & Data</h2>
                                </div>
                                <div className="pl-2 sm:pl-14 space-y-3">
                                    <p className={`text-sm ${textMuted}`}>We grant you a revocable license for business use. Illegal activities like fraudulent accounting are strictly prohibited.</p>
                                    <p className={`text-sm ${textMuted}`}><span className={`font-semibold ${textPrimary}`}>Digital Khata:</span> You own your data. Pocket POS is a digital ledger; we are not liable for physical cash discrepancies in your shop.</p>
                                </div>
                            </section>

                            {/* Section 4 */}
                            <section>
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="bg-indigo-900/30 p-2.5 rounded-xl text-indigo-400 border border-indigo-800/50">
                                        <MessageSquare size={22} />
                                    </div>
                                    <h2 className={`text-xl font-bold ${textPrimary}`}>4. SMS & Communication</h2>
                                </div>
                                <div className="pl-2 sm:pl-14">
                                    <p className={`text-sm ${textMuted}`}>By enabling Khata reminders, you authorize us to send automated SMS to your customers. You must ensure you have legal consent from your customers to receive these messages.</p>
                                </div>
                            </section>

                            {/* Section 5 */}
                            <section>
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="bg-indigo-900/30 p-2.5 rounded-xl text-indigo-400 border border-indigo-800/50">
                                        <Scale size={22} />
                                    </div>
                                    <h2 className={`text-xl font-bold ${textPrimary}`}>5. Governing Law</h2>
                                </div>
                                <div className="pl-2 sm:pl-14">
                                    <p className={`text-sm ${textMuted}`}>Governed by the laws of <span className={textPrimary}>Kerala, India</span>. Exclusive jurisdiction is granted to the courts in <span className={`font-semibold ${textPrimary} ${darkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>Trivandrum, Kerala</span>.</p>
                                </div>
                            </section>
                        </div>

                        {/* Footer Contact */}
                        <div className={`mt-16 pt-8 border-t grid grid-cols-1 md:grid-cols-2 gap-8 p-8 rounded-2xl ${borderCl} ${darkMode ? 'bg-gray-950' : 'bg-slate-100'}`}>
                            <div>
                                <h3 className="font-bold text-indigo-500 mb-3 uppercase text-[10px] tracking-widest">Support Contact</h3>
                                <p className={`text-sm ${textPrimary}`}>hello@pocketpos.io</p>
                                <p className={`text-sm ${textDim}`}>+91 9074607140</p>
                            </div>
                            <div>
                                <h3 className="font-bold text-indigo-500 mb-3 uppercase text-[10px] tracking-widest">Registered Address</h3>
                                <p className={`text-sm leading-relaxed ${textMuted}`}>
                                    Block no 181, Venkolla PO<br />
                                    Madathara, Kerala, India - 691541
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`mt-8 text-center text-[10px] pb-12 print:hidden uppercase tracking-[0.2em] ${darkMode ? 'text-gray-600' : 'text-slate-500'}`}>
                    &copy; {new Date().getFullYear()} Pocket POS &bull; Built for Small Businesses
                </div>
            </div>
        </article>
        </>
    );
};

export default TermsAndConditions;