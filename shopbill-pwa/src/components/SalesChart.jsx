import React from 'react';
// Import LineChart and Line components instead of BarChart and Bar
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react'; 

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

/**
 * --- HELPER FUNCTION: Maps backend ID to a readable label ---
 * Converts numeric viewType IDs (1-12, 1-52, 1-365) into user-friendly labels.
 * @param {string} viewType - 'Day', 'Week', or 'Month'
 * @param {number|string} id - The ID value from the data (e.g., 10 for October)
 * @returns {string} The formatted label.
 */
const getChartLabel = (viewType, id) => {
    // Ensure ID is a number for date operations
    const numericId = parseInt(id, 10);

    if (viewType === 'Month') {
        const date = new Date(2000, numericId - 1, 1); // Use a dummy year
        return date.toLocaleString('en-US', { month: 'short' }); // e.g., '10' -> 'Oct'
    } 
    if (viewType === 'Week') {
        return `Wk ${numericId}`; // e.g., '39' -> 'Wk 39'
    }
    // For 'Day' (assuming it's day-of-year or simply an index)
    return id; 
};

/**
 * Renders a dual-axis Line Chart for Sales (Revenue and Transactions).
 * @param {Array<Object>} data - The sales data array.
 * @param {('Day'|'Week'|'Month')} viewType - Key used for the X-axis in the data.
 * @param {('revenue'|'bills')} yAxisKey - Determines which metric is primary (left Y-axis).
 */
const SalesChart = ({ data, viewType, yAxisKey }) => {
    // Check window size for responsive height adjustment
    const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
    
    // Determine the dynamic X-Axis data key based on viewType
    const xAxisDataKey = viewType; 
    
    // Map the raw data to include a formatted label for the X-Axis
    const processedData = data.map(d => ({
        ...d,
        // Create the user-friendly label for display
        label: getChartLabel(viewType, d[xAxisDataKey]),
    }));
    

    // Determine primary (left axis) and secondary (right axis) configurations
    const primaryConfig = CHART_CONFIG[yAxisKey] || CHART_CONFIG.revenue;
    const secondaryConfig = yAxisKey === 'revenue' ? { 
        dataKey: primaryConfig.transactionDataKey, 
        name: primaryConfig.transactionName, 
        color: primaryConfig.transactionColor,
        yAxisId: 'right' 
    } : {
        dataKey: primaryConfig.secondaryDataKey,
        name: primaryConfig.secondaryName,
        color: primaryConfig.secondaryColor,
        yAxisId: 'right' 
    };

    /**
     * Formatter function for the Tooltip, handles currency and standard numbers.
     */
    const tooltipFormatter = (value, name, props) => {
        // Check for 'Revenue' in the name or the dataKey for currency formatting
        if (name.includes('Revenue') || props.dataKey === 'revenue') {
            return [`₹${value.toLocaleString('en-IN')}`, name];
        }
        // Format transactions/bills as standard number
        return [value.toLocaleString('en-IN'), name];
    };
    
    // Filter out data points where both primary and secondary values are zero for a cleaner graph
    const filteredData = processedData.filter(d => 
        (d[primaryConfig.dataKey] && d[primaryConfig.dataKey] > 0) || 
        (d[secondaryConfig.dataKey] && d[secondaryConfig.dataKey] > 0)
    );
    
    if (filteredData.length === 0) {
        return (
            <div className="h-[400px] flex items-center justify-center">
                <p className="text-center text-gray-500 py-12">
                    <TrendingUp className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    No sales data available for the selected period.
                </p>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
            <RechartsLineChart
                data={filteredData} 
                margin={{ top: 10, right: 20, left: 10, bottom: 5 }} // Increased right margin for right Y-axis
            >
                {/* Updated stroke color for dark theme compatibility */}
                <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" className="dark:stroke-gray-700" />
                
                {/* X-Axis */}
                <XAxis 
                    dataKey="label" 
                    stroke="#6b7280" 
                    className="dark:text-gray-400 text-xs" 
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
                    // Add formatter for the secondary axis if needed (e.g., bills are just numbers)
                    tickFormatter={(value) => value.toLocaleString('en-IN', { notation: 'compact' })}
                />
                
                <Tooltip
                    contentStyle={{ 
                        backgroundColor: 'rgba(31, 41, 55, 0.9)', // Darker background (gray-800)
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
                
                {/* Primary Line */}
                <Line 
                    yAxisId="left" 
                    dataKey={primaryConfig.dataKey} 
                    name={primaryConfig.name} 
                    stroke={primaryConfig.color} 
                    type="monotone" // Creates a smooth curve
                    strokeWidth={2}
                    dot={{ r: 4 }} // Highlight data points
                    activeDot={{ r: 8, strokeWidth: 2 }} // Larger dot on hover
                />
                
                {/* Secondary Line */}
                <Line 
                    yAxisId="right" 
                    dataKey={secondaryConfig.dataKey} 
                    name={secondaryConfig.name} 
                    stroke={secondaryConfig.color} 
                    type="monotone" // Creates a smooth curve
                    strokeWidth={2}
                    dot={{ r: 4 }} 
                    activeDot={{ r: 8, strokeWidth: 2 }} 
                    opacity={0.8} // Slightly reduced opacity for secondary data
                />
            </RechartsLineChart>
        </ResponsiveContainer>
    );
};

export default SalesChart;