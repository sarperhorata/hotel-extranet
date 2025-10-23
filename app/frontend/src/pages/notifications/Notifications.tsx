import React, { useEffect, useState } from 'react';
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CBadge,
  CSpinner,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CFormSelect,
  CAlert,
} from '@coreui/react';
import { cilSearch, cilBell, cilCheck, cilCheckAll, cilEnvelopeClosed } from '@coreui/icons';
import CIcon from '@coreui/icons-react';

import { Notification } from '../../types';
import { apiService } from '../../services/api.service';

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    type: '',
    priority: '',
    unreadOnly: false,
  });

  useEffect(() => {
    loadNotifications();
  }, [filters]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        limit: 50,
        unreadOnly: filters.unreadOnly ? 'true' : 'false',
      };

      const response = await apiService.get<Notification[]>('/notifications', params);
      setNotifications(response.notifications || []);
    } catch (error: any) {
      setError(error.message || 'Failed to load notifications');
      console.error('Notifications error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await apiService.put(`/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
    } catch (error: any) {
      console.error('Mark as read error:', error);
      alert('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiService.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error: any) {
      console.error('Mark all as read error:', error);
      alert('Failed to mark all notifications as read');
    }
  };

  const handleSendTestEmail = async () => {
    try {
      const email = prompt('Enter email address for test notification:');
      if (!email) return;

      const type = prompt('Enter notification type (booking_confirmation, payment_confirmation, etc.):') || 'test';

      await apiService.post('/notifications/test-email', { email, type });
      alert('Test email sent successfully!');
    } catch (error: any) {
      console.error('Send test email error:', error);
      alert('Failed to send test email');
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <CSpinner color="primary" />
      </div>
    );
  }

  if (error) {
    return (
      <CCard className="mb-4">
        <CCardBody>
          <div className="text-center text-danger">
            <h4>Error Loading Notifications</h4>
            <p>{error}</p>
            <CButton color="primary" onClick={loadNotifications}>
              Try Again
            </CButton>
          </div>
        </CCardBody>
      </CCard>
    );
  }

  const getNotificationBadge = (type: string) => {
    const typeMap: Record<string, { color: string; text: string }> = {
      booking_confirmation: { color: 'success', text: 'Booking' },
      booking_cancellation: { color: 'danger', text: 'Cancellation' },
      payment_confirmation: { color: 'info', text: 'Payment' },
      inventory_alert: { color: 'warning', text: 'Inventory' },
      system: { color: 'secondary', text: 'System' },
    };

    const config = typeMap[type] || { color: 'secondary', text: type };
    return <CBadge color={config.color}>{config.text}</CBadge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityMap: Record<string, { color: string; text: string }> = {
      high: { color: 'danger', text: 'High' },
      medium: { color: 'warning', text: 'Medium' },
      low: { color: 'info', text: 'Low' },
    };

    const config = priorityMap[priority] || { color: 'secondary', text: priority };
    return <CBadge color={config.color}>{config.text}</CBadge>;
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-0">Notifications</h2>
          <p className="text-muted">System notifications and alerts</p>
        </div>
        <div className="d-flex gap-2">
          {unreadCount > 0 && (
            <CButton color="outline-primary" onClick={handleMarkAllAsRead}>
              <CIcon icon={cilCheckAll} className="me-2" />
              Mark All Read ({unreadCount})
            </CButton>
          )}
          <CButton color="outline-secondary" onClick={handleSendTestEmail}>
            <CIcon icon={cilEnvelopeClosed} className="me-2" />
            Test Email
          </CButton>
        </div>
      </div>

      {/* Filters */}
      <CCard className="mb-4">
        <CCardBody>
          <CRow className="g-3">
            <CCol md={3}>
              <CFormSelect
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              >
                <option value="">All Types</option>
                <option value="booking_confirmation">Booking Confirmation</option>
                <option value="booking_cancellation">Booking Cancellation</option>
                <option value="payment_confirmation">Payment Confirmation</option>
                <option value="inventory_alert">Inventory Alert</option>
                <option value="system">System</option>
              </CFormSelect>
            </CCol>
            <CCol md={3}>
              <CFormSelect
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              >
                <option value="">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </CFormSelect>
            </CCol>
            <CCol md={3}>
              <CFormSelect
                value={filters.unreadOnly ? 'true' : 'false'}
                onChange={(e) => setFilters(prev => ({ ...prev, unreadOnly: e.target.value === 'true' }))}
              >
                <option value="false">All Notifications</option>
                <option value="true">Unread Only</option>
              </CFormSelect>
            </CCol>
            <CCol md={3}>
              <CButton color="outline-primary" onClick={loadNotifications} className="w-100">
                <CIcon icon={cilSearch} className="me-2" />
                Refresh
              </CButton>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {/* Notifications Table */}
      <CCard>
        <CCardHeader>
          <h5 className="mb-0">
            Recent Notifications ({notifications.length})
            {unreadCount > 0 && (
              <CBadge color="danger" className="ms-2">
                {unreadCount} unread
              </CBadge>
            )}
          </h5>
        </CCardHeader>
        <CCardBody>
          <CTable hover responsive>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Type</CTableHeaderCell>
                <CTableHeaderCell>Title</CTableHeaderCell>
                <CTableHeaderCell>Message</CTableHeaderCell>
                <CTableHeaderCell>Priority</CTableHeaderCell>
                <CTableHeaderCell>Status</CTableHeaderCell>
                <CTableHeaderCell>Date</CTableHeaderCell>
                <CTableHeaderCell>Actions</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {notifications.map((notification) => (
                <CTableRow
                  key={notification.id}
                  className={notification.isRead ? '' : 'table-primary'}
                >
                  <CTableDataCell>
                    {getNotificationBadge(notification.type)}
                  </CTableDataCell>
                  <CTableDataCell>
                    <div className="fw-bold">{notification.title}</div>
                    {notification.email && (
                      <small className="text-muted d-block">
                        To: {notification.email}
                      </small>
                    )}
                  </CTableDataCell>
                  <CTableDataCell>
                    <div className="text-truncate" style={{ maxWidth: '300px' }}>
                      {notification.message}
                    </div>
                  </CTableDataCell>
                  <CTableDataCell>
                    {getPriorityBadge(notification.priority)}
                  </CTableDataCell>
                  <CTableDataCell>
                    <CBadge color={notification.isRead ? 'success' : 'warning'}>
                      {notification.isRead ? 'Read' : 'Unread'}
                    </CBadge>
                  </CTableDataCell>
                  <CTableDataCell>
                    {new Date(notification.createdAt).toLocaleDateString()}
                  </CTableDataCell>
                  <CTableDataCell>
                    {!notification.isRead && (
                      <CButton
                        size="sm"
                        color="outline-primary"
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        <CIcon icon={cilCheck} />
                      </CButton>
                    )}
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>

          {notifications.length === 0 && (
            <div className="text-center py-4 text-muted">
              <CIcon icon={cilBell} size="3xl" className="mb-3" />
              <h5>No notifications found</h5>
              <p>Notifications will appear here when events occur.</p>
            </div>
          )}
        </CCardBody>
      </CCard>

      {/* Notification Stats */}
      <CRow className="mt-4">
        <CCol md={3}>
          <CCard className="text-center">
            <CCardBody>
              <div className="h4 mb-0 text-primary">{notifications.length}</div>
              <small className="text-muted">Total Notifications</small>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol md={3}>
          <CCard className="text-center">
            <CCardBody>
              <div className="h4 mb-0 text-warning">{unreadCount}</div>
              <small className="text-muted">Unread</small>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol md={3}>
          <CCard className="text-center">
            <CCardBody>
              <div className="h4 mb-0 text-success">
                {notifications.filter(n => n.type === 'booking_confirmation').length}
              </div>
              <small className="text-muted">Booking Confirmations</small>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol md={3}>
          <CCard className="text-center">
            <CCardBody>
              <div className="h4 mb-0 text-info">
                {notifications.filter(n => n.type === 'payment_confirmation').length}
              </div>
              <small className="text-muted">Payment Confirmations</small>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  );
};

export default Notifications;
