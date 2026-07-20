"use client";

import React from 'react';
import { DollarSign, TrendingUp, Users, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const MetricCard = ({ metric }) => {
  // Determine icon and color based on name
  let Icon = TrendingUp;
  let iconClass = 'blue';
  
  if (metric.name.includes('Value')) {
    Icon = DollarSign;
    iconClass = 'blue';
  } else if (metric.name.includes('Opportunities')) {
    Icon = TrendingUp;
    iconClass = 'teal';
  } else if (metric.name.includes('Customers')) {
    Icon = Users;
    iconClass = 'teal-alt';
  } else if (metric.name.includes('Complaints')) {
    Icon = AlertCircle;
    iconClass = 'red';
  }

  return (
    <div className="metric-card">
      <div className="metric-header">
        <span className="metric-title">{metric.name}</span>
        <div className={`metric-icon ${iconClass}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="metric-value">{metric.formatted_value}</div>
      <div className={`metric-trend ${metric.is_positive ? 'trend-up' : 'trend-down'}`}>
        {metric.is_positive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
        {metric.trend}
      </div>
    </div>
  );
};

export default MetricCard;
