import React, { useEffect, useState } from 'react';
import {
  CRow,
  CCol,
  CWidgetStatsA,
  CWidgetStatsB,
  CWidgetStatsC,
  CWidgetStatsD,
  CCard,
  CCardBody,
  CCardHeader,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CButton,
  CBadge,
  CSpinner,
} from '@coreui/react';
import {
  cilBuilding,
  cilBed,
  cilCalendar,
  cilDollar,
  cilPeople,
  cilArrowTop,
  cilArrowBottom,
} from '@coreui/icons';
import CIcon from '@coreui/icons-react';

import { useAuth } from '../contexts/AuthContext';
import { DashboardStats, Booking } from '../types';
import { apiService } from '../services/api.service';

const Dashboard: React.FC = () => {
  const { tenant } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [tenant]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const statsData = await apiService.get<DashboardStats>('/dashboard/stats');
      setStats(statsData);
    } catch (error: any) {
      setError(error.message || 'Failed to load dashboard data');
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
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
            <h4>Error Loading Dashboard</h4>
            <p>{error}</p>
            <CButton color="primary" onClick={loadDashboardData}>
              Try Again
            </CButton>
          </div>
        </CCardBody>
      </CCard>
    );
  }

  if (!stats) {
    return null;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getBookingStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      confirmed: { color: 'success', text: 'Confirmed' },
      cancelled: { color: 'danger', text: 'Cancelled' },
      completed: { color: 'primary', text: 'Completed' },
      no_show: { color: 'warning', text: 'No Show' },
    };

    const config = statusMap[status] || { color: 'secondary', text: status };
    return <CBadge color={config.color}>{config.text}</CBadge>;
  };

  return (
    <>
      <div className="mb-4">
        <h2 className="mb-0">Dashboard</h2>
        <p className="text-muted">Welcome back! Here's your property overview.</p>
      </div>

      {/* Stats Widgets */}
      <CRow className="mb-4">
        <CCol xs={12} sm={6} lg={3}>
          <CWidgetStatsA
            className="mb-4"
            color="primary"
            value={stats.totalProperties.toString()}
            title="Properties"
            chart={
              <div className="d-flex align-items-center">
                <CIcon icon={cilBuilding} size="xl" />
              </div>
            }
          />
        </CCol>

        <CCol xs={12} sm={6} lg={3}>
          <CWidgetStatsA
            className="mb-4"
            color="info"
            value={stats.totalRooms.toString()}
            title="Rooms"
            chart={
              <div className="d-flex align-items-center">
                <CIcon icon={cilBed} size="xl" />
              </div>
            }
          />
        </CCol>

        <CCol xs={12} sm={6} lg={3}>
          <CWidgetStatsA
            className="mb-4"
            color="success"
            value={stats.totalBookings.toString()}
            title="Bookings"
            chart={
              <div className="d-flex align-items-center">
                <CIcon icon={cilCalendar} size="xl" />
              </div>
            }
          />
        </CCol>

        <CCol xs={12} sm={6} lg={3}>
          <CWidgetStatsA
            className="mb-4"
            color="warning"
            value={formatCurrency(stats.totalRevenue)}
            title="Revenue"
            chart={
              <div className="d-flex align-items-center">
                <CIcon icon={cilDollar} size="xl" />
              </div>
            }
          />
        </CCol>
      </CRow>

      <CRow className="mb-4">
        <CCol xs={12} md={6}>
          <CWidgetStatsC
            className="mb-4"
            icon={<CIcon icon={cilPeople} size="xl" />}
            color="primary"
            title="Occupancy Rate"
            value={`${Math.round(stats.occupancyRate * 100)}%`}
            progress={{ value: stats.occupancyRate * 100 }}
          />
        </CCol>

        <CCol xs={12} md={6}>
          <CWidgetStatsC
            className="mb-4"
            icon={<CIcon icon={cilArrowTop} size="xl" />}
            color="success"
            title="Average Daily Rate"
            value={formatCurrency(stats.averageDailyRate)}
            progress={{ value: 75 }}
          />
        </CCol>
      </CRow>

      {/* Recent Bookings */}
      <CRow className="mb-4">
        <CCol xs={12}>
          <CCard>
            <CCardHeader>
              <h5 className="mb-0">Recent Bookings</h5>
            </CCardHeader>
            <CCardBody>
              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Booking Reference</CTableHeaderCell>
                    <CTableHeaderCell>Guest</CTableHeaderCell>
                    <CTableHeaderCell>Property</CTableHeaderCell>
                    <CTableHeaderCell>Check-in</CTableHeaderCell>
                    <CTableHeaderCell>Check-out</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell>Amount</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {stats.recentBookings.map((booking) => (
                    <CTableRow key={booking.id}>
                      <CTableDataCell>{booking.bookingReference}</CTableDataCell>
                      <CTableDataCell>
                        {booking.guest?.firstName} {booking.guest?.lastName}
                      </CTableDataCell>
                      <CTableDataCell>{booking.property?.name}</CTableDataCell>
                      <CTableDataCell>
                        {new Date(booking.checkInDate).toLocaleDateString()}
                      </CTableDataCell>
                      <CTableDataCell>
                        {new Date(booking.checkOutDate).toLocaleDateString()}
                      </CTableDataCell>
                      <CTableDataCell>{getBookingStatusBadge(booking.status)}</CTableDataCell>
                      <CTableDataCell>{formatCurrency(booking.totalAmount)}</CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Recent Notifications */}
      <CRow>
        <CCol xs={12}>
          <CCard>
            <CCardHeader>
              <h5 className="mb-0">Recent Notifications</h5>
            </CCardHeader>
            <CCardBody>
              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Type</CTableHeaderCell>
                    <CTableHeaderCell>Title</CTableHeaderCell>
                    <CTableHeaderCell>Message</CTableHeaderCell>
                    <CTableHeaderCell>Priority</CTableHeaderCell>
                    <CTableHeaderCell>Date</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {stats.recentNotifications.map((notification) => (
                    <CTableRow key={notification.id}>
                      <CTableDataCell>
                        <CBadge color="info">{notification.type}</CBadge>
                      </CTableDataCell>
                      <CTableDataCell>{notification.title}</CTableDataCell>
                      <CTableDataCell>{notification.message}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge
                          color={
                            notification.priority === 'high'
                              ? 'danger'
                              : notification.priority === 'medium'
                              ? 'warning'
                              : 'secondary'
                          }
                        >
                          {notification.priority}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell>
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  );
};

export default Dashboard;