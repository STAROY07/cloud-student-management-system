import React from 'react';

export const Spinner = ({ size = 'md', white = false }) => {
  return <div className={`spinner ${size === 'sm' ? 'sm' : ''} ${white ? 'white' : ''}`}></div>;
};
