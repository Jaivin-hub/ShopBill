import React from 'react'
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const SalesChart = ({ data, viewType }) => {
    const isMobile = window.innerWidth < 768; // Simple check for responsiveness

    return (
        <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
            <RechartsBarChart
                data={data}
                margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" className="dark:stroke-gray-700" />
                <XAxis dataKey="name" stroke="#6b7280" className="dark:text-gray-400 text-xs" />
                <YAxis yAxisId="left" stroke="#6b7280" className="dark:text-gray-400 text-xs" />
                <YAxis yAxisId="right" orientation="right" stroke="#6b7280" className="dark:text-gray-400 text-xs" />
                
                <Tooltip
                    contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                        border: '1px solid #ccc', 
                        borderRadius: '8px',
                        padding: '8px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)' 
                    }}
                    labelStyle={{ fontWeight: 'bold', color: '#1f2937' }}
                    formatter={(value, name) => [value.toLocaleString(), name === 'revenue' ? 'Revenue (₹)' : 'Transactions']}
                />
                
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                
                <Bar yAxisId="left" dataKey="revenue" name="Revenue (₹)" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="transactions" name="Transactions" fill="#10b981" radius={[4, 4, 0, 0]} />
            </RechartsBarChart>
        </ResponsiveContainer>
    );
};

export default SalesChart