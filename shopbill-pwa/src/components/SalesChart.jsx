import React from 'react'
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Define the configurations for the two potential charts
const CHART_CONFIG = {
    revenue: {
        yAxisId: 'left',
        dataKey: 'revenue',
        name: 'Revenue (₹)',
        color: '#4f46e5', // indigo-600
        formatter: (value) => `₹${value.toLocaleString('en-IN')}`,
        // Using 'bills' from the sample response, but rename it to 'transactions' for clarity in the UI
        transactionDataKey: 'bills',
        transactionName: 'Transactions',
        transactionColor: '#10b981' // green-600
    },
    bills: {
        yAxisId: 'left', // Use the primary axis for this one too
        dataKey: 'bills',
        name: 'Transactions',
        color: '#10b981', // green-600
        formatter: (value) => value.toLocaleString(),
        // We still include revenue as a secondary, smaller bar for context
        secondaryDataKey: 'revenue',
        secondaryName: 'Revenue (₹)',
        secondaryColor: '#9ca3af' // gray-400
    }
};


// Component receives the data, viewType, and the new yAxisKey from Reports.js
const SalesChart = ({ data, viewType, yAxisKey }) => {
    const isMobile = window.innerWidth < 768; 
    
    // Determine which key is primary for the main visualization
    const primaryConfig = CHART_CONFIG[yAxisKey] || CHART_CONFIG.revenue;
    const secondaryConfig = yAxisKey === 'revenue' ? { 
        dataKey: primaryConfig.transactionDataKey, 
        name: primaryConfig.transactionName, 
        color: primaryConfig.transactionColor,
        yAxisId: 'right' // Use the right axis for the secondary data
    } : {
        dataKey: primaryConfig.secondaryDataKey,
        name: primaryConfig.secondaryName,
        color: primaryConfig.secondaryColor,
        yAxisId: 'right' // Use the right axis for the secondary data
    };

    // Formatter function for the Tooltip
    const tooltipFormatter = (value, name, props) => {
        // Use IN currency format for revenue, or just number format for transactions/bills
        if (name.includes('Revenue') || props.dataKey === 'revenue') {
            return [`₹${value.toLocaleString('en-IN')}`, name];
        }
        return [value.toLocaleString(), name];
    };
    
    // Filter out data points where both primary and secondary values are zero to prevent misleading charts (optional but good practice)
    const filteredData = data.filter(d => d[primaryConfig.dataKey] > 0 || d[secondaryConfig.dataKey] > 0);
    if (filteredData.length === 0) return <p className="text-center text-gray-500 py-12">No data available for the selected period.</p>;

    return (
        <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
            <RechartsBarChart
                data={filteredData}
                margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" className="dark:stroke-gray-700" />
                <XAxis dataKey="name" stroke="#6b7280" className="dark:text-gray-400 text-xs" />
                
                {/* Primary Y-Axis (Left) */}
                <YAxis 
                    yAxisId="left" 
                    stroke={primaryConfig.color} 
                    className="dark:text-gray-400 text-xs"
                    tickFormatter={primaryConfig.formatter}
                />
                
                {/* Secondary Y-Axis (Right) */}
                <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    stroke={secondaryConfig.color} 
                    className="dark:text-gray-400 text-xs"
                />
                
                <Tooltip
                    contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                        border: '1px solid #ccc', 
                        borderRadius: '8px',
                        padding: '8px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)' 
                    }}
                    labelStyle={{ fontWeight: 'bold', color: '#1f2937' }}
                    formatter={tooltipFormatter}
                />
                
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                
                {/* PRIMARY BAR: The one the user selected (Revenue or Bills) */}
                <Bar 
                    yAxisId="left" 
                    dataKey={primaryConfig.dataKey} 
                    name={primaryConfig.name} 
                    fill={primaryConfig.color} 
                    radius={[4, 4, 0, 0]}
                />
                
                {/* SECONDARY BAR: The other metric, for context (e.g., bills if revenue is primary) */}
                <Bar 
                    yAxisId="right" 
                    dataKey={secondaryConfig.dataKey} 
                    name={secondaryConfig.name} 
                    fill={secondaryConfig.color} 
                    radius={[4, 4, 0, 0]} 
                    opacity={0.6} // Make it slightly transparent
                />
            </RechartsBarChart>
        </ResponsiveContainer>
    );
};

export default SalesChart