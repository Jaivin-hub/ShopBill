import React from 'react';
import { ChevronRight } from 'lucide-react';

const SettingItem = ({ 
    icon: Icon, 
    title, 
    description, 
    onClick, 
    actionComponent, 
    accentColor, 
    darkMode 
}) => {
    // Dynamic styles based on theme
    const textColor = darkMode ? 'text-slate-100' : 'text-slate-900';
    const descColor = darkMode ? 'text-slate-400' : 'text-slate-600';
    const borderColor = darkMode ? 'border-slate-800/70' : 'border-slate-200';
    const hoverBg = darkMode ? 'hover:bg-indigo-500/10' : 'hover:bg-indigo-50/60';
    const iconColor = accentColor || 'text-indigo-500';
    const iconWrap = darkMode ? 'bg-slate-900 group-hover:bg-indigo-500/20 border border-slate-800' : 'bg-white group-hover:bg-indigo-50 border border-slate-200';

    return (
        <article 
            className={`flex items-center justify-between p-4 md:p-5 border-b last:border-0 transition-all duration-200 group ${borderColor} ${onClick ? `cursor-pointer ${hoverBg}` : ''}`}
            onClick={onClick}
            itemScope
            itemType="https://schema.org/ListItem"
        >
            <div className="flex items-center gap-4 min-w-0">
                <div className={`p-2.5 rounded-xl transition-colors shrink-0 ${iconWrap}`}>
                    <Icon className={`w-5 h-5 flex-shrink-0 ${iconColor}`} aria-hidden="true" />
                </div>
                
                <div className="flex flex-col min-w-0">
                    <p className={`text-[13px] font-black tracking-tight ${textColor}`} itemProp="name">
                        {title}
                    </p>
                    {/* Description: Forced high visibility for light mode */}
                    <p 
                        className={`text-[11px] font-bold mt-0.5 hidden sm:block leading-tight truncate ${descColor}`} 
                        itemProp="description"
                    >
                        {description}
                    </p>
                </div>
            </div>

            <div className="flex items-center">
                {actionComponent ? (
                    <div className="scale-90 origin-right">
                        {actionComponent}
                    </div>
                ) : (
                    onClick && (
                        <ChevronRight 
                            className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${darkMode ? 'text-gray-600' : 'text-slate-400'}`} 
                            aria-hidden="true" 
                        />
                    )
                )}
            </div>
        </article>
    );
};

export default SettingItem;