import React, { useEffect } from 'react';
import { Printer, LifeBuoy, ArrowLeft, Mail, Phone, MessageCircle, Clock, ExternalLink } from 'lucide-react';

const SupportPage = ({ onBack, origin, darkMode = true }) => {
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
  const contactCardBg = darkMode ? 'bg-gray-950' : 'bg-slate-50';
  const navBtnBg = darkMode ? 'bg-gray-900' : 'bg-slate-100';
  const navBtnBorder = darkMode ? 'border-gray-800' : 'border-slate-300';
  const navBtnText = darkMode ? 'text-gray-300' : 'text-slate-700';
  const backHover = darkMode ? 'text-gray-400 hover:text-indigo-400' : 'text-slate-600 hover:text-indigo-600';
  const faqSectionBg = darkMode ? 'bg-gray-950' : 'bg-slate-50';
  const faqHeading = darkMode ? 'text-gray-200' : 'text-slate-800';

  const supportContacts = [
    {
      title: "Email Support",
      detail: "hello@pocketpos.io",
      sub: "Response within 24 hours",
      icon: <Mail className="w-6 h-6 text-indigo-400" />,
      action: "mailto:hello@pocketpos.io",
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

  // Structured Data for Support Page
  const structuredData = {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      "name": "Support - Pocket POS",
      "description": "Get help with Pocket POS. Contact our support team, access documentation, and find answers to common questions.",
      "url": "https://yourdomain.com/support"
  };

  return (
      <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
          <article className={`min-h-screen flex flex-col items-center transition-colors duration-300 ${bgPage} ${textPrimary}`} itemScope itemType="https://schema.org/ContactPage">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .print-hidden { display: none !important; }
          .print-container { background: white !important; color: black !important; box-shadow: none !important; border: none !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
          .dark-card { background: white !important; border: 1px solid #eee !important; color: black !important; }
        }
      `}} />

      {/* --- STICKY NAVIGATION --- */}
      <nav className={`sticky top-0 w-full z-40 backdrop-blur-md border-b print-hidden transition-colors duration-300 ${navBg} ${borderCl}`}>
        <div className="max-w-4xl mx-auto px-4 h-16 flex justify-between items-center">
          <button onClick={handleBackClick} className={`flex items-center gap-2 transition-colors font-medium group ${backHover}`}>
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> 
            Back {origin === 'settings' ? 'to Settings' : ''}
          </button>
          <button onClick={handlePrint} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg transition-all text-sm ${navBtnBg} border ${navBtnBorder} ${navBtnText} ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-slate-200'}`}>
            <Printer size={18} /> Print Info
          </button>
        </div>
      </nav>

      {/* --- SCROLLABLE CONTENT --- */}
      <div className="w-full max-w-4xl px-4 py-8 print-container">
        <div className={`rounded-2xl shadow-2xl overflow-hidden border dark-card transition-colors duration-300 ${cardBg} ${borderCl} ${darkMode ? 'shadow-indigo-900/20' : 'shadow-slate-200'}`}>
          
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
              <h1 className="text-3xl font-extrabold tracking-tight text-white" itemProp="headline">How can we help?</h1>
              <p className="mt-2 text-indigo-100 font-medium" itemProp="description">Pocket POS Support Team is here for you</p>
            </div>
          </div>

          <div className="p-6 md:p-12 space-y-12">
            {/* Contact Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {supportContacts.map((contact, idx) => (
                <div key={idx} className={`flex flex-col items-center p-6 rounded-2xl border text-center hover:border-indigo-500/50 transition-all group ${contactCardBg} ${borderCl}`}>
                  <div className="mb-4 transform group-hover:scale-110 transition-transform">{contact.icon}</div>
                  <h3 className={`font-bold ${textPrimary}`}>{contact.title}</h3>
                  <p className={`text-sm mt-1 mb-4 ${textMuted}`}>{contact.detail}</p>
                  <p className={`text-xs mb-6 flex items-center gap-1 justify-center ${textDim}`}>
                    <Clock size={12} /> {contact.sub}
                  </p>
                  <a 
                    href={contact.action} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`mt-auto w-full py-2.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm ${darkMode ? 'bg-gray-900 border border-gray-700 text-indigo-400 hover:bg-indigo-600 hover:text-white' : 'bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white'}`}
                  >
                    {contact.btnText} <ExternalLink size={14} />
                  </a>
                </div>
              ))}
            </div>

            {/* Common Help Topics */}
            <section className={`rounded-2xl p-6 sm:p-8 border ${faqSectionBg} ${borderCl}`}>
              <h2 className="text-xl font-bold text-teal-400 mb-6 flex items-center gap-2">
                 Frequently Asked Questions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <h4 className={`font-bold ${faqHeading}`}>Forgot Password?</h4>
                  <p className={`text-sm leading-relaxed ${textDim}`}>Go to the Login screen and click on "Forgot Password". You will receive a reset link via your registered email.</p>
                </div>
                <div className="space-y-2">
                  <h4 className={`font-bold ${faqHeading}`}>Printer not connecting?</h4>
                  <p className={`text-sm leading-relaxed ${textDim}`}>Ensure Bluetooth is on and paired. We support standard 58mm/80mm Thermal Printers.</p>
                </div>
                <div className="space-y-2">
                  <h4 className={`font-bold ${faqHeading}`}>Data Synchronization</h4>
                  <p className={`text-sm leading-relaxed ${textDim}`}>Data syncs automatically with internet. If offline, it saves locally and syncs once you are back online.</p>
                </div>
                <div className="space-y-2">
                  <h4 className={`font-bold ${faqHeading}`}>Can I add more staff?</h4>
                  <p className={`text-sm leading-relaxed ${textDim}`}>Yes, Owners can add staff via Settings &gt; Team Management and assign roles like Manager or Cashier.</p>
                </div>
              </div>
            </section>

            {/* Registered Office Info */}
            <div className={`pt-8 border-t text-center ${borderCl}`}>
              <h3 className={`font-bold mb-3 uppercase text-[10px] tracking-[0.2em] ${textDim}`}>Registered Office</h3>
              <p className={`text-sm leading-relaxed font-medium ${textMuted}`}>
                PocketPos, Block no 181, Venkolla PO<br />
                Madathara, Trivandrum, Kerala, India - 691541
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className={`mt-8 text-center text-xs pb-12 print:hidden ${darkMode ? 'text-gray-600' : 'text-slate-500'}`}>
          &copy; {new Date().getFullYear()} Pocket POS &bull; Helping your business grow
        </div>
      </div>
    </article>
    </>
  );
};

export default SupportPage;