import React, { useEffect } from 'react';
import { Printer, Gift, ArrowLeft, Users, Zap, Wallet, ChevronRight, Award } from 'lucide-react';

const AffiliatePage = ({ onBack, origin }) => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const handlePrint = () => {
        window.print();
    };

    const handleBackClick = () => {
        onBack(origin === 'settings' ? 'settings' : 'dashboard');
    };

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

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center text-white font-sans">
            <style dangerouslySetInnerHTML={{
                __html: `
        @media print {
          .print-hidden { display: none !important; }
          .print-container { background: white !important; color: black !important; box-shadow: none !important; border: none !important; width: 100% !important; margin: 0 !important; }
          .dark-card { background: white !important; border: 1px solid #eee !important; color: black !important; }
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
                        <Printer size={18} /> Print Details
                    </button>
                </div>
            </nav>

            <div className="w-full max-w-4xl px-4 py-8 print-container">
                <div className="bg-gray-900 rounded-2xl shadow-2xl shadow-indigo-900/20 overflow-hidden border border-gray-800 dark-card">

                    {/* Hero Section */}
                    <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 p-8 text-center text-white relative overflow-hidden">
                        <div className="absolute -top-4 -right-4 p-4 opacity-10 rotate-12"><Gift size={100} /></div>
                        <div className="relative z-10">
                            <div className="flex justify-center mb-4">
                                <div className="bg-white/10 p-3 rounded-full backdrop-blur-md border border-white/20">
                                    <Award className="w-8 h-8 text-yellow-400" />
                                </div>
                            </div>
                            <h1 className="text-3xl font-extrabold tracking-tight">Pocket POS Partners</h1>
                            <p className="mt-2 text-indigo-100 font-medium">Earn while you help other businesses grow.</p>
                        </div>
                    </div>

                    <div className="p-6 md:p-10 space-y-10">
                        {/* Compact Grid Layout */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {steps.map((step, idx) => (
                                <div key={idx} className="flex items-start gap-4 p-5 rounded-xl bg-gray-950 border border-gray-800 hover:border-indigo-500/30 transition-all group">
                                    <div className="flex-shrink-0 bg-gray-900 p-3 rounded-lg border border-gray-800 shadow-inner group-hover:bg-gray-800 transition-colors">
                                        {step.icon}
                                    </div>
                                    <div className="flex-grow">
                                        <h3 className="font-bold text-white text-sm sm:text-base mb-1">{step.title}</h3>
                                        <p className="text-xs text-gray-500 leading-relaxed leading-snug">{step.desc}</p>
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
                                    href={`mailto:pocketpos.official@gmail.com?subject=Affiliate Program Application`}
                                    className="w-full md:w-auto bg-white text-indigo-700 hover:bg-indigo-50 px-6 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 group text-sm"
                                >
                                    Apply Now <ChevronRight className="group-hover:translate-x-1 transition-transform" size={16} />
                                </a>
                            </div>
                        </div>

                        {/* Guidelines Section */}
                        <section className="bg-gray-950 rounded-xl p-6 border border-gray-800">
                            <h3 className="text-sm font-bold text-teal-400 uppercase tracking-widest mb-6">Program Guidelines</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                                {[
                                    "Monthly payouts via UPI/NEFT.",
                                    "Minimum payout: ₹1,000.",
                                    "Dedicated referral dashboard.",
                                    "Free marketing resources."
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 text-xs text-gray-400">
                                        <div className="w-5 h-5 rounded-full bg-teal-900/20 text-teal-400 flex items-center justify-center flex-shrink-0 border border-teal-900/50">✓</div>
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </section>

                        <div className="pt-8 border-t border-gray-800 text-center">
                            <h3 className="font-bold text-gray-500 mb-2 uppercase text-[10px] tracking-[0.2em]">Registered Office</h3>
                            <p className="text-xs text-gray-500 leading-relaxed font-medium">
                                Jaivin JV, Block no 181, Venkolla PO<br />
                                Madathara, Trivandrum, Kerala, India - 691541
                            </p>
                        </div>
                    </div>
                </div>
                <div className="mt-8 text-center text-gray-600 text-[10px] pb-12">
                    &copy; {new Date().getFullYear()} Pocket POS &bull; Growing Together
                </div>
            </div>
        </div>
    );
};

export default AffiliatePage;