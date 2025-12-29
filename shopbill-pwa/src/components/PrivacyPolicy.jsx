import React, { useEffect } from 'react';
import { Printer, Lock, ArrowLeft, EyeOff, Server, Smartphone, ShieldCheck } from 'lucide-react';

const PrivacyPolicy = ({ onBack }) => {
  // Ensure the page starts at the top when opened
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      {/* Styles for print and layout */}
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
        {/* Navigation / Actions */}
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

        {/* Main Document Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
          {/* Header Section */}
          <div className="bg-teal-50 p-8 border-b border-teal-100 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-white p-3 rounded-full shadow-sm text-teal-600">
                <Lock className="w-10 h-10" />
              </div>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900">Privacy Policy</h1>
            <p className="mt-2 text-teal-600 font-medium tracking-wide uppercase text-sm">Your Data Security is Our Priority</p>
            <p className="mt-1 text-gray-500 text-xs italic">Effective Date: 29/12/2025</p>
          </div>

          {/* Content Body */}
          <div className="p-8 md:p-12 text-gray-700 leading-relaxed space-y-10">
            <section className="text-center max-w-2xl mx-auto">
              <p className="text-lg">
                At Pocket POS, we understand that your business data is sensitive. This policy explains how 
                <span className="font-bold text-gray-900 mx-1"> Jaivin JV </span> 
                collects, protects, and handles your information.
              </p>
            </section>

            <div className="space-y-10">
              {/* Data Collection */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-teal-100 p-2 rounded-lg text-teal-700">
                    <Smartphone size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">1. Information We Collect</h2>
                </div>
                <div className="pl-12 space-y-3">
                  <p>To provide our services, we collect:</p>
                  <ul className="list-disc space-y-2 ml-4">
                    <li><strong>Business Profile:</strong> Name, phone number, and address.</li>
                    <li><strong>Operational Data:</strong> Inventory items, sales records, and Digital Khata entries.</li>
                    <li><strong>Customer Data:</strong> Phone numbers of your customers (only if you use the Khata/Reminder feature).</li>
                  </ul>
                </div>
              </section>

              {/* Data Usage */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-teal-100 p-2 rounded-lg text-teal-700">
                    <Server size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">2. How We Use Your Data</h2>
                </div>
                <div className="pl-12 space-y-3">
                  <p>Your data is used strictly for:</p>
                  <ul className="list-disc space-y-2 ml-4">
                    <li>Cloud synchronization across your devices.</li>
                    <li>Generating business reports and analytics.</li>
                    <li>Sending automated SMS reminders to your Khata customers at your request.</li>
                    <li>Technical support and troubleshooting.</li>
                  </ul>
                </div>
              </section>

              {/* Data Protection */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-teal-100 p-2 rounded-lg text-teal-700">
                    <EyeOff size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">3. Data Sharing & Security</h2>
                </div>
                <div className="pl-12 space-y-4">
                  <div className="bg-teal-50 border-l-4 border-teal-500 p-4 rounded-r-lg">
                    <p className="font-bold text-teal-900">The "No-Sell" Promise:</p>
                    <p className="text-teal-800 text-sm italic">We do not sell, trade, or rent your business or customer data to third-party marketing companies.</p>
                  </div>
                  <p>All data is transmitted via secure encrypted protocols and stored on protected cloud servers.</p>
                </div>
              </section>

              {/* User Rights */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-teal-100 p-2 rounded-lg text-teal-700">
                    <ShieldCheck size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">4. Your Rights</h2>
                </div>
                <div className="pl-12">
                  <p>You have the right to access, export, or delete your business data at any time through the application settings. Upon account deletion, all associated records are permanently removed from our active databases.</p>
                </div>
              </section>
            </div>

            {/* Footer Contact */}
            <div className="mt-16 pt-8 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-8 bg-gray-50 p-6 rounded-xl">
              <div>
                <h3 className="font-bold text-gray-900 mb-2 uppercase text-xs tracking-widest">Privacy Officer</h3>
                <p className="text-sm italic font-medium">Jaivin JV</p>
                <p className="text-sm">pocketpos.official@gmail.com</p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2 uppercase text-xs tracking-widest">Data Protection Office</h3>
                <p className="text-sm leading-relaxed">
                  Madathara, Trivandrum<br />
                  Kerala, India
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-gray-400 text-xs pb-12 print:hidden">
          &copy; {new Date().getFullYear()} Pocket POS &bull; Secure & Reliable Billing
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;