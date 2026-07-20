"use client";

import React, { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';

const PipelineChart = ({ stages }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Find max value for relative width calculation
  const maxValue = Math.max(...stages.map(s => s.value), 1); // Avoid div by 0

  const formatCurrency = (value) => {
    if (value >= 1000) {
      return `$${value / 1000}K`;
    }
    return `$${value}`;
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Pipeline by stage</h3>
          <span className="card-subtitle">Value in thousands (USD)</span>
        </div>
        <a href="#" className="card-link">View opportunities <ArrowUpRight size={16} /></a>
      </div>
      <div className="pipeline-chart">
        {stages.map((stage) => (
          <div key={stage.id} className="pipeline-item">
            <div className="pipeline-info">
              <span className="pipeline-name">{stage.name}</span>
              <span className="pipeline-value">{formatCurrency(stage.value)}</span>
            </div>
            <div className="pipeline-bar-bg">
              <div 
                className="pipeline-bar-fill" 
                style={{ 
                  width: mounted ? `${(stage.value / maxValue) * 100}%` : '0%',
                  backgroundColor: stage.color
                }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PipelineChart;
