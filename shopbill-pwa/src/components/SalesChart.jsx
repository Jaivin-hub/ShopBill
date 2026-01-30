import React, { useMemo } from 'react';
import { 
    LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer, Legend, Area, AreaChart 
} from 'recharts';
import { TrendingUp, BarChart3 } from 'lucide-react'; 

const CHART_CONFIG = {
    revenue: {
        yAxisId: 'left',
        dataKey: 'revenue',
        name: 'REVENUE',
        color: '#6366f1', // Indigo 500
        formatter: (value) => `₹${value.toLocaleString('en-IN', { notation: 'compact' })}`, 
        transactionDataKey: 'bills',
        transactionName: 'BILL COUNT',
        transactionColor: '#10b981' // Emerald 500
    },
    bills: {
        yAxisId: 'left', 
        dataKey: 'bills',
        name: 'BILL COUNT',
        color: '#10b981', // Emerald 500
        formatter: (value) => value.toLocaleString('en-IN', { notation: 'compact' }),
        secondaryDataKey: 'revenue',
        secondaryName: 'REVENUE',
        secondaryColor: '#6366f1' // Indigo 500
    }
};

const getChartLabel = (viewType, id) => {
    if (!id) return '';
    if (viewType === 'Month') {
        const numericId = parseInt(id, 10);
        const date = new Date(2000, numericId - 1, 1);
        return date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    } 
    if (viewType === 'Week') return `WK ${id}`;
    if (viewType === 'Day') {
        try {
            const date = new Date(id);
            if (isNaN(date.getTime())) return id;
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
        } catch (e) { return id; }
    }
    return id; 
};

const SalesChart = ({ data, viewType, yAxisKey }) => {
    const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
    
    const processedData = useMemo(() => {
        if (!data || !Array.isArray(data) || data.length === 0) {
            return [];
        }
        
        return data.map(d => {
            // The server returns data with keys like 'Day', 'Week', or 'Month'
            // Match the viewType to the correct key
            const dateKey = viewType; // 'Day', 'Week', or 'Month'
            const dateValue = d[dateKey] || d._id || '';
            
            return {
                ...d,
                label: getChartLabel(viewType, dateValue),
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

    const tooltipFormatter = (value, name) => {
        const displayValue = name.includes('REVENUE') 
            ? `₹${value.toLocaleString('en-IN')}` 
            : value.toLocaleString('en-IN');
        return [displayValue, name];
    };
    
    const filteredData = processedData.filter(d => 
        (d[primaryConfig.dataKey] && d[primaryConfig.dataKey] > 0) || 
        (d[secondaryConfig.dataKey] && d[secondaryConfig.dataKey] > 0)
    );
    
    if (filteredData.length === 0) {
        return (
            <div className="h-full min-h-[300px] flex items-center justify-center bg-gray-900/20 rounded-[2rem] border border-dashed border-gray-800">
                <div className="text-center">
                    <div className="bg-gray-900 p-4 rounded-2xl w-fit mx-auto mb-4 border border-gray-800">
                        <BarChart3 className="w-8 h-8 text-gray-700" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600">
                        No Sales Data Found
                    </p>
                </div>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart
                data={filteredData} 
                margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
            >
                <defs>
                    <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={primaryConfig.color} stopOpacity={0.1}/>
                        <stop offset="95%" stopColor={primaryConfig.color} stopOpacity={0}/>
                    </linearGradient>
                </defs>

                <CartesianGrid vertical={false} stroke="#1f2937" strokeDasharray="8 8" />
                
                <XAxis 
                    dataKey="label" 
                    axisLine={false}
                    tickLine={false}
                    stroke="#4b5563" 
                    fontSize={9}
                    fontWeight={800}
                    tick={{ dy: 15 }}
                    interval={isMobile ? "preserveStartEnd" : 0} 
                />
                
                <YAxis 
                    yAxisId="left" 
                    axisLine={false}
                    tickLine={false}
                    stroke={primaryConfig.color} 
                    fontSize={10}
                    fontWeight={800}
                    tickFormatter={primaryConfig.formatter}
                />
                
                <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    axisLine={false}
                    tickLine={false}
                    stroke={secondaryConfig.color} 
                    fontSize={10}
                    fontWeight={800}
                    tickFormatter={(value) => value.toLocaleString('en-IN', { notation: 'compact' })}
                />
                
                <Tooltip
                    cursor={{ stroke: '#374151', strokeWidth: 1 }}
                    contentStyle={{ 
                        backgroundColor: '#030712', 
                        border: '1px solid #1f2937', 
                        borderRadius: '1.5rem',
                        padding: '16px',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(8px)'
                    }}
                    itemStyle={{ 
                        fontSize: '10px', 
                        fontWeight: '900', 
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        padding: '2px 0'
                    }}
                    labelStyle={{ 
                        fontSize: '11px',
                        fontWeight: '900', 
                        color: '#9ca3af', 
                        marginBottom: '8px',
                        borderBottom: '1px solid #1f2937',
                        paddingBottom: '4px',
                        letterSpacing: '0.1em'
                    }} 
                    formatter={tooltipFormatter}
                />
                
                <Legend 
                    verticalAlign="top" 
                    align="right"
                    iconType="rect"
                    iconSize={10}
                    wrapperStyle={{ 
                        paddingBottom: '20px', 
                        fontSize: '10px', 
                        fontWeight: '900',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase'
                    }} 
                />
                
                <Line 
                    yAxisId="left" 
                    dataKey={primaryConfig.dataKey} 
                    name={primaryConfig.name} 
                    stroke={primaryConfig.color} 
                    type="monotone" 
                    strokeWidth={4}
                    dot={{ r: 0 }} 
                    activeDot={{ r: 6, fill: '#fff', stroke: primaryConfig.color, strokeWidth: 3 }} 
                    animationDuration={1500}
                />
                
                <Line 
                    yAxisId="right" 
                    dataKey={secondaryConfig.dataKey} 
                    name={secondaryConfig.name} 
                    stroke={secondaryConfig.color} 
                    type="monotone" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 0 }} 
                    activeDot={{ r: 4, fill: '#fff', stroke: secondaryConfig.color, strokeWidth: 2 }} 
                    opacity={0.5}
                />
            </RechartsLineChart>
        </ResponsiveContainer>
    );
};

export default SalesChart;