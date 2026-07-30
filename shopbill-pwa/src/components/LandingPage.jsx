import React, { useEffect } from 'react';
import { 
    CreditCard, Receipt, Package, Users, LineChart, 
    Truck, CheckCircle2, 
    Bell, XCircle,
    WifiOff, RefreshCw, Wallet, Clock, Building2, UserCog
} from 'lucide-react';
import coverImage from '../../public/covermain.png';
import ThemeToggle from './ThemeToggle';

const content = {
    tagline: "#1 Shop Management Tool",
    title: "Your Shop, Fully Managed. Right in your Pocket",
    subtitle: "Pocket POS turns your phone into a powerful business partner. Bill even without internet or power, sync when you're back online, and run multi-outlet teams from one app.",
    getStarted: "Log In",
    startTrial: "Start Your Free Trial",
    exploreFeatures: "See How It Works",
    featuresTitle: "Everything You Need to Run Your Shop",
    featuresSubtitle: "From offline-ready billing to multi-outlet chat, shift tracking, and payroll—built for shops that cannot stop when the network drops.",
    highlightsTitle: "Built for Real Shop Floors",
    highlightsSubtitle: "The tools owners ask for most—offline sales, outlet-wide messaging, staff shifts, and salary settlement.",

    offlineBilling: "Bill Without Internet or Power",
    offlineBillingDesc: "Keep selling when Wi‑Fi fails or power cuts out. Bills stay saved on your device and auto-sync to the cloud the moment you're back online—nothing lost, no double entry.",
    multiOutletChat: "Multi-Outlet Real-Time Chat",
    multiOutletChatDesc: "Separate group chats per outlet plus direct messages across your store network. Coordinate staff instantly—no missed calls or scattered WhatsApp groups.",
    teamShifts: "Team Shifts & Punch-In Alerts",
    teamShiftsDesc: "Set work schedules and shifts per staff member. Owners and managers get real-time alerts when staff punch in, take breaks, or finish their shift.",
    salaryPayroll: "Salary Reports & Mark Settlement",
    salaryPayrollDesc: "Monthly payroll with hours, overtime, and base pay in one view. Mark salaries as settled, attach notes, and keep a clear payment history for every team member.",

    // Features
    fastPOS: "Quick & Easy Billing",
    fastPOSDesc: "Finish sales in seconds. No more long lines or math mistakes. Print clear bills and keep your counter moving.",
    stockControl: "Smart Stock Tracking",
    stockControlDesc: "See what you have in stock at a glance. We'll remind you when it's time to reorder so you never run out of what sells.",
    supplyChain: "Supplier & Order Manager",
    supplyChainDesc: "Keep a list of all your suppliers in one place. Track your orders from the moment you call them until the stock reaches your shop door.",
    khata: "Easy Digital Khata",
    khataDesc: "No more notebooks! Track who owes you money, send polite payment reminders, and keep your credit accounts crystal clear.",
    reports: "Simple Sales Insights",
    reportsDesc: "See your daily profit and top items with one tap. Understand your busy hours and make better choices for your business.",
    cloudSync: "Safe & Always Ready",
    cloudSyncDesc: "Your data is backed up safely in the cloud. If you switch phones, your data is right there waiting for you. 100% secure.",
    teamManagement: "Team Management & Roles",
    teamManagementDesc: "Invite staff, assign Manager or Cashier roles, and control page access. Track pending setup, active accounts, and deactivated members in one place.",
    offersFeature: "Offers & Promotions",
    offersFeatureDesc: "Create discount offers in minutes, schedule start and end time, and attract more repeat customers with targeted deals.",
    realTimeChat: "Push Alerts & Notifications",
    realTimeChatDesc: "Low stock, credit sales, ledger payments, staff activation, and attendance updates—delivered instantly to the right people in your team.",

    testimonialQuote: "\"Pocket POS saved me hours every week. Managing my credit accounts (Khata) used to be a headache, now it's just a tap away. It’s the best help my shop ever had.\"",
    testimonialAuthor: "Ravi Sharma",
    testimonialShop: "Sharma General Store, Kochi",
    
    pricingTitle: "Fair Pricing for Every Shop",
    pricingSubtitle: "Pick the plan that fits your size. No hidden tricks, just clear tools to help you grow.",
    pricingTrialNote: "Try your trial for just ₹1 — a one-time verification charge. No hidden fees.",
    basicPlan: "Small Shop",
    proPlan: "Growing Business",
    premiumPlan: "Big Enterprise",
    basicDesc: "Essential tools for single outlets.",
    proDesc: "Advanced automation for serious growth.",
    premiumDesc: "The complete solution for multi-store chains.",
    recommended: "MOST POPULAR",
    selectBasic: "Start Basic",
    choosePro: "Upgrade to Pro",
    choosePremium: "Get in touch",
    unlimitedTxn: "Unlimited Billing",
    user3: "3 Staff User accounts",
    userUnlimited: "Unlimited Staff & Managers",
    fullInv: "Standard Inventory",
    fullInvBulk: "Smart Stock & Auto-PO",
    khataFull: "Full Digital Khata",
    salesReports: "Sales reports",
    khataSMS: "Auto SMS Payment Reminders",
    multiStore: "Up to 5 Store Locations",
    prioritySupport: "24/7 Priority Support",
    employeeAuditLogs: "Employee Audit Logs",
    multishopManagement: "Multishop management",
    upTo10Outlets: "Up to 5 outlets management",
    allIncluded: "All features included",
    basicExcluded2: "Multi-outlet real-time chat",
    basicExcluded3: "Auto SMS Payment Reminders",
    basicExcluded4: "Multishop management",
    basicExcluded5: "Supplier Management",
    offlineBillingFeature: "Offline billing with auto-sync",
    teamShiftFeature: "Work shifts & punch-in alerts",
    multiOutletChatFeature: "Multi-outlet real-time chat",
    salarySettlementFeature: "Salary reports & mark settlement",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    support: "Help & Support",
    copyright: "2026 Pocket POS. All rights reserved.",
    affiliate: "Earn with Us",
    renewStore: "Restart existing store subscription",
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

const LandingPage = ({ onStartApp, onSelectPlan, onRenewSubscription, onViewTerms, onViewPolicy, onViewSupport, onViewAffiliate, scrollToPricing, darkMode = true, setDarkMode }) => {
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
                    border-color: ${darkMode ? 'rgba(79, 70, 229, 0.45)' : 'rgba(79, 70, 229, 0.35)'};
                    transform: translateY(-8px);
                    background: ${darkMode ? 'rgba(31, 41, 55, 0.8)' : 'rgba(238, 242, 255, 0.95)'};
                    box-shadow: ${darkMode ? '0 14px 30px rgba(17, 24, 39, 0.35)' : '0 14px 30px rgba(79, 70, 229, 0.14)'};
                }
            `}} />

            <nav className={`fixed top-0 left-0 right-0 z-50 ${navBg} backdrop-blur-md border-b ${navBorder} transition-colors duration-300`}>
                <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-white" />
                        </div>
                        <span className={`text-xl font-black ${titleColor} tracking-tighter transition-colors duration-300`}>Pocket <span className="text-indigo-500">POS</span></span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <ThemeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
                        <button onClick={onStartApp} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black  tracking-widest py-2.5 px-6 rounded-2xl transition-all active:scale-95 shadow-lg shadow-indigo-500/20">
                            {content.getStarted}
                        </button>
                    </div>
                </div>
            </nav>

            <main className="pt-16">
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
                <section id="features" className={`pt-24 pb-12 ${bgColor} transition-colors duration-300`}>
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="text-center mb-12">
                            <h2 className={`text-3xl md:text-5xl font-black ${titleColor}  tracking-tighter mb-4 transition-colors duration-300`}>{content.featuresTitle}</h2>
                            <p className={`${descColor} font-bold max-w-3xl mx-auto transition-colors duration-300`}>{content.featuresSubtitle}</p>
                        </div>

                        <div className="mb-16">
                            <div className="text-center mb-10">
                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400 mb-2">{content.highlightsTitle}</p>
                                <p className={`${subtitleColor} text-sm font-bold max-w-2xl mx-auto`}>{content.highlightsSubtitle}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <FeatureItem
                                    icon={<WifiOff />}
                                    title={content.offlineBilling}
                                    desc={content.offlineBillingDesc}
                                    color="indigo"
                                    darkMode={darkMode}
                                />
                                <FeatureItem icon={<Building2 />} title={content.multiOutletChat} desc={content.multiOutletChatDesc} color="cyan" darkMode={darkMode} />
                                <FeatureItem icon={<Clock />} title={content.teamShifts} desc={content.teamShiftsDesc} color="rose" darkMode={darkMode} />
                                <FeatureItem icon={<Wallet />} title={content.salaryPayroll} desc={content.salaryPayrollDesc} color="emerald" darkMode={darkMode} />
                                <FeatureItem icon={<Receipt />} title={content.fastPOS} desc={content.fastPOSDesc} color="indigo" darkMode={darkMode} />
                                <FeatureItem icon={<Package />} title={content.stockControl} desc={content.stockControlDesc} color="teal" darkMode={darkMode} />
                                <FeatureItem icon={<Truck />} title={content.supplyChain} desc={content.supplyChainDesc} color="amber" darkMode={darkMode} />
                                <FeatureItem icon={<Users />} title={content.khata} desc={content.khataDesc} color="emerald" darkMode={darkMode} />
                                <FeatureItem icon={<LineChart />} title={content.reports} desc={content.reportsDesc} color="purple" darkMode={darkMode} />
                                <FeatureItem icon={<UserCog />} title={content.teamManagement} desc={content.teamManagementDesc} color="rose" darkMode={darkMode} />
                                <FeatureItem icon={<Bell />} title={content.offersFeature} desc={content.offersFeatureDesc} color="pink" darkMode={darkMode} />
                                <FeatureItem icon={<Bell />} title={content.realTimeChat} desc={content.realTimeChatDesc} color="orange" darkMode={darkMode} />
                                <FeatureItem icon={<RefreshCw />} title={content.cloudSync} desc={content.cloudSyncDesc} color="blue" darkMode={darkMode} />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Pricing - Using Suggested Strategy */}
                <section id="pricing" className="pt-12 pb-24">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="text-center mb-16">
                            <h2 className={`text-3xl md:text-5xl font-black ${titleColor}  tracking-tighter mb-4 transition-colors duration-300`}>{content.pricingTitle}</h2>
                            <p className={`${descColor} font-bold transition-colors duration-300`}>{content.pricingSubtitle}</p>
                            <p className={`mt-4 text-sm font-bold ${darkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>{content.pricingTrialNote}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <PriceCard 
                                plan={content.basicPlan} 
                                price="499" 
                                desc={content.basicDesc} 
                                items={[content.unlimitedTxn, content.user3, content.fullInv, content.khataFull, content.salesReports, content.employeeAuditLogs]} 
                                excludedItems={[content.basicExcluded5, content.basicExcluded2, content.basicExcluded3, content.basicExcluded4]}
                                btn={content.selectBasic} 
                                onSelect={() => onSelectPlan('BASIC')} 
                                darkMode={darkMode}
                            />
                            <PriceCard 
                                plan={content.proPlan} 
                                price="999" 
                                featured={true}
                                desc={content.proDesc} 
                                items={[content.unlimitedTxn, content.userUnlimited, content.fullInvBulk, content.khataSMS, "Supplier Management", content.salesReports, content.offlineBillingFeature, content.teamShiftFeature, content.multiOutletChatFeature, content.employeeAuditLogs]} 
                                excludedItems={[content.basicExcluded4, content.salarySettlementFeature]}
                                btn={content.choosePro} 
                                onSelect={() => onSelectPlan('PRO')} 
                                darkMode={darkMode}
                            />
                            <PriceCard 
                                plan={content.premiumPlan} 
                                price="2999" 
                                desc={content.premiumDesc} 
                                items={[content.unlimitedTxn, content.userUnlimited, content.fullInvBulk, content.khataSMS, "Supplier Management", content.salesReports, content.offlineBillingFeature, content.teamShiftFeature, content.multiOutletChatFeature, content.salarySettlementFeature, content.employeeAuditLogs, content.multishopManagement, content.upTo10Outlets]} 
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
                        {onRenewSubscription && (
                            <FooterLink onClick={onRenewSubscription} label={content.renewStore} darkMode={darkMode} />
                        )}
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
    <div className={`feature-card h-full ${cardBg} p-8 rounded-[2rem] transition-colors duration-300`}>
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

const PriceCard = ({ plan, price, desc, items, excludedItems = [], btn, featured, onSelect, darkMode = true }) => {
    const cardBg = darkMode ? (featured ? 'bg-indigo-600' : 'bg-gray-900') : (featured ? 'bg-indigo-600' : 'bg-white');
    const cardBorder = darkMode ? (featured ? 'border-indigo-400' : 'border-gray-800') : (featured ? 'border-indigo-400' : 'border-slate-300');
    const cardHover = darkMode ? 'hover:border-gray-700' : 'hover:border-slate-400';
    const textColor = featured ? 'text-white' : (darkMode ? 'text-white' : 'text-slate-900');
    const descColor = featured ? 'text-indigo-100' : (darkMode ? 'text-gray-500' : 'text-slate-600');
    const itemColor = featured ? 'text-white' : (darkMode ? 'text-gray-300' : 'text-slate-700');
    const excludedColor = darkMode ? 'text-gray-500' : 'text-slate-400';
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
                    <CheckCircle2 className={`w-4 h-4 mr-3 shrink-0 ${featured ? 'text-teal-300' : 'text-indigo-500'}`} /> {item}
                </li>
            ))}
            {excludedItems.map((item, i) => (
                <li key={`excluded-${i}`} className={`flex items-center text-xs font-bold ${excludedColor} transition-colors duration-300 line-through`}>
                    <XCircle className="w-4 h-4 mr-3 shrink-0 opacity-70" aria-hidden /> {item}
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