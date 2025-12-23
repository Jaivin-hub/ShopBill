import React from 'react'

const StatCard = ({ title, value, unit, icon: Icon, colorClass }) => (
  // Updated to permanent dark background (bg-gray-900) and border (border-gray-800)
  <div className="bg-gray-900 p-4 rounded-xl shadow-lg shadow-indigo-900/10 flex items-center justify-between transition duration-300 hover:shadow-2xl border border-gray-800">
    <div className="flex flex-col">
      {/* Updated title to a muted gray-400 for better contrast on dark background */}
      <p className="text-sm font-medium text-gray-400">{title}</p>
      <div className="flex items-baseline mt-1">
        {/* Value and unit use the dynamic colorClass */}
        <h3 className={`text-2xl font-bold ${colorClass}`}>{unit}{value}</h3>
      </div>
    </div>
    
    {/* Icon container uses dark background opacity for a subtle glowing effect */}
    <div className={`p-3 rounded-full ${colorClass} bg-opacity-10`}>
      <Icon className={`w-6 h-6 ${colorClass}`} />
    </div>
  </div>
);

export default StatCard