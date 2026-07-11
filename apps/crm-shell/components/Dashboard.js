import React, { useState, useEffect } from 'react';
import MetricCard from './MetricCard';
import PipelineChart from './PipelineChart';
import Recommendations from './Recommendations';

// Fallback data if API is not running
const fallbackData = {
  metrics: [],
  pipeline_stages: [],
  recommendations: []
};

const Dashboard = () => {
  const [data, setData] = useState(fallbackData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("" + '/api/dashboard');
        if (response.ok) {
          const result = await response.json();
          setData(result);
        } else {
          console.log("Failed to fetch data, using fallback");
        }
      } catch (error) {
        console.log("API not running, using fallback data", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  return (
    <div className="dashboard-container">
      <div className="welcome-msg">
        <h2>Good morning, Alex</h2>
        <p>Here's what's moving across your pipeline and accounts today.</p>
      </div>

      <div className="metrics-grid">
        {data.metrics.map(metric => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>

      <div className="dashboard-grid">
        <PipelineChart stages={data.pipeline_stages} />
        <Recommendations recommendations={data.recommendations} />
      </div>
      
      {/* Placeholders for bottom row shown in image */}
      <div className="dashboard-grid" style={{ marginTop: '1.5rem', gridTemplateColumns: '1fr 1fr' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Hot leads</h3>
            <a href="#" className="card-link">View all</a>
          </div>
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No hot leads currently.
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Tasks due soon</h3>
            <a href="#" className="card-link">View all</a>
          </div>
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            You're all caught up!
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
