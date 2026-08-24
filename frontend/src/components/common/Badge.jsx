import React from 'react';

export const StatusBadge = ({ status }) => {
  const getBadgeClass = (s) => {
    switch (s?.toUpperCase()) {
      case 'ACTIVE':
      case 'PRESENT':
      case 'COMPLETED':
      case 'HEALTHY':
        return 'badge-success';
      case 'LATE':
      case 'WARNING':
        return 'badge-warning';
      case 'INACTIVE':
      case 'SUSPENDED':
      case 'ABSENT':
      case 'UNHEALTHY':
      case 'DROPPED':
        return 'badge-danger';
      case 'EXCUSED':
        return 'badge-info';
      default:
        return 'badge-neutral';
    }
  };

  return <span className={`badge ${getBadgeClass(status)}`}>{status}</span>;
};

export const RoleBadge = ({ role }) => {
  const getRoleClass = (r) => {
    switch (r?.toUpperCase()) {
      case 'ADMIN':
        return 'badge-danger';
      case 'FACULTY':
        return 'badge-success';
      case 'STUDENT':
        return 'badge-info';
      default:
        return 'badge-neutral';
    }
  };

  return <span className={`badge ${getRoleClass(role)}`}>{role}</span>;
};
