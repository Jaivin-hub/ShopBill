import React from 'react'

const StatCard = ({ title, value, unit, icon: Icon, colorClass }) => (
  <article className="bg-gray-900/40 p-4 rounded-xl shadow-lg shadow-indigo-900/10 flex items-center justify-between transition duration-300 hover:shadow-2xl border border-gray-800" itemScope itemType="https://schema.org/QuantitativeValue">
    <div className="flex flex-col">
      <p className="text-sm font-medium text-gray-400" itemProp="name">{title}</p>
      <div className="flex items-baseline mt-1">
        <h3 className={`text-2xl font-bold ${colorClass}`} itemProp="value">{unit}{value}</h3>
      </div>
    </div>
    
    <div className={`p-3 rounded-full ${colorClass} bg-opacity-10`}>
      <Icon className={`w-6 h-6 ${colorClass}`} aria-hidden="true" />
    </div>
  </article>
);

export default StatCard