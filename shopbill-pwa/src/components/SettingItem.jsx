import React from 'react'
import {ChevronRight} from 'lucide-react'

const SettingItem = ({ icon: Icon, title, description, onClick, actionComponent }) => (
    <article 
        className={`flex items-center justify-between p-4 border-b border-gray-700 transition-colors ${onClick ? 'cursor-pointer hover:bg-gray-700/50' : ''}`}
        onClick={onClick}
        itemScope
        itemType="https://schema.org/ListItem"
    >
        <div className="flex items-center">
            <Icon className="w-6 h-6 mr-4 text-indigo-400 flex-shrink-0" aria-hidden="true" />
            <div>
                <p className="font-semibold text-gray-100" itemProp="name">{title}</p>
                {/* Hide description on smallest screens for cleaner look */}
                <p className="text-sm text-gray-400 mt-0.5 hidden sm:block" itemProp="description">{description}</p>
            </div>
        </div>
        {actionComponent || (onClick && <ChevronRight className="w-5 h-5 text-gray-400" aria-hidden="true" />)}
    </article>
);

export default SettingItem