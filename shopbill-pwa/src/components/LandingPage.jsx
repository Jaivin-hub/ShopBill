import React, { useState, useRef, useEffect } from 'react';
import { CreditCard, Receipt, Package, Users, LineChart, UserCog, Cloud, Globe } from 'lucide-react';
import coverImage from '../../public/covermain.png';
const translations = {
    en: {
        tagline: "#1 Retail Management Tool",
        title: "Your Shop, Fully Managed. Right in your Pocket.",
        subtitle: "Pocket POS transforms your smartphone or tablet into a powerful Point of Sale and Business Manager. Cut down on clutter, save time, and track every rupee instantly.",
        getStarted: "Log In",
        startTrial: "Start Your Free Trial",
        exploreFeatures: "Explore Features",
        featuresTitle: "Manage Every Aspect of Your Business",
        featuresSubtitle: "From ultra-fast billing to deep financial insights, Pocket POS does the heavy lifting so you can focus on your customers.",
        fastPOS: "Lightning-Fast POS",
        fastPOSDesc: "Complete sales transactions in seconds. Intuitive touch interface designed for high-volume retail environments. Print receipts or share via SMS.",
        stockControl: "Real-Time Stock Control",
        stockControlDesc: "Add, edit, and track products effortlessly. Get instant low-stock alerts and set smart reorder levels to never miss a sale.",
        khata: "Digital Khata (Credit Ledger)",
        khataDesc: "Manage customer credit and outstanding payments easily. Send gentle reminders and record payments, keeping your ledger always balanced.",
        reports: "Instant Business Reports",
        reportsDesc: "View daily, weekly, and custom sales trends. Identify top-selling items and busy hours to optimize purchasing and staffing.",
        staff: "Staff & Permissions",
        staffDesc: "Set specific roles (Owner, Cashier) for your staff members. Control access to sensitive data like reports and inventory management.",
        cloudSync: "Secure Cloud Sync",
        cloudSyncDesc: "Your data is safe and constantly synchronized across all your devices. Never worry about losing sales data or inventory records again.",
        testimonialQuote: "\"Pocket POS saved me hours every week. Managing credit accounts (Khata) used to be a headache, now it's just a tap away. The best mobile POS solution for my small retail shop.\"",
        testimonialAuthor: "Ravi Sharma, Owner",
        testimonialShop: "Sharma General Store, Kochi",
        pricingTitle: "Simple Pricing, Powerful Features",
        pricingSubtitle: "Choose the plan that fits your business. No hidden fees, just everything you need to grow.",
        basicPlan: "Basic Plan",
        proPlan: "Pro Plan",
        premiumPlan: "Premium Plan",
        basicDesc: "Best for single outlets and small teams.",
        proDesc: "Ideal for multiple outlets and high-growth businesses.",
        premiumDesc: "Perfect for large businesses with advanced needs.",
        recommended: "Recommended",
        selectBasic: "Select Basic",
        choosePro: "Choose Pro",
        choosePremium: "Choose Premium",
        unlimitedTxn: "Unlimited Transactions",
        limitedTxn: "Up to 50 Transactions/month",
        user1: "1 User (Owner Only)",
        user2: "2 Users (Owner + 1 Cashier)",
        userUnlimited: "Unlimited Users & Roles",
        basicInv: "Basic Inventory (100 items)",
        fullInv: "Full Inventory Management",
        fullInvBulk: "Full Inventory & Bulk Tools",
        khataView: "Digital Khata (View Only)",
        khataFull: "Full Digital Khata Ledger",
        khataSMS: "Khata + Automated SMS Reminders",
        privacy: "Privacy Policy",
        terms: "Terms of Service",
        support: "Support",
        copyright: "2025 Pocket POS. All rights reserved.",
        currentLang: "English",
    },
    ml: { // Malayalam Translations
        tagline: "#1 റീട്ടെയിൽ മാനേജ്‌മെന്റ് ടൂൾ",
        title: "നിങ്ങളുടെ കട, പൂർണ്ണമായി മാനേജ് ചെയ്യാം. നിങ്ങളുടെ പോക്കറ്റിൽ.",
        subtitle: "പോക്കറ്റ് പിഒഎസ് നിങ്ങളുടെ സ്മാർട്ട്‌ഫോണിനെയോ ടാബ്ലെറ്റിനെയോ ശക്തമായ പോയിന്റ് ഓഫ് സെയിൽസ്, ബിസിനസ് മാനേജറായി മാറ്റുന്നു. ക്ലട്ടർ കുറയ്ക്കുക, സമയം ലാഭിക്കുക, ഓരോ രൂപയും തൽക്ഷണം ട്രാക്ക് ചെയ്യുക.",
        getStarted: "തുടങ്ങുക",
        startTrial: "സൗജന്യ ട്രയൽ ആരംഭിക്കുക",
        exploreFeatures: "ഫീച്ചറുകൾ കാണുക",
        featuresTitle: "നിങ്ങളുടെ ബിസിനസ്സിന്റെ എല്ലാ കാര്യങ്ങളും കൈകാര്യം ചെയ്യുക",
        featuresSubtitle: "അതിവേഗ ബില്ലിംഗ് മുതൽ ആഴത്തിലുള്ള സാമ്പത്തിക വിശകലനം വരെ, പോക്കറ്റ് പിഒഎസ് നിങ്ങളുടെ ഭാരം കുറയ്ക്കുന്നു.",
        fastPOS: "അതിവേഗ പിഒഎസ്",
        fastPOSDesc: "വിൽപ്പന ഇടപാടുകൾ നിമിഷങ്ങൾക്കുള്ളിൽ പൂർത്തിയാക്കുക. വലിയ വിൽപ്പന നടക്കുന്ന ഇടങ്ങൾക്കായി രൂപകൽപ്പന ചെയ്ത ടച്ച് ഇന്റർഫേസ്. രസീതുകൾ പ്രിൻ്റ് ചെയ്യുക അല്ലെങ്കിൽ SMS വഴി പങ്കിടുക.",
        stockControl: "തത്സമയ സ്റ്റോക്ക് നിയന്ത്രണം",
        stockControlDesc: "ഉൽപ്പന്നങ്ങൾ ചേർക്കുക, എഡിറ്റ് ചെയ്യുക, ട്രാക്ക് ചെയ്യുക. സ്റ്റോക്ക് കുറയുമ്പോൾ അലർട്ടുകൾ നേടുക.",
        khata: "ഡിജിറ്റൽ കണക്ക് പുസ്തകം (Khata)",
        khataDesc: "ഉപഭോക്തൃ ക്രെഡിറ്റും കുടിശ്ശിക പേയ്മെൻ്റുകളും എളുപ്പത്തിൽ കൈകാര്യം ചെയ്യുക. ഓർമ്മപ്പെടുത്തലുകൾ അയക്കുക, കണക്ക് ബാലൻസ് ചെയ്യുക.",
        reports: "തൽക്ഷണ ബിസിനസ് റിപ്പോർട്ടുകൾ",
        reportsDesc: "ദിവസം, ആഴ്ച തോറുമുള്ള വിൽപ്പന ട്രെൻഡുകൾ കാണുക. ഏറ്റവും കൂടുതൽ വിറ്റഴിക്കപ്പെടുന്ന സാധനങ്ങൾ തിരിച്ചറിയുക.",
        staff: "ജീവനക്കാരും അനുമതികളും",
        staffDesc: "നിങ്ങളുടെ ജീവനക്കാർക്കായി പ്രത്യേക റോളുകൾ സജ്ജമാക്കുക (ഉടമ, കാഷ്യർ). സെൻസിറ്റീവ് ഡാറ്റയിലേക്കുള്ള പ്രവേശനം നിയന്ത്രിക്കുക.",
        cloudSync: "സുരക്ഷിത ക്ലൗഡ് സമന്വയം",
        cloudSyncDesc: "നിങ്ങളുടെ ഡാറ്റ സുരക്ഷിതവും എല്ലാ ഉപകരണങ്ങളിലുമായി സമന്വയിപ്പിച്ചതുമാണ്. ഡാറ്റ നഷ്ടപ്പെടുമെന്ന ആശങ്ക വേണ്ട.",
        testimonialQuote: "\"പോക്കറ്റ് പിഒഎസ് എൻ്റെ ആഴ്ചയിലെ മണിക്കൂറുകൾ ലാഭിച്ചു. കണക്ക് കൈകാര്യം ചെയ്യുന്നത് മുമ്പ് തലവേദനയായിരുന്നു, ഇപ്പോൾ ഒരു ടാപ്പ് മതി. എൻ്റെ ചെറിയ കടക്ക് ഇത് മികച്ച പരിഹാരമാണ്.\"",
        testimonialAuthor: "രവി ശർമ്മ, ഉടമ",
        testimonialShop: "ശർമ്മ ജനറൽ സ്റ്റോർ, കൊച്ചി",
        pricingTitle: "ലളിതമായ വില, ശക്തമായ ഫീച്ചറുകൾ",
        pricingSubtitle: "നിങ്ങളുടെ ബിസിനസ്സിന് അനുയോജ്യമായ പ്ലാൻ തിരഞ്ഞെടുക്കുക. മറഞ്ഞ ഫീസില്ല, വളരാൻ ആവശ്യമായതെല്ലാം ഇതിലുണ്ട്.",
        basicPlan: "ബേസിക് പ്ലാൻ",
        proPlan: "പ്രോ പ്ലാൻ",
        premiumPlan: "പ്രീമിയം പ്ലാൻ",
        basicDesc: "ഒരു ഔട്ട്ലെറ്റിനും ചെറിയ ടീമിനും മികച്ചത്.",
        proDesc: "ഒന്നിലധികം ഔട്ട്ലെറ്റുകൾക്കും വളരുന്ന ബിസിനസുകൾക്കും അനുയോജ്യമാണ്.",
        premiumDesc: "വലിയ ബിസിനസുകൾക്കും അഡ്വാൻസ്ഡ് ആവശ്യങ്ങൾക്കും അനുയോജ്യം.",
        recommended: "ശുപാർശ ചെയ്യുന്നത്",
        selectBasic: "ബേസിക് തിരഞ്ഞെടുക്കുക",
        choosePro: "പ്രോ തിരഞ്ഞെടുക്കുക",
        choosePremium: "പ്രീമിയം തിരഞ്ഞെടുക്കുക",
        unlimitedTxn: "അൺലിമിറ്റഡ് ഇടപാടുകൾ",
        limitedTxn: "പ്രതിമാസം 50 ഇടപാടുകൾ വരെ",
        user1: "1 ഉപയോക്താവ് (ഉടമ മാത്രം)",
        user2: "2 ഉപയോക്താക്കൾ (ഉടമ + 1 കാഷ്യർ)",
        userUnlimited: "അൺലിമിറ്റഡ് ഉപയോക്താക്കളും റോളുകളും",
        basicInv: "അടിസ്ഥാന ഇൻവെൻ്ററി (100 ഇനങ്ങൾ)",
        fullInv: "പൂർണ്ണ ഇൻവെൻ്ററി മാനേജ്മെൻ്റ്",
        fullInvBulk: "പൂർണ്ണ ഇൻവെൻ്ററിയും ബൾക്ക് ടൂളുകളും",
        khataView: "ഡിജിറ്റൽ കണക്ക് (കാണാൻ മാത്രം)",
        khataFull: "പൂർണ്ണ ഡിജിറ്റൽ കണക്ക് പുസ്തകം",
        khataSMS: "കണക്ക് + ഓട്ടോമേറ്റഡ് SMS ഓർമ്മപ്പെടുത്തലുകൾ",
        privacy: "സ്വകാര്യതാ നയം",
        terms: "സേവന നിബന്ധനകൾ",
        support: "സഹായം",
        copyright: "2025 പോക്കറ്റ് പിഒഎസ്. എല്ലാ അവകാശങ്ങളും നിക്ഷിപ്തം.",
        currentLang: "മലയാളം",
    }
};
const renderTitle = (fullTitle, gradientWord) => {
    return fullTitle.split('. ').map((part, index) => {
        const isLastPart = index === fullTitle.split('. ').length - 1;
        let content;
        if (part.includes(gradientWord)) {
            const parts = part.split(gradientWord);
            const textBefore = parts[0].trim();
            const textAfter = parts.slice(1).join(gradientWord); // Handles cases where the word appears multiple times (unlikely here)
            content = (
                <React.Fragment>
                    {textBefore && `${textBefore} `}
                    <span className="text-gradient">
                        {gradientWord}{textAfter}
                    </span>
                </React.Fragment>
            );
        } else {
            content = part;
        }
        return (
            <React.Fragment key={index}>
                {content}
                {!isLastPart && <>. <br className="hidden sm:inline" />{'\u00A0'}</>}
            </React.Fragment>
        );
    });
};
const LandingPage = ({ onStartApp, onSelectPlan }) => {
    const [language, setLanguage] = useState('en');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const t = translations[language]; // Current translation object
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    const handleLanguageChange = (lang) => {
        setLanguage(lang);
        setIsDropdownOpen(false);
    };
    const languages = [
        { code: 'en', label: 'English' },
        { code: 'ml', label: 'മലയാളം (Malayalam)' },
    ];
    const gradientWord = language === 'ml' ? 'പോക്കറ്റിൽ' : 'Pocket';
    return (
        <div className="min-h-screen bg-gray-950 scroll-smooth text-gray-300 font-sans">
            <style jsx="true" global="true">{`
                :root {
                    --color-primary: #818cf8; /* indigo-400 for dark theme contrast */
                    --color-secondary: #2dd4bf; /* teal-400 for dark theme contrast */
                }
                .text-gradient {
                    background-image: linear-gradient(to right, var(--color-primary), var(--color-secondary));
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    color: transparent;
                }
                .feature-card {
                    transition: all 0.3s ease;
                    transform: translateY(0);
                }
                .feature-card:hover {
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
                    transform: translateY(-5px);
                }
                @media (max-width: 767px) {
                    .hero-title {
                        font-size: 2.25rem; 
                    }
                }
            `}</style>
            <nav className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-sm shadow-xl shadow-indigo-900/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <a href="#" className="flex items-center space-x-2">
                            <CreditCard className="w-6 h-6 text-indigo-400" />
                            <span className="text-xl font-bold text-white">Pocket POS</span>
                        </a>
                        <div className="flex items-center space-x-2 sm:space-x-4">
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="text-gray-300 hover:text-white transition duration-300 flex items-center p-2 rounded-lg hover:bg-gray-800"
                                    aria-expanded={isDropdownOpen}
                                >
                                    <Globe className="w-5 h-5 mr-1" />
                                    <span className="text-sm font-medium hidden sm:inline">{t.currentLang}</span>
                                </button>
                                {isDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-48 rounded-md shadow-2xl bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-50 border border-indigo-700/50">
                                        <div className="py-1">
                                            {languages.map(({ code, label }) => (
                                                <button
                                                    key={code}
                                                    onClick={() => handleLanguageChange(code)}
                                                    className={`block w-full text-left px-4 py-2 text-sm font-medium transition-colors
                                                        ${language === code
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                                        }`}
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={onStartApp}
                                className="bg-indigo-600 text-white cursor-pointer text-sm font-semibold py-2 px-4 rounded-full shadow-lg hover:bg-indigo-700 transition duration-300">
                                {t.getStarted}
                            </button>
                        </div>
                    </div>
                </div>
            </nav>
            <main>
                <section className="py-12 md:py-24 bg-gray-950">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <span className="inline-block text-sm font-semibold text-teal-400 uppercase tracking-widest bg-teal-900/50 px-3 py-1 rounded-full mb-3 border border-teal-700/50">
                            {t.tagline}
                        </span>
                        <h1 className="hero-title text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tighter mb-4 text-white">
                            {renderTitle(t.title, gradientWord)}
                        </h1>
                        <p className="mt-4 text-lg text-gray-400 max-w-3xl mx-auto mb-8">
                            {t.subtitle}
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                            <a
                                href="#pricing"
                                className="w-full sm:w-auto px-8 py-3 bg-indigo-600 text-white text-lg font-bold rounded-xl shadow-xl hover:bg-indigo-700 transition transform hover:scale-[1.02] duration-300 ease-in-out">
                                {t.startTrial}
                            </a>
                            <a href="#features" className="w-full sm:w-auto px-8 py-3 bg-gray-800 text-indigo-400 text-lg font-bold rounded-xl border-2 border-indigo-900 hover:bg-gray-700 transition duration-300">
                                {t.exploreFeatures}
                            </a>
                        </div>
                        <div className="mt-12">
                            <img
                                src={coverImage}
                                alt="Pocket POS Application Dashboard Preview"
                                className="mx-auto rounded-xl shadow-[0_25px_50px_-12px_rgba(79,70,229,0.3)] border-4 border-gray-800 transform rotate-1 transition duration-500 ease-in-out hover:rotate-0 hover:scale-100"
                            />
                        </div>
                    </div>
                </section>
                <section id="features" className="py-16 bg-gray-950">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
                                {t.featuresTitle}
                            </h2>
                            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                                {t.featuresSubtitle}
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <div className="feature-card bg-gray-800 p-6 rounded-xl shadow-lg border border-indigo-900/50 hover:shadow-2xl">
                                <div className="p-3 inline-flex items-center justify-center rounded-full bg-indigo-900/50 text-indigo-400 mb-4">
                                    <Receipt className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">{t.fastPOS}</h3>
                                <p className="text-gray-400">{t.fastPOSDesc}</p>
                            </div>
                            <div className="feature-card bg-gray-800 p-6 rounded-xl shadow-lg border border-teal-900/50 hover:shadow-2xl">
                                <div className="p-3 inline-flex items-center justify-center rounded-full bg-teal-900/50 text-teal-400 mb-4">
                                    <Package className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">{t.stockControl}</h3>
                                <p className="text-gray-400">{t.stockControlDesc}</p>
                            </div>
                            <div className="feature-card bg-gray-800 p-6 rounded-xl shadow-lg border border-amber-900/50 hover:shadow-2xl">
                                <div className="p-3 inline-flex items-center justify-center rounded-full bg-amber-900/50 text-amber-400 mb-4">
                                    <Users className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">{t.khata}</h3>
                                <p className="text-gray-400">{t.khataDesc}</p>
                            </div>
                            <div className="feature-card bg-gray-800 p-6 rounded-xl shadow-lg border border-purple-900/50 hover:shadow-2xl">
                                <div className="p-3 inline-flex items-center justify-center rounded-full bg-purple-900/50 text-purple-400 mb-4">
                                    <LineChart className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">{t.reports}</h3>
                                <p className="text-gray-400">{t.reportsDesc}</p>
                            </div>
                            <div className="feature-card bg-gray-800 p-6 rounded-xl shadow-lg border border-pink-900/50 hover:shadow-2xl">
                                <div className="p-3 inline-flex items-center justify-center rounded-full bg-pink-900/50 text-pink-400 mb-4">
                                    <UserCog className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">{t.staff}</h3>
                                <p className="text-gray-400">{t.staffDesc}</p>
                            </div>
                            <div className="feature-card bg-gray-800 p-6 rounded-xl shadow-lg border border-blue-900/50 hover:shadow-2xl">
                                <div className="p-3 inline-flex items-center justify-center rounded-full bg-blue-900/50 text-blue-400 mb-4">
                                    <Cloud className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">{t.cloudSync}</h3>
                                <p className="text-gray-400">{t.cloudSyncDesc}</p>
                            </div>
                        </div>
                    </div>
                </section>
                <section className="py-16 md:py-20 bg-indigo-700">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <blockquote className="text-white">
                            <p className="text-2xl md:text-3xl font-medium leading-relaxed italic">
                                {t.testimonialQuote}
                            </p>
                            <footer className="mt-8">
                                <p className="text-lg font-semibold text-indigo-200">
                                    {t.testimonialAuthor}
                                </p>
                                <p className="text-sm text-indigo-300">
                                    {t.testimonialShop}
                                </p>
                            </footer>
                        </blockquote>
                    </div>
                </section>
                <section id="pricing" className="py-16 md:py-20 bg-gray-950">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
                            {t.pricingTitle}
                        </h2>
                        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
                            {t.pricingSubtitle}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                            <div className="bg-gray-800 text-gray-300 p-8 rounded-2xl shadow-xl border-2 border-gray-700/50 hover:border-indigo-600 transition duration-300">
                                <h3 className="text-2xl font-bold mb-2 text-white">{t.basicPlan}</h3>
                                <p className="text-gray-400 text-sm">{t.basicDesc}</p>
                                <div className="my-6">
                                    <span className="text-5xl font-extrabold text-white">₹499</span>
                                    <span className="text-xl font-medium text-gray-400">/{language === 'ml' ? 'മാസം' : 'month'}</span>
                                </div>
                                <ul className="text-left space-y-3 mb-8 text-gray-300">
                                    <li className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-teal-400"><polyline points="20 6 9 17 4 12" /></svg>
                                        {t.unlimitedTxn}
                                    </li>
                                    <li className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-teal-400"><polyline points="20 6 9 17 4 12" /></svg>
                                        {t.user2}
                                    </li>
                                    <li className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-teal-400"><polyline points="20 6 9 17 4 12" /></svg>
                                        {t.fullInv}
                                    </li>
                                    <li className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-teal-400"><polyline points="20 6 9 17 4 12" /></svg>
                                        {t.khataFull}
                                    </li>
                                </ul>

                                <button
                                    onClick={() => onSelectPlan('BASIC')}
                                    className="block cursor-pointer w-full py-3 bg-indigo-600 text-white text-lg font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition duration-300">
                                    {t.selectBasic}
                                </button>
                            </div>
                            <div className="bg-gray-800 text-gray-300 p-8 rounded-2xl shadow-xl border-2 border-gray-700/50 hover:border-indigo-600 transition duration-300">
                                <h3 className="text-2xl font-bold mb-2 text-white">{t.proPlan}</h3>
                                <p className="text-gray-400 text-sm">{t.proDesc}</p>
                                <div className="my-6">
                                    <span className="text-5xl font-extrabold text-white">₹799</span>
                                    <span className="text-xl font-medium text-gray-400">/{language === 'ml' ? 'മാസം' : 'month'}</span>
                                </div>
                                <ul className="text-left space-y-3 mb-8 text-gray-300">
                                    <li className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-teal-400"><polyline points="20 6 9 17 4 12" /></svg>
                                        {t.unlimitedTxn}
                                    </li>
                                    <li className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-teal-400"><polyline points="20 6 9 17 4 12" /></svg>
                                        {t.userUnlimited}
                                    </li>
                                    <li className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-teal-400"><polyline points="20 6 9 17 4 12" /></svg>
                                        {t.fullInvBulk}
                                    </li>
                                    <li className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-teal-400"><polyline points="20 6 9 17 4 12" /></svg>
                                        {t.khataSMS}
                                    </li>
                                </ul>
                                <button
                                    onClick={() => onSelectPlan('PRO')}
                                    className="block cursor-pointer w-full py-3 bg-indigo-600 text-white text-lg font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition duration-300">
                                    {t.choosePro}
                                </button>
                            </div>
                            <div className="bg-indigo-600 text-white p-8 rounded-2xl shadow-[0_25px_50px_-12px_rgba(79,70,229,0.5)] border-4 border-indigo-400 transform scale-100 lg:scale-[1.05] lg:relative lg:-top-3 transition duration-300">
                                <div className="absolute top-0 right-0 -mt-3 -mr-3 bg-teal-400 text-gray-900 text-xs font-bold py-1 px-3 rounded-full shadow-md">
                                    {t.recommended}
                                </div>
                                <h3 className="text-2xl font-bold mb-2">{t.premiumPlan}</h3>
                                <p className="text-indigo-200 text-sm">{t.premiumDesc}</p>
                                <div className="my-6">
                                    <span className="text-5xl font-extrabold text-white">₹999</span>
                                    <span className="text-xl font-medium text-indigo-200">/{language === 'ml' ? 'മാസം' : 'month'}</span>
                                </div>
                                <ul className="text-left space-y-3 mb-8 text-indigo-100">
                                    <li className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-white"><polyline points="20 6 9 17 4 12" /></svg>
                                        {t.unlimitedTxn}
                                    </li>
                                    <li className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-white"><polyline points="20 6 9 17 4 12" /></svg>
                                        {t.userUnlimited}
                                    </li>
                                    <li className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-white"><polyline points="20 6 9 17 4 12" /></svg>
                                        {t.fullInvBulk}
                                    </li>
                                    <li className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-white"><polyline points="20 6 9 17 4 12" /></svg>
                                        {t.khataSMS}
                                    </li>
                                </ul>
                                <button
                                    onClick={() => onSelectPlan('PREMIUM')}
                                    className="block cursor-pointer w-full py-3 bg-white text-indigo-700 text-lg font-bold rounded-xl shadow-lg hover:bg-gray-100 transition duration-300">
                                    {t.choosePremium}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <footer className="bg-gray-900 border-t border-gray-800 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500">
                    <div className="mb-4">
                        <a href="#" className="text-indigo-400 hover:text-indigo-300 mx-3">{t.privacy}</a>
                        <a href="#" className="text-indigo-400 hover:text-indigo-300 mx-3">{t.terms}</a>
                        <a href="#" className="text-indigo-400 hover:text-indigo-300 mx-3">{t.support}</a>
                    </div>
                    <p>&copy; {t.copyright}</p>
                </div>
            </footer>
        </div>
    );
};
export default LandingPage;