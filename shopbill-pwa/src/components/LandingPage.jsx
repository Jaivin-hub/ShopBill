import React from 'react';
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
    basicDesc: "Best for single outlets and small teams.",
    proDesc: "Ideal for multiple outlets and high-growth businesses.",
    premiumDesc: "Perfect for large businesses with advanced needs.",
    recommended: "Recommended",
    selectBasic: "Select Basic",
    choosePro: "Choose Pro",
    choosePremium: "Choose Premium",
    unlimitedTxn: "Unlimited Bills",
    user2: "2 Users (Owner + Staff)",
    userUnlimited: "3 Users (Owner + Cashier + Manager)",
    fullInv: "Standard Inventory",
    fullInvBulk: "Advanced Stock & Orders",
    khataFull: "Full Digital Khata",
    khataSMS: "Khata + Auto SMS Reminders",
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

const LandingPage = ({ onStartApp, onSelectPlan, onViewTerms, onViewPolicy, onViewSupport, onViewAffiliate }) => {
    const gradientWord = 'Pocket';

    return (
        <div className="min-h-screen bg-gray-950 text-gray-300 font-sans selection:bg-indigo-500/30">
            <style jsx="true" global="true">{`
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
            `}</style>

            <nav className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
                <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-black text-white tracking-tighter ">Pocket <span className="text-indigo-500">POS</span></span>
                    </div>
                    <button onClick={onStartApp} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black  tracking-widest py-2.5 px-6 rounded-2xl transition-all active:scale-95 shadow-lg shadow-indigo-500/20">
                        {content.getStarted}
                    </button>
                </div>
            </nav>

            <main>
                {/* Hero */}
                <section className="relative py-16 md:py-28 overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent -z-10" />
                    <div className="max-w-7xl mx-auto px-4 text-center">
                        <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 rounded-full mb-6">
                            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-black text-indigo-400  tracking-[0.2em]">{content.tagline}</span>
                        </div>
                        <h1 className="text-4xl md:text-7xl font-black text-white leading-[1.1] tracking-tighter mb-6">
                            {renderTitle(content.title, gradientWord)}
                        </h1>
                        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 font-medium leading-relaxed">
                            {content.subtitle}
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <a href="#pricing" className="px-10 py-4 bg-indigo-600 text-white font-black text-xs  tracking-widest rounded-[2rem] hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 active:scale-95 text-center">
                                {content.startTrial}
                            </a>
                            <a href="#features" className="px-10 py-4 bg-gray-900 text-gray-300 font-black text-xs  tracking-widest rounded-[2rem] border border-gray-800 hover:bg-gray-800 transition-all text-center">
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
                <section id="features" className="py-24 bg-gray-950">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="text-center mb-20">
                            <h2 className="text-3xl md:text-5xl font-black text-white  tracking-tighter mb-4">{content.featuresTitle}</h2>
                            <p className="text-gray-500 font-bold">{content.featuresSubtitle}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <FeatureItem icon={<Receipt />} title={content.fastPOS} desc={content.fastPOSDesc} color="indigo" />
                            <FeatureItem icon={<Package />} title={content.stockControl} desc={content.stockControlDesc} color="teal" />
                            <FeatureItem icon={<Truck />} title={content.supplyChain} desc={content.supplyChainDesc} color="amber" />
                            <FeatureItem icon={<Users />} title={content.khata} desc={content.khataDesc} color="emerald" />
                            <FeatureItem icon={<LineChart />} title={content.reports} desc={content.reportsDesc} color="purple" />
                            <FeatureItem icon={<Cloud />} title={content.cloudSync} desc={content.cloudSyncDesc} color="blue" />
                        </div>
                    </div>
                </section>

                {/* Pricing - Redirect Functionality Restored */}
                <section id="pricing" className="py-24">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-black text-white  tracking-tighter mb-4">{content.pricingTitle}</h2>
                            <p className="text-gray-500 font-bold">{content.pricingSubtitle}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <PriceCard 
                                plan={content.basicPlan} 
                                price="499" 
                                desc={content.basicDesc} 
                                items={[content.unlimitedTxn, content.user2, content.fullInv, content.khataFull]} 
                                btn={content.selectBasic} 
                                onSelect={() => onSelectPlan('BASIC')} 
                            />
                            <PriceCard 
                                plan={content.proPlan} 
                                price="799" 
                                desc={content.proDesc} 
                                items={[content.unlimitedTxn, content.userUnlimited, content.fullInvBulk, content.khataSMS]} 
                                btn={content.choosePro} 
                                onSelect={() => onSelectPlan('PRO')} 
                            />
                            <PriceCard 
                                plan={content.premiumPlan} 
                                price="999" 
                                featured={true} 
                                desc={content.premiumDesc} 
                                items={["All Pro Features", "Unlimited Staff", "Advanced Stock & Orders", "Supply Chain Tools", "Khata + Auto SMS Reminders"]} 
                                btn={content.choosePremium} 
                                onSelect={() => onSelectPlan('PREMIUM')} 
                            />
                        </div>
                    </div>
                </section>
            </main>

            <footer className="bg-gray-900 border-t border-gray-800 py-12 text-center">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex flex-wrap justify-center gap-6 mb-8 text-[10px] font-black  tracking-widest">
                        <FooterLink onClick={onViewPolicy} label={content.privacy} />
                        <FooterLink onClick={onViewTerms} label={content.terms} />
                        <FooterLink onClick={onViewSupport} label={content.support} />
                        <FooterLink onClick={onViewAffiliate} label={content.affiliate} />
                    </div>
                    <p className="text-gray-600 text-xs font-bold">{content.copyright}</p>
                </div>
            </footer>
        </div>
    );
};

const FeatureItem = ({ icon, title, desc, color }) => (
    <div className="feature-card bg-gray-900/50 p-8 rounded-[2rem]">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-${color}-500/10 text-${color}-500`}>
            {React.cloneElement(icon, { size: 28 })}
        </div>
        <h3 className="text-xl font-black text-white  tracking-tighter mb-3">{title}</h3>
        <p className="text-gray-500 font-bold text-sm leading-relaxed">{desc}</p>
    </div>
);

const PriceCard = ({ plan, price, desc, items, btn, featured, onSelect }) => (
    <div className={`relative p-10 rounded-[1.25rem] border-2 transition-all ${featured ? 'bg-indigo-600 border-indigo-400 shadow-2xl shadow-indigo-500/20 scale-105 z-10' : 'bg-gray-900 border-gray-800 hover:border-gray-700'}`}>
        {featured && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-teal-400 text-gray-900 text-[10px] font-black  tracking-widest px-4 py-1 rounded-full">{content.recommended}</div>}
        <h3 className="text-2xl font-black  tracking-tighter mb-2 text-white">{plan}</h3>
        <p className={`text-xs font-bold mb-6 ${featured ? 'text-indigo-100' : 'text-gray-500'}`}>{desc}</p>
        <div className="mb-8">
            <span className="text-5xl font-black tracking-tighter text-white">₹{price}</span>
            <span className={`text-sm font-bold ${featured ? 'text-indigo-200' : 'text-gray-500'}`}>/month</span>
        </div>
        <ul className="space-y-4 mb-10 text-left">
            {items.map((item, i) => (
                <li key={i} className={`flex items-center text-xs font-bold ${featured ? 'text-white' : 'text-gray-300'}`}>
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

const FooterLink = ({ onClick, label }) => (
    <button onClick={onClick} className="text-gray-500 hover:text-indigo-400 transition-colors cursor-pointer">
        {label}
    </button>
);

export default LandingPage;