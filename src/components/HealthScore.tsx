import React from 'react';
import './HealthScore.css';

interface HealthScoreProps {
  score: number;
}

const HealthScore: React.FC<HealthScoreProps> = ({ score }) => {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="health-score-container">
      <svg className="health-score-progress" viewBox="0 0 100 100">
        <circle
          className="progress-background"
          cx="50"
          cy="50"
          r="45"
        />
        <circle
          className="progress-bar"
          cx="50"
          cy="50"
          r="45"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="health-score-text">
        <span className="score">{score}</span>
        <span className="label">Health Score</span>
      </div>
    </div>
  );
};

export default HealthScore;
