import React, { useMemo } from 'react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react'; 

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

const getChartLabel = (viewType, id) => {
    if (!id) return '';

    if (viewType === 'Month') {
        const numericId = parseInt(id, 10);
        const date = new Date(2000, numericId - 1, 1);
        return date.toLocaleString('en-US', { month: 'short' });
    } 
    
    if (viewType === 'Week') {
        return `Wk ${id}`;
    }

    if (viewType === 'Day') {
        try {
            const date = new Date(id);
            if (isNaN(date.getTime())) return id;
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch (e) {
            return id;
        }
    }
    
    return id; 
};

const SalesChart = ({ data, viewType, yAxisKey }) => {
    const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
    
    const processedData = useMemo(() => {
        return data.map(d => {
            const rawValue = d[viewType];
            return {
                ...d,
                label: getChartLabel(viewType, rawValue),
            };
        });
    }, [data, viewType]);

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
            <div className="h-[400px] flex items-center justify-center bg-gray-950 rounded-xl">
                <div className="text-center">
                    <TrendingUp className="w-8 h-8 mx-auto mb-2 text-gray-700" />
                    <p className="text-gray-500 py-4 font-medium">
                        No sales data available for the selected period.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
            <RechartsLineChart
                data={filteredData} 
                margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                
                <XAxis 
                    dataKey="label" 
                    stroke="#9ca3af" 
                    className="text-gray-400 text-[10px] sm:text-xs" 
                    tick={{ dy: 10 }}
                    interval={isMobile ? "preserveStartEnd" : 0} 
                />
                
                <YAxis 
                    yAxisId="left" 
                    stroke={primaryConfig.color} 
                    className="text-gray-400 text-xs"
                    tickFormatter={primaryConfig.formatter}
                />
                
                <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    stroke={secondaryConfig.color} 
                    className="text-gray-400 text-xs"
                    tickFormatter={(value) => value.toLocaleString('en-IN', { notation: 'compact' })}
                />
                
                <Tooltip
                    contentStyle={{ 
                        backgroundColor: '#111827', 
                        border: '1px solid #374151', 
                        borderRadius: '8px',
                        padding: '12px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)' ,
                        color: '#f9fafb' 
                    }}
                    labelStyle={{ fontWeight: 'bold', color: '#f9fafb', marginBottom: '4px' }} 
                    formatter={tooltipFormatter}
                />
                
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', color: '#9ca3af' }} />
                
                <Line 
                    yAxisId="left" 
                    dataKey={primaryConfig.dataKey} 
                    name={primaryConfig.name} 
                    stroke={primaryConfig.color} 
                    type="monotone" 
                    strokeWidth={2}
                    dot={{ r: 4, fill: primaryConfig.color, strokeWidth: 0 }} 
                    activeDot={{ r: 8, strokeWidth: 2 }} 
                />
                
                <Line 
                    yAxisId="right" 
                    dataKey={secondaryConfig.dataKey} 
                    name={secondaryConfig.name} 
                    stroke={secondaryConfig.color} 
                    type="monotone" 
                    strokeWidth={2}
                    dot={{ r: 4, fill: secondaryConfig.color, strokeWidth: 0 }} 
                    activeDot={{ r: 8, strokeWidth: 2 }} 
                    opacity={0.8} 
                />
            </RechartsLineChart>
        </ResponsiveContainer>
    );
};

export default SalesChart;