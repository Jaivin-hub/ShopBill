import React from 'react'
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Define the configurations for the two potential charts
const CHART_CONFIG = {
    revenue: {
        yAxisId: 'left',
        dataKey: 'revenue',
        name: 'Revenue (₹)',
        color: '#4f46e5', // indigo-600
        formatter: (value) => `₹${value.toLocaleString('en-IN', { notation: 'compact' })}`, // Added compact notation for Y-axis
        transactionDataKey: 'bills',
        transactionName: 'Transactions',
        transactionColor: '#10b981' // green-600
    },
    bills: {
        yAxisId: 'left', // Use the primary axis for this one too
        dataKey: 'bills',
        name: 'Transactions',
        color: '#10b981', // green-600
        formatter: (value) => value.toLocaleString('en-IN', { notation: 'compact' }),
        secondaryDataKey: 'revenue',
        secondaryName: 'Revenue (₹)',
        secondaryColor: '#9ca3af' // gray-400
    }
};

// --- NEW HELPER FUNCTION: Maps backend ID to a readable label ---
const getChartLabel = (viewType, id) => {
    if (viewType === 'Month') {
        const date = new Date(2000, id - 1, 1); // Use a dummy year
        return date.toLocaleString('en-US', { month: 'short' }); // e.g., '10' -> 'Oct'
    } 
    if (viewType === 'Week') {
        return `Wk ${id}`; // e.g., '39' -> 'Wk 39'
    }
    // For 'Day' (which is actually dayOfYear in the backend)
    // NOTE: If you pass actual dates to the backend, you should use that date string here.
    // Since the backend returns dayOfYear, we'll just show the number for now.
    // If your backend changes to return a formatted date string, this needs adjustment.
    return id; // e.g., '278'
};

// Component receives the data, viewType, and the new yAxisKey from Reports.js
const SalesChart = ({ data, viewType, yAxisKey }) => {
    const isMobile = window.innerWidth < 768; 
    
    // Determine the dynamic X-Axis data key based on viewType
    const xAxisDataKey = viewType; // Will be 'Day', 'Week', or 'Month'
    
    // Map the raw data to include a formatted label for the X-Axis
    const processedData = data.map(d => ({
        ...d,
        // The label value is stored under the key name 'Day', 'Week', or 'Month'
        labelValue: d[xAxisDataKey], 
        // Create the user-friendly label for display
        label: getChartLabel(viewType, d[xAxisDataKey]),
    }));
    

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
    
    // Filter out data points where both primary and secondary values are zero
    const filteredData = processedData.filter(d => d[primaryConfig.dataKey] > 0 || d[secondaryConfig.dataKey] > 0);
    
    if (filteredData.length === 0) return <p className="text-center text-gray-500 py-12">No data available for the selected period.</p>;

    return (
        <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
            <RechartsBarChart
                // Use the filtered and processed data
                data={filteredData} 
                margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" className="dark:stroke-gray-700" />
                
                {/* CRITICAL FIX: Use the 'label' key (which we created) for the X-Axis
                  The tickFormatter is not strictly needed anymore since we created the 'label' key.
                */}
                <XAxis 
                    dataKey="label" 
                    stroke="#6b7280" 
                    className="dark:text-gray-400 text-xs" 
                    // To handle many ticks (e.g., daily view)
                    interval="preserveStartEnd" 
                />
                
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
                        backgroundColor: 'rgba(55, 65, 81, 0.9)', // Darker background
                        border: '1px solid #4b5563', // Dark border
                        borderRadius: '8px',
                        padding: '8px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.3)' ,
                        color: '#f9fafb' // Light text
                    }}
                    labelStyle={{ fontWeight: 'bold', color: '#f9fafb' }} // Light label text
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