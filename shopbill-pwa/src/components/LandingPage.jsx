import React, { useEffect } from 'react';
import { 
    CreditCard, Receipt, Package, Users, LineChart, 
    UserCog, Cloud, Truck, ChevronRight, CheckCircle2 
} from 'lucide-react';
import coverImage from '../../public/covermain.png';

const content = {
    tagline: "#1 Shop Management Tool",
    title: "Your Shop, Fully Managed. Right in your Pocket",
    subtitle: "Pocket POS turns your phone into a powerful business partner. Stop the paperwork, save your time, and track every single rupee without the stress.",
    getStarted: "Log In",
    startTrial: "Start Your Free Trial",
    exploreFeatures: "See How It Works",
    featuresTitle: "Everything You Need to Run Your Shop",
    featuresSubtitle: "From super-fast billing to tracking your suppliers, we handle the boring stuff so you can focus on your customers.",
    
    // Features
    fastPOS: "Quick & Easy Billing",
    fastPOSDesc: "Finish sales in seconds. No more long lines or math mistakes. Print bills or send them straight to your customer's phone via SMS.",
    stockControl: "Smart Stock Tracking",
    stockControlDesc: "Know exactly what's on your shelves. Get a friendly nudge when items are running low so you never run out of your best-sellers.",
    supplyChain: "Supplier & Order Manager",
    supplyChainDesc: "Keep a list of all your suppliers in one place. Track your orders from the moment you call them until the stock reaches your shop door.",
    khata: "Easy Digital Khata",
    khataDesc: "No more notebooks! Track who owes you money, send polite payment reminders, and keep your credit accounts crystal clear.",
    reports: "Simple Sales Insights",
    reportsDesc: "See your daily profit and top items with one tap. Understand your busy hours and make better choices for your business.",
    cloudSync: "Safe & Always Ready",
    cloudSyncDesc: "Your data is backed up safely in the cloud. If you switch phones, your data is right there waiting for you. 100% secure.",

    testimonialQuote: "\"Pocket POS saved me hours every week. Managing my credit accounts (Khata) used to be a headache, now it's just a tap away. It’s the best help my shop ever had.\"",
    testimonialAuthor: "Ravi Sharma",
    testimonialShop: "Sharma General Store, Kochi",
    
    pricingTitle: "Fair Pricing for Every Shop",
    pricingSubtitle: "Pick the plan that fits your size. No hidden tricks, just clear tools to help you grow.",
    basicPlan: "Small Shop",
    proPlan: "Growing Business",
    premiumPlan: "Big Enterprise",
    basicDesc: "Essential tools for single outlets.",
    proDesc: "Advanced automation for serious growth.",
    premiumDesc: "The complete solution for multi-store chains.",
    recommended: "MOST POPULAR",
    selectBasic: "Start Basic",
    choosePro: "Upgrade to Pro",
    choosePremium: "Contact for Enterprise",
    unlimitedTxn: "Unlimited Billing",
    user3: "3 Staff Users",
    userUnlimited: "Unlimited Staff & Managers",
    fullInv: "Standard Inventory",
    fullInvBulk: "Smart Stock & Auto-PO",
    khataFull: "Full Digital Khata",
    khataSMS: "Auto SMS Payment Reminders",
    multiStore: "Up to 10 Store Locations",
    prioritySupport: "24/7 Priority Support",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    support: "Help & Support",
    copyright: "2026 Pocket POS. All rights reserved.",
    affiliate: "Earn with Us"
};

const renderTitle = (fullTitle, gradientWord) => {
    return fullTitle.split('. ').map((part, index) => {
        const isLastPart = index === fullTitle.split('. ').length - 1;
        let contentPart;
        if (part.includes(gradientWord)) {
            const parts = part.split(gradientWord);
            const textBefore = parts[0].trim();
            const textAfter = parts.slice(1).join(gradientWord);
            contentPart = (
                <React.Fragment>
                    {textBefore && `${textBefore} `}
                    <span className="text-gradient">
                        {gradientWord}{textAfter}
                    </span>
                </React.Fragment>
            );
        } else {
            contentPart = part;
        }
        return (
            <React.Fragment key={index}>
                {contentPart}
                {!isLastPart && <>. <br className="hidden sm:inline" />{'\u00A0'}</>}
            </React.Fragment>
        );
    });
};

