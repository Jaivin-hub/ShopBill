import React, { useRef, useEffect } from 'react';
import { CreditCard, Receipt, Package, Users, LineChart, UserCog, Cloud } from 'lucide-react';
import coverImage from '../../public/covermain.png';

const content = {
    tagline: "#1 Retail Management Tool",
    title: "Your Shop, Fully Managed. Right in your Pocket",
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
    user2: "2 Users (Owner + 1 Cashier)",
    userUnlimited: "Unlimited Users & Roles",
    fullInv: "Full Inventory Management",
    fullInvBulk: "Full Inventory & Bulk Tools",
    khataFull: "Full Digital Khata Ledger",
    khataSMS: "Khata + Automated SMS Reminders",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    support: "Support",
    copyright: "2025 Pocket POS. All rights reserved.",
    affiliate: "Affiliate Program"
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

    // Structured Data for Landing Page
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Pocket POS",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web, iOS, Android",
        "offers": [
            {
                "@type": "Offer",
                "name": "Basic Plan",
                "price": "499",
                "priceCurrency": "INR",
                "priceValidUntil": "2025-12-31",
                "description": "Best for single outlets and small teams"
            },
            {
                "@type": "Offer",
                "name": "Pro Plan",
                "price": "799",
                "priceCurrency": "INR",
                "priceValidUntil": "2025-12-31",
                "description": "Ideal for multiple outlets and high-growth businesses"
            },
            {
                "@type": "Offer",
                "name": "Premium Plan",
                "price": "999",
                "priceCurrency": "INR",
                "priceValidUntil": "2025-12-31",
                "description": "Perfect for large businesses with advanced needs"
            }
        ],
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "ratingCount": "1250",
            "bestRating": "5",
            "worstRating": "1"
        },
        "description": "Pocket POS transforms your smartphone into a powerful Point of Sale and Business Manager. Features include lightning-fast billing, real-time inventory management, digital Khata ledger, GST billing, business reports, and staff management.",
        "screenshot": "https://yourdomain.com/covermain.png",
        "featureList": [
            "Lightning-Fast POS Billing",
            "Real-Time Inventory Management",
            "Digital Khata (Credit Ledger)",
            "Business Reports & Analytics",
            "Staff & Permissions Management",
            "Secure Cloud Sync",
            "Offline Mode Support",
            "GST Billing Support"
        ]
    };

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
            <div className="min-h-screen bg-gray-950 scroll-smooth text-gray-300 font-sans" itemScope itemType="https://schema.org/WebPage">
            <style jsx="true" global="true">{`
                :root {
                    --color-primary: #818cf8;
                    --color-secondary: #2dd4bf;
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

            <nav className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-sm shadow-xl shadow-indigo-900/10" role="navigation" aria-label="Main Navigation">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <a href="/" className="flex items-center space-x-2" title="Pocket POS Home">
                            <CreditCard className="w-6 h-6 text-indigo-400" aria-hidden="true" />
                            <span className="text-xl font-bold text-white">Pocket POS</span>
                        </a>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={onStartApp}
                                aria-label="Login to your account"
                                className="bg-indigo-600 text-white cursor-pointer text-sm font-semibold py-2 px-6 rounded-full shadow-lg hover:bg-indigo-700 transition duration-300">
                                {content.getStarted}
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main>
                {/* Hero Section */}
                <section className="py-12 md:py-24 bg-gray-950" aria-labelledby="hero-heading">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <span className="inline-block text-sm font-semibold text-teal-400 uppercase tracking-widest bg-teal-900/50 px-3 py-1 rounded-full mb-3 border border-teal-700/50">
                            {content.tagline}
                        </span>
                        <h1 id="hero-heading" className="hero-title text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tighter mb-4 text-white">
                            {renderTitle(content.title, gradientWord)}
                        </h1>
                        <p className="mt-4 text-lg text-gray-400 max-w-3xl mx-auto mb-8">
                            {content.subtitle}
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                            <a
                                href="#pricing"
                                className="w-full sm:w-auto px-8 py-3 bg-indigo-600 text-white text-lg font-bold rounded-xl shadow-xl hover:bg-indigo-700 transition transform hover:scale-[1.02] duration-300 ease-in-out">
                                {content.startTrial}
                            </a>
                            <a href="#features" className="w-full sm:w-auto px-8 py-3 bg-gray-800 text-indigo-400 text-lg font-bold rounded-xl border-2 border-indigo-900 hover:bg-gray-700 transition duration-300">
                                {content.exploreFeatures}
                            </a>
                        </div>
                        <div className="mt-12" itemScope itemType="https://schema.org/ImageObject">
                            <img
                                src={coverImage}
                                alt="Pocket POS Application Dashboard Preview showing inventory management, sales analytics, billing interface, and digital Khata ledger for retail businesses in India"
                                width="1200"
                                height="630"
                                loading="eager"
                                itemProp="contentUrl"
                                className="mx-auto rounded-xl shadow-[0_25px_50px_-12px_rgba(79,70,229,0.3)] border-4 border-gray-800 transform rotate-1 transition duration-500 ease-in-out hover:rotate-0 hover:scale-100"
                            />
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="py-16 bg-gray-950" aria-labelledby="features-heading">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 id="features-heading" className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
                                {content.featuresTitle}
                            </h2>
                            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                                {content.featuresSubtitle}
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <article className="feature-card bg-gray-800 p-6 rounded-xl shadow-lg border border-indigo-900/50 hover:shadow-2xl" itemScope itemType="https://schema.org/SoftwareFeature">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 inline-flex items-center justify-center rounded-full bg-indigo-900/50 text-indigo-400">
                                        <Receipt className="w-6 h-6" aria-hidden="true" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white" itemProp="name">{content.fastPOS}</h3>
                                </div>
                                <p className="text-gray-400" itemProp="description">{content.fastPOSDesc}</p>
                            </article>
                            <article className="feature-card bg-gray-800 p-6 rounded-xl shadow-lg border border-teal-900/50 hover:shadow-2xl">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 inline-flex items-center justify-center rounded-full bg-teal-900/50 text-teal-400">
                                        <Package className="w-6 h-6" aria-hidden="true" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">{content.stockControl}</h3>
                                </div>
                                <p className="text-gray-400">{content.stockControlDesc}</p>
                            </article>
                            <article className="feature-card bg-gray-800 p-6 rounded-xl shadow-lg border border-amber-900/50 hover:shadow-2xl">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 inline-flex items-center justify-center rounded-full bg-amber-900/50 text-amber-400">
                                        <Users className="w-6 h-6" aria-hidden="true" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">{content.khata}</h3>
                                </div>
                                <p className="text-gray-400">{content.khataDesc}</p>
                            </article>
                            <article className="feature-card bg-gray-800 p-6 rounded-xl shadow-lg border border-purple-900/50 hover:shadow-2xl">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 inline-flex items-center justify-center rounded-full bg-purple-900/50 text-purple-400">
                                        <LineChart className="w-6 h-6" aria-hidden="true" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">{content.reports}</h3>
                                </div>
                                <p className="text-gray-400">{content.reportsDesc}</p>
                            </article>
                            <article className="feature-card bg-gray-800 p-6 rounded-xl shadow-lg border border-pink-900/50 hover:shadow-2xl">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 inline-flex items-center justify-center rounded-full bg-pink-900/50 text-pink-400">
                                        <UserCog className="w-6 h-6" aria-hidden="true" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">{content.staff}</h3>
                                </div>
                                <p className="text-gray-400">{content.staffDesc}</p>
                            </article>
                            <article className="feature-card bg-gray-800 p-6 rounded-xl shadow-lg border border-blue-900/50 hover:shadow-2xl">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 inline-flex items-center justify-center rounded-full bg-blue-900/50 text-blue-400">
                                        <Cloud className="w-6 h-6" aria-hidden="true" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">{content.cloudSync}</h3>
                                </div>
                                <p className="text-gray-400">{content.cloudSyncDesc}</p>
                            </article>
                        </div>
                    </div>
                </section>

                {/* Testimonial */}
                <section className="py-16 md:py-20 bg-indigo-700">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <blockquote className="text-white">
                            <p className="text-2xl md:text-3xl font-medium leading-relaxed italic">
                                {content.testimonialQuote}
                            </p>
                            <footer className="mt-8">
                                <cite className="text-lg font-semibold text-indigo-200 not-italic">
                                    {content.testimonialAuthor}
                                </cite>
                                <p className="text-sm text-indigo-300">
                                    {content.testimonialShop}
                                </p>
                            </footer>
                        </blockquote>
                    </div>
                </section>

                {/* Pricing Section */}
                <section id="pricing" className="py-16 md:py-20 bg-gray-950" aria-labelledby="pricing-heading" itemScope itemType="https://schema.org/OfferCatalog">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h2 id="pricing-heading" className="text-3xl sm:text-4xl font-extrabold text-white mb-4" itemProp="name">
                            {content.pricingTitle}
                        </h2>
                        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10" itemProp="description">
                            {content.pricingSubtitle}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto" itemProp="itemListElement" itemScope itemType="https://schema.org/Offer">
                            {/* Basic Plan */}
                            <div className="bg-gray-800 text-gray-300 p-8 rounded-2xl shadow-xl border-2 border-gray-700/50 hover:border-indigo-600 transition duration-300" itemScope itemType="https://schema.org/Offer">
                                <h3 className="text-2xl font-bold mb-2 text-white" itemProp="name">{content.basicPlan}</h3>
                                <p className="text-gray-400 text-sm" itemProp="description">{content.basicDesc}</p>
                                <div className="my-6" itemProp="priceSpecification" itemScope itemType="https://schema.org/UnitPriceSpecification">
                                    <span className="text-5xl font-extrabold text-white" itemProp="price">499</span>
                                    <meta itemProp="priceCurrency" content="INR" />
                                    <span className="text-xl font-medium text-gray-400">/month</span>
                                </div>
                                <ul className="text-left space-y-3 mb-8 text-gray-300">
                                    <li className="flex items-center"><Package className="w-5 h-5 mr-2 text-teal-400" aria-hidden="true" /> {content.unlimitedTxn}</li>
                                    <li className="flex items-center"><Package className="w-5 h-5 mr-2 text-teal-400" aria-hidden="true" /> {content.user2}</li>
                                    <li className="flex items-center"><Package className="w-5 h-5 mr-2 text-teal-400" aria-hidden="true" /> {content.fullInv}</li>
                                    <li className="flex items-center"><Package className="w-5 h-5 mr-2 text-teal-400" aria-hidden="true" /> {content.khataFull}</li>
                                </ul>
                                <button onClick={() => onSelectPlan('BASIC')} className="block cursor-pointer w-full py-3 bg-indigo-600 text-white text-lg font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition duration-300">{content.selectBasic}</button>
                            </div>

                            {/* Pro Plan */}
                            <div className="bg-gray-800 text-gray-300 p-8 rounded-2xl shadow-xl border-2 border-gray-700/50 hover:border-indigo-600 transition duration-300" itemScope itemType="https://schema.org/Offer">
                                <h3 className="text-2xl font-bold mb-2 text-white" itemProp="name">{content.proPlan}</h3>
                                <p className="text-gray-400 text-sm" itemProp="description">{content.proDesc}</p>
                                <div className="my-6" itemProp="priceSpecification" itemScope itemType="https://schema.org/UnitPriceSpecification">
                                    <span className="text-5xl font-extrabold text-white" itemProp="price">799</span>
                                    <meta itemProp="priceCurrency" content="INR" />
                                    <span className="text-xl font-medium text-gray-400">/month</span>
                                </div>
                                <ul className="text-left space-y-3 mb-8 text-gray-300">
                                    <li className="flex items-center"><Package className="w-5 h-5 mr-2 text-teal-400" aria-hidden="true" /> {content.unlimitedTxn}</li>
                                    <li className="flex items-center"><Package className="w-5 h-5 mr-2 text-teal-400" aria-hidden="true" /> {content.userUnlimited}</li>
                                    <li className="flex items-center"><Package className="w-5 h-5 mr-2 text-teal-400" aria-hidden="true" /> {content.fullInvBulk}</li>
                                    <li className="flex items-center"><Package className="w-5 h-5 mr-2 text-teal-400" aria-hidden="true" /> {content.khataSMS}</li>
                                </ul>
                                <button onClick={() => onSelectPlan('PRO')} className="block cursor-pointer w-full py-3 bg-indigo-600 text-white text-lg font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition duration-300">{content.choosePro}</button>
                            </div>

                            {/* Premium Plan */}
                            <div className="bg-indigo-600 text-white p-8 rounded-2xl shadow-[0_25px_50px_-12px_rgba(79,70,229,0.5)] border-4 border-indigo-400 transform scale-100 lg:scale-[1.05] lg:relative lg:-top-3 transition duration-300" itemScope itemType="https://schema.org/Offer">
                                <div className="absolute top-0 right-0 -mt-3 -mr-3 bg-teal-400 text-gray-900 text-xs font-bold py-1 px-3 rounded-full shadow-md">{content.recommended}</div>
                                <h3 className="text-2xl font-bold mb-2" itemProp="name">{content.premiumPlan}</h3>
                                <p className="text-indigo-200 text-sm" itemProp="description">{content.premiumDesc}</p>
                                <div className="my-6" itemProp="priceSpecification" itemScope itemType="https://schema.org/UnitPriceSpecification">
                                    <span className="text-5xl font-extrabold text-white" itemProp="price">999</span>
                                    <meta itemProp="priceCurrency" content="INR" />
                                    <span className="text-xl font-medium text-indigo-200">/month</span>
                                </div>
                                <ul className="text-left space-y-3 mb-8 text-indigo-100">
                                    <li className="flex items-center"><Package className="w-5 h-5 mr-2 text-white" aria-hidden="true" /> {content.unlimitedTxn}</li>
                                    <li className="flex items-center"><Package className="w-5 h-5 mr-2 text-white" aria-hidden="true" /> {content.userUnlimited}</li>
                                    <li className="flex items-center"><Package className="w-5 h-5 mr-2 text-white" aria-hidden="true" /> {content.fullInvBulk}</li>
                                    <li className="flex items-center"><Package className="w-5 h-5 mr-2 text-white" aria-hidden="true" /> {content.khataSMS}</li>
                                </ul>
                                <button onClick={() => onSelectPlan('PREMIUM')} className="block cursor-pointer w-full py-3 bg-white text-indigo-700 text-lg font-bold rounded-xl shadow-lg hover:bg-gray-100 transition duration-300">{content.choosePremium}</button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="bg-gray-900 border-t border-gray-800 py-8" role="contentinfo">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500">
                    <nav className="mb-4" aria-label="Footer Navigation">
                        <button onClick={onViewPolicy} className="text-indigo-400 hover:text-indigo-300 mx-3">{content.privacy}</button>
                        <button onClick={onViewTerms} className="text-indigo-400 hover:text-indigo-300 mx-3">{content.terms}</button>
                        <button onClick={onViewSupport} className="text-indigo-400 hover:text-indigo-300 mx-3">{content.support}</button>
                        <button onClick={onViewAffiliate} className="text-indigo-400 hover:text-indigo-300 mx-3">{content.affiliate}</button>
                    </nav>
                    <p>&copy; {content.copyright}</p>
                </div>
            </footer>
        </div>
        </>
    );
};

export default LandingPage;