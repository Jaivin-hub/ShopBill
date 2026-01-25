import React, { useState } from 'react';
import { 
    Store, Plus, MapPin, Phone, 
    MoreVertical, Power, Edit3, Trash2, 
    ArrowUpRight, Building2, ShieldCheck
} from 'lucide-react';

const StoreControl = ({ darkMode, stores = [], onAddStore, onUpdateStore, onDeleteStore }) => {
    const [isAdding, setIsAdding] = useState(false);

    // Styling logic
    const cardBase = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
    const subText = darkMode ? 'text-slate-400' : 'text-slate-500';

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <button 
                    onClick={() => setIsAdding(true)}
                    className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-black text-xs tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
                >
                    <Plus size={16} /> ADD NEW BRANCH
                </button>
            </div>

            {/* Store Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stores.map((store) => (
                    <div key={store.id} className={`p-5 rounded-3xl border transition-all group ${cardBase}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-2xl ${store.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>
                                    <Store size={20} />
                                </div>
                                <div>
                                    <h3 className="font-black text-sm tracking-tight">{store.name}</h3>
                                    <div className="flex items-center gap-1 opacity-60">
                                        <MapPin size={10} />
                                        <span className="text-[10px] font-bold">{store.location}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${
                                    store.isActive 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                    : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                }`}>
                                    {store.isActive ? 'OPERATIONAL' : 'INACTIVE'}
                                </span>
                                <button className={`p-1.5 rounded-lg border border-transparent hover:border-inherit ${subText}`}>
                                    <MoreVertical size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className={`p-3 rounded-2xl border ${darkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                                <p className="text-[9px] font-black text-slate-500 mb-1">TOTAL STAFF</p>
                                <p className="text-sm font-black">{store.staffCount} Members</p>
                            </div>
                            <div className={`p-3 rounded-2xl border ${darkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                                <p className="text-[9px] font-black text-slate-500 mb-1">DAILY SALES</p>
                                <p className="text-sm font-black text-emerald-500">₹{store.todaySales}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-500/10 text-[10px] font-black tracking-widest hover:bg-slate-500/20 transition-all">
                                <Edit3 size={14} /> EDIT
                            </button>
                            <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-indigo-500/10 text-indigo-500 text-[10px] font-black tracking-widest hover:bg-indigo-500/20 transition-all">
                                <ArrowUpRight size={14} /> VIEW HUB
                            </button>
                        </div>
                    </div>
                ))}

                {/* Empty State / Add Placeholder */}
                <button 
                    onClick={() => setIsAdding(true)}
                    className="p-8 rounded-3xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center gap-3 opacity-40 hover:opacity-100 transition-all"
                >
                    <div className="p-3 rounded-full bg-slate-800">
                        <Building2 size={24} />
                    </div>
                    <p className="text-xs font-black tracking-widest">EXPAND BUSINESS</p>
                </button>
            </div>

            {/* Premium Badge */}
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-600/5 border border-indigo-500/20">
                <ShieldCheck className="text-indigo-500" size={20} />
                <div>
                    <p className="text-[10px] font-black text-indigo-500 tracking-[0.1em]">PREMIUM FEATURE ACTIVE</p>
                    <p className={`text-[10px] ${subText}`}>You can add up to 10 store locations under your current enterprise plan.</p>
                </div>
            </div>
        </div>
    );
};

export default StoreControl;


