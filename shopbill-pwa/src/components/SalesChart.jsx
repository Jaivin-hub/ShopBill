import React, { useMemo } from 'react';
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
        formatter: (value) => `₹${value.toLocaleString('en-IN', { notation: 'compact' })}`, 
        transactionDataKey: 'bills',
        transactionName: 'Transactions',
        transactionColor: '#10b981' // green-600
    },
    bills: {
        yAxisId: 'left', 
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
 * --- UPDATED HELPER FUNCTION ---
 * Converts IDs or Date strings into user-friendly labels.
 * @param {string} viewType - 'Day', 'Week', or 'Month'
 * @param {number|string} id - The value from the data
 * @returns {string} The formatted label for the X-axis.
 */
const getChartLabel = (viewType, id) => {
    if (!id) return '';

    if (viewType === 'Month') {
        const numericId = parseInt(id, 10);
        // Returns "Jan", "Feb", etc.
        const date = new Date(2000, numericId - 1, 1);
        return date.toLocaleString('en-US', { month: 'short' });
    } 
    
    if (viewType === 'Week') {
        return `Wk ${id}`;
    }

    // UPDATED: Handle 'Day' to show readable dates like "Oct 12"
    if (viewType === 'Day') {
        try {
            const date = new Date(id);
            // If the date is invalid, fallback to raw ID
            if (isNaN(date.getTime())) return id;
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch (e) {
            return id;
        }
    }
    
    return id; 
};

/**
 * Renders a dual-axis Line Chart for Sales (Revenue and Transactions).
 */
const SalesChart = ({ data, viewType, yAxisKey }) => {
    const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
    
    // Map the raw data to include a formatted label for the X-Axis
    const processedData = useMemo(() => {
        return data.map(d => {
            // Get the value using the viewType as a key (handles 'Day', 'Week', 'Month')
            const rawValue = d[viewType];
            
            return {
                ...d,
                label: getChartLabel(viewType, rawValue),
            };
        });
    }, [data, viewType]);

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

    const tooltipFormatter = (value, name, props) => {
        if (name.includes('Revenue') || props.dataKey === 'revenue') {
            return [`₹${value.toLocaleString('en-IN')}`, name];
        }
        return [value.toLocaleString('en-IN'), name];
    };
    
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
                margin={{ top: 10, right: 20, left: 10, bottom: 20 }} // Bottom margin for date labels
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" className="dark:stroke-gray-700" />
                
                {/* Updated X-Axis for Dates */}
                <XAxis 
                    dataKey="label" 
                    stroke="#6b7280" 
                    className="dark:text-gray-400 text-[10px] sm:text-xs" 
                    tick={{ dy: 10 }}
                    interval={isMobile ? "preserveStartEnd" : 0} 
                />
                
                <YAxis 
                    yAxisId="left" 
                    stroke={primaryConfig.color} 
                    className="dark:text-gray-400 text-xs"
                    tickFormatter={primaryConfig.formatter}
                />
                
                <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    stroke={secondaryConfig.color} 
                    className="dark:text-gray-400 text-xs"
                    tickFormatter={(value) => value.toLocaleString('en-IN', { notation: 'compact' })}
                />
                
                <Tooltip
                    contentStyle={{ 
                        backgroundColor: 'rgba(31, 41, 55, 0.9)', 
                        border: '1px solid #4b5563', 
                        borderRadius: '8px',
                        padding: '8px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.3)' ,
                        color: '#f9fafb' 
                    }}
                    labelStyle={{ fontWeight: 'bold', color: '#f9fafb' }} 
                    formatter={tooltipFormatter}
                />
                
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                
                <Line 
                    yAxisId="left" 
                    dataKey={primaryConfig.dataKey} 
                    name={primaryConfig.name} 
                    stroke={primaryConfig.color} 
                    type="monotone" 
                    strokeWidth={2}
                    dot={{ r: 4 }} 
                    activeDot={{ r: 8, strokeWidth: 2 }} 
                />
                
                <Line 
                    yAxisId="right" 
                    dataKey={secondaryConfig.dataKey} 
                    name={secondaryConfig.name} 
                    stroke={secondaryConfig.color} 
                    type="monotone" 
                    strokeWidth={2}
                    dot={{ r: 4 }} 
                    activeDot={{ r: 8, strokeWidth: 2 }} 
                    opacity={0.8} 
                />
            </RechartsLineChart>
        </ResponsiveContainer>
    );
};

export default SalesChart;