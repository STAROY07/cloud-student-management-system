import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Code,
} from 'lucide-react';
import { Spinner } from '../../components/common/Spinner';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';

export const AuditLogsPage = () => {
  const { showToast } = useToast();

  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalPages: 1, totalRecords: 0 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [entity, setEntity] = useState('');

  // Selected Log JSON Details Modal
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true);
      const res = await api.getAuditLogs({
        page,
        limit: 15,
        search,
        entity,
      });

      if (res.success) {
        setLogs(res.data.logs);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [entity]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs(1);
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Security & Administrative Audit Logs</h1>
          <p>Immutable audit trail tracking all administrative creations, updates, and authentication events</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <form onSubmit={handleSearchSubmit} className="search-input-group">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="form-input"
            placeholder="Search by action, actor, or entity ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>

        <div className="filter-group">
          <select
            className="form-select"
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            style={{ width: 170 }}
          >
            <option value="">All Entities</option>
            <option value="USERS">USERS</option>
            <option value="STUDENTS">STUDENTS</option>
            <option value="FACULTY">FACULTY</option>
            <option value="COURSES">COURSES</option>
            <option value="ATTENDANCE">ATTENDANCE</option>
            <option value="MARKS">MARKS</option>
          </select>

          <button className="btn btn-secondary" onClick={() => fetchLogs(pagination.page)}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-container">
            <Spinner />
            <span>Loading security audit records...</span>
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="No audit events found"
            description="No actions matching your filter criteria were recorded."
          />
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '18%', minWidth: '155px' }}>Timestamp</th>
                  <th style={{ width: '22%', minWidth: '165px' }}>Action Event</th>
                  <th style={{ width: '12%', minWidth: '100px' }}>Entity</th>
                  <th style={{ width: '18%', minWidth: '140px' }}>Actor</th>
                  <th style={{ width: '10%', minWidth: '90px' }}>Role</th>
                  <th style={{ width: '10%', minWidth: '85px' }}>IP Address</th>
                  <th style={{ textAlign: 'right', minWidth: '90px' }}>Payload</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td><strong style={{ color: '#0f172a', fontSize: '0.825rem' }}>{log.action}</strong></td>
                    <td><span className="badge badge-neutral">{log.entity}</span></td>
                    <td style={{ fontWeight: 600 }}>{log.actor_name || 'System / Anonymous'}</td>
                    <td>
                      <span className="badge badge-info">{log.actor_role || 'SYSTEM'}</span>
                    </td>
                    <td style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#64748b' }}>
                      {log.ip_address || '127.0.0.1'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {log.details ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Code size={12} />
                          <span>Inspect</span>
                        </button>
                      ) : (
                        <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="pagination-container">
              <div>
                Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.totalRecords} events)
              </div>
              <div className="pagination-actions">
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchLogs(pagination.page - 1)}
                >
                  <ChevronLeft size={14} />
                  <span>Previous</span>
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchLogs(pagination.page + 1)}
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* JSON Inspector Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={`Audit Payload: ${selectedLog?.action}`}
        footer={
          <button className="btn btn-secondary" onClick={() => setSelectedLog(null)}>
            Close
          </button>
        }
      >
        {selectedLog && (
          <div>
            <div style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
              <strong>Entity ID:</strong> {selectedLog.entity_id || 'N/A'}<br />
              <strong>Timestamp:</strong> {new Date(selectedLog.created_at).toISOString()}<br />
              <strong>Actor:</strong> {selectedLog.actor_name} ({selectedLog.actor_email})
            </div>
            <pre style={{
              background: '#0f172a',
              color: '#38bdf8',
              padding: '1rem',
              borderRadius: 6,
              fontSize: '0.8rem',
              overflowX: 'auto',
              maxHeight: 280,
            }}>
              {JSON.stringify(selectedLog.details, null, 2)}
            </pre>
          </div>
        )}
      </Modal>
    </div>
  );
};
