import React, { useEffect } from 'react';
import { Printer, Gift, ArrowLeft, Users, Zap, Wallet, ChevronRight, Award } from 'lucide-react';

const AffiliatePage = ({ onBack }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const steps = [
    {
      icon: <Users className="w-6 h-6 text-indigo-600" />,
      title: "Join the Program",
      desc: "Apply to become a partner. Once approved, you'll get a unique referral link."
    },
    {
      icon: <Zap className="w-6 h-6 text-indigo-600" />,
      title: "Spread the Word",
      desc: "Share Pocket POS with other shop owners, friends, or your business community."
    },
    {
      icon: <Wallet className="w-6 h-6 text-indigo-600" />,
      title: "Earn Commissions",
      desc: "Get a percentage of every subscription paid by the users you referred."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      {/* Print styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .print-hidden { display: none !important; }
          .print-container { box-shadow: none !important; border: none !important; width: 100% !important; }
        }
      `}} />

      <div className="w-full max-w-4xl print-container">
        {/* Navigation */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors font-medium">
            <ArrowLeft size={20} /> Back to App
          </button>
          <button onClick={handlePrint} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 shadow-sm transition-all">
            <Printer size={18} /> Print Details
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
          {/* Hero Section */}
          <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 p-10 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Gift size={120} />
            </div>
            <div className="relative z-10">
              <div className="flex justify-center mb-4">
                <div className="bg-white/10 p-3 rounded-full backdrop-blur-md border border-white/20">
                  <Award className="w-10 h-10 text-yellow-400" />
                </div>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">Pocket POS Partners</h1>
              <p className="mt-2 text-indigo-100 font-medium text-lg">Earn while you help other businesses grow.</p>
            </div>
          </div>

          <div className="p-8 md:p-12 space-y-12">
            {/* Value Proposition */}
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Why join our Affiliate Program?</h2>
              <p className="text-gray-600 leading-relaxed">
                Join our mission to digitize every shop in India. When you refer a business to Pocket POS, 
                you aren't just earning a commission—you're helping a fellow entrepreneur succeed with modern tools.
              </p>
            </div>

            {/* How it Works Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {steps.map((step, idx) => (
                <div key={idx} className="relative group p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-indigo-50 hover:border-indigo-200 transition-all">
                  <div className="mb-4 bg-white w-12 h-12 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    {step.icon}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>

            {/* Commission Table Placeholder */}
            <div className="bg-gray-900 rounded-2xl p-8 text-white">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                  <h3 className="text-xl font-bold mb-2">Earn up to 20% Commission</h3>
                  <p className="text-gray-400 text-sm italic">On every successful monthly subscription payment.</p>
                </div>
                <a 
                  href="mailto:pocketpos.official@gmail.com?subject=Affiliate Program Application" 
                  className="bg-indigo-500 hover:bg-indigo-400 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 group"
                >
                  Apply Now <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>

            {/* Program Details */}
            <section className="border-t border-gray-100 pt-10">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                Program Guidelines
              </h3>
              <ul className="space-y-4">
                {[
                  "Monthly payouts directly to your bank account via UPI/NEFT.",
                  "Minimum payout threshold is ₹1,000.",
                  "Dedicated dashboard to track your referrals and earnings.",
                  "Marketing materials (posters/videos) provided in English and Malayalam."
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                    <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      ✓
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        <div className="mt-8 text-center text-gray-400 text-xs pb-12 print:hidden">
          &copy; {new Date().getFullYear()} Pocket POS &bull; Growing Together
        </div>
      </div>
    </div>
  );
};

export default AffiliatePage;