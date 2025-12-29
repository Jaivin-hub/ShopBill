import React, { useEffect } from 'react'; // Added useEffect
import { Printer, ShieldCheck, ArrowLeft } from 'lucide-react';

const TermsAndConditions = ({ onBack }) => {
  // --- NEW: Scroll to top on mount ---
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          .print-hidden { display: none !important; }
          .print-container { 
            box-shadow: none !important; 
            border: none !important; 
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          @page { margin: 1.5cm; }
        }
      `}} />

      <div className="w-full max-w-4xl print-container">
        {/* Added print:hidden to the entire navigation block */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors font-medium"
          >
            <ArrowLeft size={20} />
            Back to App
          </button>
          
          <button 
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md transition-all active:scale-95"
          >
            <Printer size={18} />
            Print Document
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
          <div className="bg-indigo-50 p-8 border-b border-indigo-100 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-white p-3 rounded-full shadow-sm text-indigo-600">
                <ShieldCheck className="w-10 h-10" />
              </div>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900">Terms and Conditions</h1>
            <p className="mt-2 text-indigo-600 font-medium tracking-wide uppercase text-sm">Pocket POS Service Agreement</p>
            <p className="mt-1 text-gray-500 text-xs italic">Effective Date: 29/12/2025</p>
          </div>

          <div className="p-8 md:p-12 text-gray-700 leading-relaxed space-y-8">
            <p className="text-lg text-center max-w-2xl mx-auto">
              These Terms and Conditions govern your use of the Pocket POS application and services provided by 
              <span className="font-bold text-gray-900 border-b-2 border-indigo-200 mx-1"> Jaivin JV </span>. 
              By registering for an account, you agree to these legally binding terms.
            </p>

            <div className="space-y-10">
              <section>
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">1</span>
                  <h2 className="text-xl font-bold text-gray-900">Account Registration</h2>
                </div>
                <div className="pl-11 space-y-2">
                  <p>To use Pocket POS, you must provide accurate information, including a valid phone number and business name.</p>
                  <p>You are solely responsible for maintaining the confidentiality of your credentials and all actions taken under your account.</p>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">2</span>
                  <h2 className="text-xl font-bold text-gray-900">Subscription and Payments</h2>
                </div>
                <div className="pl-11 space-y-4">
                  <p>Fees are based on selected tiers (Basic: ₹499, Pro: ₹799, Premium: ₹999) per month plus applicable taxes.</p>
                  <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                    <p className="text-amber-800 text-sm">
                      <strong>Trial Period:</strong> Any free trial offered is for 30 days. Access may be restricted unless a payment method is added after the trial.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">3</span>
                  <h2 className="text-xl font-bold text-gray-900">Use of Service & Data</h2>
                </div>
                <div className="pl-11 space-y-3">
                  <p>We grant you a revocable license for business use. Illegal activities like fraudulent accounting are strictly prohibited.</p>
                  <p><strong>Digital Khata:</strong> You own your data. Pocket POS is a digital ledger tool; we are not liable for physical cash discrepancies in your shop.</p>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">4</span>
                  <h2 className="text-xl font-bold text-gray-900">SMS & Communication</h2>
                </div>
                <div className="pl-11">
                  <p>By enabling Khata reminders, you authorize us to send automated SMS to your customers. You must ensure you have legal consent from your customers to receive these messages.</p>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">5</span>
                  <h2 className="text-xl font-bold text-gray-900">Governing Law</h2>
                </div>
                <div className="pl-11">
                  <p>Governed by the laws of <strong>Kerala/India</strong>. Exclusive jurisdiction is granted to the courts in <strong>Trivandrum, Kerala</strong>.</p>
                </div>
              </section>
            </div>

            <div className="mt-16 pt-8 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-8 bg-gray-50 p-6 rounded-xl">
              <div>
                <h3 className="font-bold text-gray-900 mb-2 uppercase text-xs tracking-widest">Support Contact</h3>
                <p className="text-sm">Email: pocketpos.official@gmail.com</p>
                <p className="text-sm">Phone: +91 9074607140</p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2 uppercase text-xs tracking-widest">Registered Address</h3>
                <p className="text-sm leading-relaxed">
                  Block no 181, Venkolla PO<br />
                  Madathara, Kerala, India
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-gray-400 text-xs pb-12 print:hidden">
          &copy; {new Date().getFullYear()} Pocket POS &bull; Built for Small Businesses
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;