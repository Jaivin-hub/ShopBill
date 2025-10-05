import React from 'react'

const StatCard = ({ title, value, unit, icon: Icon, colorClass }) => (
  // 1. Update background, shadow, and border for dark mode
  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg dark:shadow-2xl flex items-center justify-between transition duration-300 hover:shadow-xl dark:hover:shadow-3xl border border-gray-100 dark:border-gray-700">
    <div className="flex flex-col">
      {/* 2. Update title text color */}
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <div className="flex items-baseline mt-1">
        {/* Value and unit use the dynamic colorClass, which is fine */}
        <h3 className={`text-2xl font-bold ${colorClass}`}>{unit}{value}</h3>
      </div>
    </div>
    
    {/* 3. Update icon container background for dark mode (using color-specific dark variant) */}
    <div className={`p-3 rounded-full ${colorClass} bg-opacity-10 dark:bg-opacity-20`}>
      {/* Icon uses the dynamic colorClass, which is fine */}
      <Icon className={`w-6 h-6 ${colorClass}`} />
    </div>
  </div>
);

export default StatCard