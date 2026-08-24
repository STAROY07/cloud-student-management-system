import React from 'react';
import { Inbox } from 'lucide-react';

export const EmptyState = ({ icon: Icon = Inbox, title = 'No records found', description, action }) => {
  return (
    <div className="empty-state">
      <Icon className="empty-state-icon" />
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-desc">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
};
