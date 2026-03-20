import React, { useEffect } from 'react';
import { Printer, Gift, ArrowLeft, Users, Zap, Wallet, ChevronRight, Award } from 'lucide-react';

const AffiliatePage = ({ onBack, origin, darkMode = true }) => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const handlePrint = () => window.print();
    const handleBackClick = () => onBack(origin === 'settings' ? 'settings' : 'dashboard');

    const bgPage = darkMode ? 'bg-gray-950' : 'bg-slate-50';
    const textPrimary = darkMode ? 'text-white' : 'text-slate-900';
    const textMuted = darkMode ? 'text-gray-500' : 'text-slate-600';
    const textDim = darkMode ? 'text-gray-500' : 'text-slate-500';
    const cardBg = darkMode ? 'bg-gray-900' : 'bg-white';
    const borderCl = darkMode ? 'border-gray-800' : 'border-slate-200';
    const navBg = darkMode ? 'bg-gray-950/80' : 'bg-white/80';
    const stepCardBg = darkMode ? 'bg-gray-950' : 'bg-slate-50';
    const guidelinesBg = darkMode ? 'bg-gray-950' : 'bg-slate-50';
    const navBtnBg = darkMode ? 'bg-gray-900' : 'bg-slate-100';
    const navBtnBorder = darkMode ? 'border-gray-800' : 'border-slate-300';
    const navBtnText = darkMode ? 'text-gray-300' : 'text-slate-700';
    const backHover = darkMode ? 'text-gray-400 hover:text-indigo-400' : 'text-slate-600 hover:text-indigo-600';

    const steps = [
        {
            icon: <Users className="w-6 h-6 text-indigo-400" />,
            title: "Join the Program",
            desc: "Apply to become a partner. Get approved and receive your unique link."
        },
        {
            icon: <Zap className="w-6 h-6 text-teal-400" />,
            title: "Spread the Word",
            desc: "Share Pocket POS with shop owners and your business community."
        },
        {
            icon: <Wallet className="w-6 h-6 text-indigo-400" />,
            title: "Earn Commissions",
            desc: "Get a percentage of every subscription paid by your referrals."
        }
    ];

    // Structured Data for Affiliate Page
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "Affiliate Program - Pocket POS",
        "description": "Join the Pocket POS affiliate program and earn commissions by referring retail businesses to our platform.",
        "url": "https://yourdomain.com/affiliate"
    };

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
            <article className={`min-h-screen flex flex-col items-center font-sans transition-colors duration-300 ${bgPage} ${textPrimary}`} itemScope itemType="https://schema.org/WebPage">
            <style dangerouslySetInnerHTML={{
                __html: `
        @media print {
          .print-hidden { display: none !important; }
          .print-container { background: white !important; color: black !important; box-shadow: none !important; border: none !important; width: 100% !important; margin: 0 !important; }
          .dark-card { background: white !important; border: 1px solid #eee !important; color: black !important; }
        }
      `}} />

            {/* Sticky Navigation */}
            <nav className={`sticky top-0 w-full z-40 backdrop-blur-md border-b print-hidden transition-colors duration-300 ${navBg} ${borderCl}`}>
                <div className="max-w-4xl mx-auto px-4 h-16 flex justify-between items-center">
                    <button onClick={handleBackClick} className={`flex items-center gap-2 transition-colors font-medium text-sm sm:text-base group ${backHover}`}>
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> 
                        Back {origin === 'settings' ? 'to Settings' : ''}
                    </button>
                    <button onClick={handlePrint} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg transition-all text-sm ${navBtnBg} border ${navBtnBorder} ${navBtnText} ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-slate-200'}`}>
                        <Printer size={18} /> Print Details
                    </button>
                </div>
            </nav>

            <div className="w-full max-w-4xl px-4 py-8 print-container">
                <div className={`rounded-2xl shadow-2xl overflow-hidden border dark-card transition-colors duration-300 ${cardBg} ${borderCl} ${darkMode ? 'shadow-indigo-900/20' : 'shadow-slate-200'}`}>

                    {/* Hero Section */}
                    <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 p-8 text-center text-white relative overflow-hidden">
                        <div className="absolute -top-4 -right-4 p-4 opacity-10 rotate-12"><Gift size={100} /></div>
                        <div className="relative z-10">
                            <div className="flex justify-center mb-4">
                                <div className="bg-white/10 p-3 rounded-full backdrop-blur-md border border-white/20">
                                    <Award className="w-8 h-8 text-yellow-400" />
                                </div>
                            </div>
                            <h1 className="text-3xl font-extrabold tracking-tight" itemProp="headline">Pocket POS Partners</h1>
                            <p className="mt-2 text-indigo-100 font-medium" itemProp="description">Earn while you help other businesses grow.</p>
                        </div>
                    </div>

                    <div className="p-6 md:p-10 space-y-10">
                        {/* Compact Grid Layout */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {steps.map((step, idx) => (
                                <div key={idx} className={`flex items-start gap-4 p-5 rounded-xl border hover:border-indigo-500/30 transition-all group ${stepCardBg} ${borderCl}`}>
                                    <div className={`flex-shrink-0 p-3 rounded-lg border shadow-inner transition-colors ${darkMode ? 'bg-gray-900 border-gray-800 group-hover:bg-gray-800' : 'bg-white border-slate-200 group-hover:bg-slate-100'}`}>
                                        {step.icon}
                                    </div>
                                    <div className="flex-grow">
                                        <h3 className={`font-bold text-sm sm:text-base mb-1 ${textPrimary}`}>{step.title}</h3>
                                        <p className={`text-xs leading-relaxed leading-snug ${textDim}`}>{step.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Commission Box */}
                        <div className="bg-indigo-600 rounded-xl p-6 sm:p-8 text-white relative overflow-hidden group">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10 text-center md:text-left">
                                <div>
                                    <h3 className="text-xl font-bold mb-1">Earn 20% Commission</h3>
                                    <p className="text-indigo-100 text-xs sm:text-sm">Paid monthly for every active subscription.</p>
                                </div>
                                <a
                                    href={`mailto:hello@pocketpos.io?subject=Affiliate Program Application`}
                                    className="w-full md:w-auto bg-white text-indigo-700 hover:bg-indigo-50 px-6 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 group text-sm"
                                >
                                    Apply Now <ChevronRight className="group-hover:translate-x-1 transition-transform" size={16} />
                                </a>
                            </div>
                        </div>

                        {/* Guidelines Section */}
                        <section className={`rounded-xl p-6 border ${guidelinesBg} ${borderCl}`}>
                            <h3 className="text-sm font-bold text-teal-400 uppercase tracking-widest mb-6">Program Guidelines</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                                {[
                                    "Monthly payouts via UPI/NEFT.",
                                    "Minimum payout: ₹1,000.",
                                    "Dedicated referral dashboard.",
                                    "Free marketing resources."
                                ].map((item, i) => (
                                    <div key={i} className={`flex items-center gap-3 text-xs ${textMuted}`}>
                                        <div className="w-5 h-5 rounded-full bg-teal-900/20 text-teal-400 flex items-center justify-center flex-shrink-0 border border-teal-900/50">✓</div>
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </section>

                        <div className={`pt-8 border-t text-center ${borderCl}`}>
                            <h3 className={`font-bold mb-2 uppercase text-[10px] tracking-[0.2em] ${textDim}`}>Registered Office</h3>
                            <p className={`text-xs leading-relaxed font-medium ${textDim}`}>
                                PocketPos, Block no 181, Venkolla PO<br />
                                Madathara, Trivandrum, Kerala, India - 691541
                            </p>
                        </div>
                    </div>
                </div>
                <div className={`mt-8 text-center text-[10px] pb-12 ${darkMode ? 'text-gray-600' : 'text-slate-500'}`}>
                    &copy; {new Date().getFullYear()} Pocket POS &bull; Growing Together
                </div>
            </div>
        </article>
        </>
    );
};

export default AffiliatePage;