const LandingPage = ({ onStartApp, onSelectPlan, onViewTerms, onViewPolicy, onViewSupport, onViewAffiliate, scrollToPricing, darkMode = true }) => {
    const gradientWord = 'Pocket';

    useEffect(() => {
        if (scrollToPricing) {
            const pricingSection = document.getElementById('pricing');
            if (pricingSection) {
                pricingSection.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [scrollToPricing]);

    const bgColor = darkMode ? 'bg-gray-950' : 'bg-slate-50';
    const textColor = darkMode ? 'text-gray-300' : 'text-slate-900';
    const navBg = darkMode ? 'bg-gray-950/80' : 'bg-white/80';
    const navBorder = darkMode ? 'border-gray-800' : 'border-slate-200';
    const cardBg = darkMode ? 'bg-gray-900/50' : 'bg-white';
    const cardBorder = darkMode ? 'border-gray-800' : 'border-slate-200';
    const footerBg = darkMode ? 'bg-gray-900' : 'bg-slate-100';
    const footerBorder = darkMode ? 'border-gray-800' : 'border-slate-200';
    const footerText = darkMode ? 'text-gray-600' : 'text-slate-600';
    const buttonBg = darkMode ? 'bg-gray-900' : 'bg-slate-100';
    const buttonBorder = darkMode ? 'border-gray-800' : 'border-slate-300';
    const buttonHover = darkMode ? 'hover:bg-gray-800' : 'hover:bg-slate-200';
    const titleColor = darkMode ? 'text-white' : 'text-slate-900';
    const subtitleColor = darkMode ? 'text-gray-400' : 'text-slate-600';
    const descColor = darkMode ? 'text-gray-500' : 'text-slate-700';
    const priceCardBg = darkMode ? 'bg-gray-900' : 'bg-white';
    const priceCardBorder = darkMode ? 'border-gray-800' : 'border-slate-300';
    const priceCardHover = darkMode ? 'hover:border-gray-700' : 'hover:border-slate-400';
    const priceText = darkMode ? 'text-white' : 'text-slate-900';
    const priceDesc = darkMode ? 'text-gray-500' : 'text-slate-600';
    const priceItem = darkMode ? 'text-gray-300' : 'text-slate-700';

    return (
        <div className={`min-h-screen ${bgColor} ${textColor} font-sans selection:bg-indigo-500/30 transition-colors duration-300`}>
            <style dangerouslySetInnerHTML={{__html: `
                .text-gradient {
                    background-image: linear-gradient(to right, #818cf8, #2dd4bf);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                .feature-card {
                    border: 1px solid rgba(79, 70, 229, 0.1);
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .feature-card:hover {
                    border-color: rgba(79, 70, 229, 0.4);
                    transform: translateY(-8px);
                    background: rgba(31, 41, 55, 0.8);
                }
            `}} />

            <nav className={`sticky top-0 z-50 ${navBg} backdrop-blur-md border-b ${navBorder} transition-colors duration-300`}>
                <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-white" />
                        </div>
                        <span className={`text-xl font-black ${titleColor} tracking-tighter transition-colors duration-300`}>Pocket <span className="text-indigo-500">POS</span></span>
                    </div>
                    <button onClick={onStartApp} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black  tracking-widest py-2.5 px-6 rounded-2xl transition-all active:scale-95 shadow-lg shadow-indigo-500/20">
                        {content.getStarted}
                    </button>
                </div>
            </nav>

            <main>
                {/* Hero */}
                <section className="relative py-10 md:py-28 overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent -z-10" />
                    <div className="max-w-7xl mx-auto px-4 text-center">
                        <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 rounded-full mb-6">
                            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-black text-indigo-400  tracking-[0.2em]">{content.tagline}</span>
                        </div>
                        <h1 className={`text-4xl md:text-7xl font-black ${titleColor} leading-[1.1] tracking-tighter mb-6 transition-colors duration-300`}>
                            {renderTitle(content.title, gradientWord)}
                        </h1>
                        <p className={`text-lg ${subtitleColor} max-w-2xl mx-auto mb-10 font-medium leading-relaxed transition-colors duration-300`}>
                            {content.subtitle}
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <a href="#pricing" className="px-10 py-4 bg-indigo-600 text-white font-black text-xs  tracking-widest rounded-[2rem] hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 active:scale-95 text-center">
                                {content.startTrial}
                            </a>
                            <a href="#features" className={`px-10 py-4 ${buttonBg} ${textColor} font-black text-xs  tracking-widest rounded-[2rem] border ${buttonBorder} ${buttonHover} transition-all text-center`}>
                                {content.exploreFeatures}
                            </a>
                        </div>
                        <div className="mt-16 relative">
                            <div className="absolute inset-0 bg-indigo-500/20 blur-[100px] -z-10 rounded-full" />
                            <img src={coverImage} alt="Dashboard Preview" className="mx-auto rounded-[1.25rem] border-[12px] border-gray-900 shadow-2xl relative z-10" />
                        </div>
                    </div>
                </section>

                {/* Features */}
                <section id="features" className={`py-24 ${bgColor} transition-colors duration-300`}>
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="text-center mb-20">
                            <h2 className={`text-3xl md:text-5xl font-black ${titleColor}  tracking-tighter mb-4 transition-colors duration-300`}>{content.featuresTitle}</h2>
                            <p className={`${descColor} font-bold transition-colors duration-300`}>{content.featuresSubtitle}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <FeatureItem icon={<Receipt />} title={content.fastPOS} desc={content.fastPOSDesc} color="indigo" darkMode={darkMode} />
                            <FeatureItem icon={<Package />} title={content.stockControl} desc={content.stockControlDesc} color="teal" darkMode={darkMode} />
                            <FeatureItem icon={<Truck />} title={content.supplyChain} desc={content.supplyChainDesc} color="amber" darkMode={darkMode} />
                            <FeatureItem icon={<Users />} title={content.khata} desc={content.khataDesc} color="emerald" darkMode={darkMode} />
                            <FeatureItem icon={<LineChart />} title={content.reports} desc={content.reportsDesc} color="purple" darkMode={darkMode} />
                            <FeatureItem icon={<Cloud />} title={content.cloudSync} desc={content.cloudSyncDesc} color="blue" darkMode={darkMode} />
                        </div>
                    </div>
                </section>

                {/* Pricing - Using Suggested Strategy */}
                <section id="pricing" className="py-24">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="text-center mb-16">
                            <h2 className={`text-3xl md:text-5xl font-black ${titleColor}  tracking-tighter mb-4 transition-colors duration-300`}>{content.pricingTitle}</h2>
                            <p className={`${descColor} font-bold transition-colors duration-300`}>{content.pricingSubtitle}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <PriceCard 
                                plan={content.basicPlan} 
                                price="999" 
                                desc={content.basicDesc} 
                                items={[content.unlimitedTxn, content.user3, content.fullInv, content.khataFull]} 
                                btn={content.selectBasic} 
                                onSelect={() => onSelectPlan('BASIC')} 
                                darkMode={darkMode}
                            />
                            <PriceCard 
                                plan={content.proPlan} 
                                price="2199" 
                                featured={true}
                                desc={content.proDesc} 
                                items={[content.unlimitedTxn, content.userUnlimited, content.fullInvBulk, content.khataSMS, "Supplier Management"]} 
                                btn={content.choosePro} 
                                onSelect={() => onSelectPlan('PRO')} 
                                darkMode={darkMode}
                            />
                            <PriceCard 
                                plan={content.premiumPlan} 
                                price="4999" 
                                desc={content.premiumDesc} 
                                items={["All Pro Features", content.multiStore, "Inventory Syncing", "Employee Audit Logs", content.prioritySupport]} 
                                btn={content.choosePremium} 
                                onSelect={() => onSelectPlan('PREMIUM')} 
                                darkMode={darkMode}
                            />
                        </div>
                    </div>
                </section>
            </main>

            <footer className={`${footerBg} border-t ${footerBorder} py-12 text-center transition-colors duration-300`}>
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex flex-wrap justify-center gap-6 mb-8 text-[10px] font-black  tracking-widest">
                        <FooterLink onClick={onViewPolicy} label={content.privacy} darkMode={darkMode} />
                        <FooterLink onClick={onViewTerms} label={content.terms} darkMode={darkMode} />
                        <FooterLink onClick={onViewSupport} label={content.support} darkMode={darkMode} />
                        <FooterLink onClick={onViewAffiliate} label={content.affiliate} darkMode={darkMode} />
                    </div>
                    <p className={`${footerText} text-xs font-bold transition-colors duration-300`}>{content.copyright}</p>
                </div>
            </footer>
        </div>
    );
};

const FeatureItem = ({ icon, title, desc, color, darkMode = true }) => {
    const cardBg = darkMode ? 'bg-gray-900/50' : 'bg-white';
    const titleText = darkMode ? 'text-white' : 'text-slate-900';
    const descText = darkMode ? 'text-gray-500' : 'text-slate-600';
    return (
    <div className={`feature-card ${cardBg} p-8 rounded-[2rem] transition-colors duration-300`}>
        <div className="flex items-center gap-4 mb-4">
            <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center bg-${color}-500/10 text-${color}-500`}>
                {React.cloneElement(icon, { size: 24 })}
            </div>
            <h3 className={`text-xl font-black ${titleText} tracking-tighter leading-tight transition-colors duration-300`}>
                {title}
            </h3>
        </div>
        <p className={`${descText} font-bold text-sm leading-relaxed transition-colors duration-300`}>
            {desc}
        </p>
    </div>
    );
};

const PriceCard = ({ plan, price, desc, items, btn, featured, onSelect, darkMode = true }) => {
    const cardBg = darkMode ? (featured ? 'bg-indigo-600' : 'bg-gray-900') : (featured ? 'bg-indigo-600' : 'bg-white');
    const cardBorder = darkMode ? (featured ? 'border-indigo-400' : 'border-gray-800') : (featured ? 'border-indigo-400' : 'border-slate-300');
    const cardHover = darkMode ? 'hover:border-gray-700' : 'hover:border-slate-400';
    const textColor = featured ? 'text-white' : (darkMode ? 'text-white' : 'text-slate-900');
    const descColor = featured ? 'text-indigo-100' : (darkMode ? 'text-gray-500' : 'text-slate-600');
    const itemColor = featured ? 'text-white' : (darkMode ? 'text-gray-300' : 'text-slate-700');
    return (
    <div className={`relative p-10 rounded-[1.25rem] border-2 transition-all ${featured ? `${cardBg} ${cardBorder} shadow-2xl shadow-indigo-500/20 scale-105 z-10` : `${cardBg} ${cardBorder} ${cardHover}`}`}>
        {featured && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-teal-400 text-gray-900 text-[10px] font-black  tracking-widest px-4 py-1 rounded-full">{content.recommended}</div>}
        <h3 className={`text-2xl font-black  tracking-tighter mb-2 ${textColor} transition-colors duration-300`}>{plan}</h3>
        <p className={`text-xs font-bold mb-6 ${descColor} transition-colors duration-300`}>{desc}</p>
        <div className="mb-8">
            <span className={`text-5xl font-black tracking-tighter ${textColor} transition-colors duration-300`}>₹{price}</span>
            <span className={`text-sm font-bold ${descColor} transition-colors duration-300`}>/month</span>
        </div>
        <ul className="space-y-4 mb-10 text-left">
            {items.map((item, i) => (
                <li key={i} className={`flex items-center text-xs font-bold ${itemColor} transition-colors duration-300`}>
                    <CheckCircle2 className={`w-4 h-4 mr-3 ${featured ? 'text-teal-300' : 'text-indigo-500'}`} /> {item}
                </li>
            ))}
        </ul>
        <button 
            onClick={onSelect} 
            className={`w-full py-4 rounded-2xl font-black text-[10px]  tracking-widest transition-all active:scale-95 cursor-pointer ${featured ? 'bg-white text-indigo-600 hover:bg-gray-100 shadow-lg' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}
        >
            {btn}
        </button>
    </div>
    );
};

const FooterLink = ({ onClick, label, darkMode = true }) => {
    const linkColor = darkMode ? 'text-gray-500' : 'text-slate-600';
    return (
    <button onClick={onClick} className={`${linkColor} hover:text-indigo-400 transition-colors cursor-pointer`}>
        {label}
    </button>
    );
};

export default LandingPage;