import React, { useEffect } from 'react';
import { Printer, LifeBuoy, ArrowLeft, Mail, Phone, MessageCircle, Clock, ExternalLink } from 'lucide-react';

const SupportPage = ({ onBack }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const supportContacts = [
    {
      title: "Email Support",
      detail: "pocketpos.official@gmail.com",
      sub: "Response within 24 hours",
      icon: <Mail className="w-6 h-6 text-indigo-600" />,
      action: "mailto:pocketpos.official@gmail.com",
      btnText: "Send Email"
    },
    {
      title: "WhatsApp Support",
      detail: "+91 9074607140",
      sub: "Quickest for tech issues",
      icon: <MessageCircle className="w-6 h-6 text-green-600" />,
      action: "https://wa.me/919074607140",
      btnText: "Chat Now"
    },
    {
      title: "Call Us",
      detail: "+91 9074607140",
      sub: "Mon - Sat, 9am - 6pm",
      icon: <Phone className="w-6 h-6 text-blue-600" />,
      action: "tel:+919074607140",
      btnText: "Call Now"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
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
            <Printer size={18} /> Print Info
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-indigo-600 p-10 text-center text-white">
            <div className="flex justify-center mb-4">
              <div className="bg-indigo-500/50 p-3 rounded-full backdrop-blur-sm">
                <LifeBuoy className="w-10 h-10 text-white animate-pulse" />
              </div>
            </div>
            <h1 className="text-3xl font-extrabold">How can we help?</h1>
            <p className="mt-2 text-indigo-100 font-medium">Pocket POS Support Team is here for you</p>
          </div>

          <div className="p-8 md:p-12 space-y-12">
            {/* Contact Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {supportContacts.map((contact, idx) => (
                <div key={idx} className="flex flex-col items-center p-6 rounded-2xl bg-gray-50 border border-gray-100 text-center hover:border-indigo-200 transition-colors">
                  <div className="mb-4">{contact.icon}</div>
                  <h3 className="font-bold text-gray-900">{contact.title}</h3>
                  <p className="text-sm text-gray-600 mt-1 mb-4">{contact.detail}</p>
                  <p className="text-xs text-gray-400 mb-6 flex items-center gap-1 justify-center">
                    <Clock size={12} /> {contact.sub}
                  </p>
                  <a 
                    href={contact.action} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-auto w-full py-2 px-4 bg-white border border-gray-200 text-indigo-600 rounded-lg font-bold text-sm hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {contact.btnText} <ExternalLink size={14} />
                  </a>
                </div>
              ))}
            </div>

            {/* Common Help Topics */}
            <section className="bg-indigo-50 rounded-2xl p-8 border border-indigo-100">
              <h2 className="text-xl font-bold text-indigo-900 mb-6">Frequently Asked</h2>
              <div className="space-y-6">
                <div>
                  <h4 className="font-bold text-gray-900">Forgot Password?</h4>
                  <p className="text-sm text-gray-600">Go to the Login screen and click on "Forgot Password". You will receive a reset link via your registered email.</p>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">Printer not connecting?</h4>
                  <p className="text-sm text-gray-600">Ensure Bluetooth is on and the printer is paired with your device. Pocket POS supports standard 58mm/80mm Thermal Printers.</p>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">Data Synchronization</h4>
                  <p className="text-sm text-gray-600">Data syncs automatically when you have an internet connection. If offline, data will sync once you are back online.</p>
                </div>
              </div>
            </section>

            {/* Registered Office Info */}
            <div className="pt-8 border-t border-gray-100 text-center">
              <h3 className="font-bold text-gray-900 mb-2 uppercase text-xs tracking-widest">Registered Office</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Jaivin JV, Block no 181, Venkolla PO<br />
                Madathara, Trivandrum, Kerala, India - 691531
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-gray-400 text-xs pb-12 print:hidden">
          &copy; {new Date().getFullYear()} Pocket POS &bull; Helping your business grow
        </div>
      </div>
    </div>
  );
};

export default SupportPage;