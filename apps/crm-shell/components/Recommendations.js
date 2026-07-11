import React from 'react';
import { Sparkles, ArrowUpRight } from 'lucide-react';

const Recommendations = ({ recommendations }) => {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={18} color="var(--accent-secondary)" />
          AI recommendations
        </h3>
      </div>
      <div className="recommendations-list">
        {recommendations.map((rec) => (
          <div key={rec.id} className="recommendation-item">
            <div className="recommendation-text">{rec.text} — {rec.confidence}%</div>
            <div className="recommendation-confidence">confidence</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '1.5rem' }}>
        <a href="#" className="card-link">All suggestions <ArrowUpRight size={16} /></a>
      </div>
    </div>
  );
};

export default Recommendations;
