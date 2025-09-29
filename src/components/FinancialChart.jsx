import React from 'react';

const FinancialChart = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  return (
    <div className="space-y-4">
      {data.map((item, index) => {
        const percentage = total > 0 ? (item.value / total) * 100 : 0;
        const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500'];
        
        return (
          <div key={index} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">{item.name}</span>
              <span className="text-white font-medium">{item.value}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div 
                className={`${colors[index]} h-3 rounded-full transition-all duration-500`}
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
            <div className="text-right text-xs text-gray-400">
              {percentage.toFixed(1)}%
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FinancialChart;