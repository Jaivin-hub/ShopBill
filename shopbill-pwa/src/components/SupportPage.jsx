import React, { useEffect } from 'react';
import { Printer, LifeBuoy, ArrowLeft, Mail, Phone, MessageCircle, Clock, ExternalLink } from 'lucide-react';

const SupportPage = ({ onBack, origin }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleBackClick = () => {
    onBack(origin === 'settings' ? 'settings' : 'dashboard');
  };

  const supportContacts = [
    {
      title: "Email Support",
      detail: "pocketpos.official@gmail.com",
      sub: "Response within 24 hours",
      icon: <Mail className="w-6 h-6 text-indigo-400" />,
      action: "mailto:pocketpos.official@gmail.com",
      btnText: "Send Email"
    },
    {
      title: "WhatsApp Support",
      detail: "+91 9074607140",
      sub: "Quickest for tech issues",
      icon: <MessageCircle className="w-6 h-6 text-teal-400" />,
      action: "https://wa.me/919074607140",
      btnText: "Chat Now"
    },
    {
      title: "Call Us",
      detail: "+91 9074607140",
      sub: "Mon - Sat, 9am - 6pm",
      icon: <Phone className="w-6 h-6 text-blue-400" />,
      action: "tel:+919074607140",
      btnText: "Call Now"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center text-white">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .print-hidden { display: none !important; }
          .print-container { background: white !important; color: black !important; box-shadow: none !important; border: none !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
          .dark-card { background: white !important; border: 1px solid #eee !important; color: black !important; }
        }
      `}} />

      {/* --- STICKY NAVIGATION --- */}
      <nav className="sticky top-0 w-full z-40 bg-gray-950/80 backdrop-blur-md border-b border-gray-800 print-hidden">
        <div className="max-w-4xl mx-auto px-4 h-16 flex justify-between items-center">
          <button 
            onClick={handleBackClick} 
            className="flex items-center gap-2 text-gray-400 hover:text-indigo-400 transition-colors font-medium group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> 
            Back {origin === 'settings' ? 'to Settings' : ''}
          </button>
          
          <button 
            onClick={handlePrint} 
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-800 text-gray-300 rounded-lg hover:bg-gray-800 shadow-lg transition-all text-sm"
          >
            <Printer size={18} /> Print Info
          </button>
        </div>
      </nav>

      {/* --- SCROLLABLE CONTENT --- */}
      <div className="w-full max-w-4xl px-4 py-8 print-container">
        <div className="bg-gray-900 rounded-2xl shadow-2xl shadow-indigo-900/20 overflow-hidden border border-gray-800 dark-card">
          
          {/* Header Section */}
          <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 p-10 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <LifeBuoy size={120} />
            </div>
            <div className="relative z-10">
              <div className="flex justify-center mb-4">
                <div className="bg-white/10 p-3 rounded-full backdrop-blur-md border border-white/20">
                  <LifeBuoy className="w-10 h-10 text-white animate-pulse" />
                </div>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">How can we help?</h1>
              <p className="mt-2 text-indigo-100 font-medium">Pocket POS Support Team is here for you</p>
            </div>
          </div>

          <div className="p-6 md:p-12 space-y-12">
            {/* Contact Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {supportContacts.map((contact, idx) => (
                <div key={idx} className="flex flex-col items-center p-6 rounded-2xl bg-gray-950 border border-gray-800 text-center hover:border-indigo-500/50 transition-all group">
                  <div className="mb-4 transform group-hover:scale-110 transition-transform">{contact.icon}</div>
                  <h3 className="font-bold text-white">{contact.title}</h3>
                  <p className="text-sm text-gray-400 mt-1 mb-4">{contact.detail}</p>
                  <p className="text-xs text-gray-500 mb-6 flex items-center gap-1 justify-center">
                    <Clock size={12} /> {contact.sub}
                  </p>
                  <a 
                    href={contact.action} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-auto w-full py-2.5 px-4 bg-gray-900 border border-gray-700 text-indigo-400 rounded-xl font-bold text-sm hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    {contact.btnText} <ExternalLink size={14} />
                  </a>
                </div>
              ))}
            </div>

            {/* Common Help Topics */}
            <section className="bg-gray-950 rounded-2xl p-6 sm:p-8 border border-gray-800">
              <h2 className="text-xl font-bold text-teal-400 mb-6 flex items-center gap-2">
                 Frequently Asked Questions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-200">Forgot Password?</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">Go to the Login screen and click on "Forgot Password". You will receive a reset link via your registered email.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-200">Printer not connecting?</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">Ensure Bluetooth is on and paired. We support standard 58mm/80mm Thermal Printers.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-200">Data Synchronization</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">Data syncs automatically with internet. If offline, it saves locally and syncs once you are back online.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-200">Can I add more staff?</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">Yes, Owners can add staff via Settings &gt; Staff & Permissions and assign roles like Manager or Cashier.</p>
                </div>
              </div>
            </section>

            {/* Registered Office Info */}
            <div className="pt-8 border-t border-gray-800 text-center">
              <h3 className="font-bold text-gray-500 mb-3 uppercase text-[10px] tracking-[0.2em]">Registered Office</h3>
              <p className="text-sm text-gray-400 leading-relaxed font-medium">
                Jaivin JV, Block no 181, Venkolla PO<br />
                Madathara, Trivandrum, Kerala, India - 691541
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-gray-600 text-xs pb-12 print:hidden">
          &copy; {new Date().getFullYear()} Pocket POS &bull; Helping your business grow
        </div>
      </div>
    </div>
  );
};

export default SupportPage;