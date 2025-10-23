import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
  CFormSelect,
  CInputGroup,
  CInputGroupText,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from '@coreui/react';
import { cilSearch, cilOptions, cilEye, cilPencil, cilBan, cilCalendar, cilDollar } from '@coreui/icons';
import CIcon from '@coreui/icons-react';

import { Booking, BookingFilters } from '../../types';
import { apiService } from '../../services/api.service';

const Bookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<BookingFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [cancelModal, setCancelModal] = useState<{ show: boolean; booking?: Booking }>({ show: false });

  useEffect(() => {
    loadBookings();
  }, [currentPage, filters]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        limit: 10,
        ...filters,
        search: searchTerm || undefined,
      };

      const response = await apiService.getPaginated<Booking>('/bookings', params);

      setBookings(response.items);
      setTotalPages(response.pagination.totalPages);
    } catch (error: any) {
      setError(error.message || 'Failed to load bookings');
      console.error('Bookings error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadBookings();
  };

  const handleFilterChange = (key: keyof BookingFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleCancelBooking = async (booking: Booking) => {
    try {
      await apiService.put(`/bookings/${booking.id}/cancel`, {
        reason: 'Cancelled by hotel management'
      });
      loadBookings();
      setCancelModal({ show: false });
    } catch (error: any) {
      console.error('Cancel booking error:', error);
      alert('Failed to cancel booking');
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
            <h4>Error Loading Bookings</h4>
            <p>{error}</p>
            <CButton color="primary" onClick={loadBookings}>
              Try Again
            </CButton>
          </div>
        </CCardBody>
      </CCard>
    );
  }

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

  const getPaymentStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: 'warning', text: 'Pending' },
      paid: { color: 'success', text: 'Paid' },
      refunded: { color: 'info', text: 'Refunded' },
      failed: { color: 'danger', text: 'Failed' },
    };

    const config = statusMap[status] || { color: 'secondary', text: status };
    return <CBadge color={config.color}>{config.text}</CBadge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-0">Bookings</h2>
          <p className="text-muted">Manage reservations and guest bookings</p>
        </div>
        <Link to="/search">
          <CButton color="primary">
            <CIcon icon={cilSearch} className="me-2" />
            New Booking
          </CButton>
        </Link>
      </div>

      {/* Filters */}
      <CCard className="mb-4">
        <CCardBody>
          <CRow className="g-3">
            <CCol md={4}>
              <CFormInput
                type="text"
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch(e)}
              />
            </CCol>
            <CCol md={2}>
              <CFormSelect
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
              >
                <option value="">All Status</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
                <option value="no_show">No Show</option>
              </CFormSelect>
            </CCol>
            <CCol md={2}>
              <CFormSelect
                value={filters.channel || ''}
                onChange={(e) => handleFilterChange('channel', e.target.value || undefined)}
              >
                <option value="">All Channels</option>
                <option value="direct">Direct</option>
                <option value="booking.com">Booking.com</option>
                <option value="expedia">Expedia</option>
                <option value="airbnb">Airbnb</option>
              </CFormSelect>
            </CCol>
            <CCol md={2}>
              <CFormInput
                type="date"
                value={filters.checkInDate || ''}
                onChange={(e) => handleFilterChange('checkInDate', e.target.value || undefined)}
                placeholder="Check-in Date"
              />
            </CCol>
            <CCol md={2}>
              <div className="d-flex gap-2">
                <CButton color="outline-primary" onClick={handleSearch}>
                  <CIcon icon={cilSearch} />
                </CButton>
                <CButton color="outline-secondary" onClick={clearFilters}>
                  Clear
                </CButton>
              </div>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {/* Bookings Table */}
      <CCard>
        <CCardHeader>
          <h5 className="mb-0">All Bookings ({bookings.length})</h5>
        </CCardHeader>
        <CCardBody>
          <CTable hover responsive>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Booking Reference</CTableHeaderCell>
                <CTableHeaderCell>Guest</CTableHeaderCell>
                <CTableHeaderCell>Property</CTableHeaderCell>
                <CTableHeaderCell>Dates</CTableHeaderCell>
                <CTableHeaderCell>Status</CTableHeaderCell>
                <CTableHeaderCell>Payment</CTableHeaderCell>
                <CTableHeaderCell>Amount</CTableHeaderCell>
                <CTableHeaderCell>Actions</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {bookings.map((booking) => (
                <CTableRow key={booking.id}>
                  <CTableDataCell>
                    <div className="fw-bold">{booking.bookingReference}</div>
                    <small className="text-muted">
                      {booking.channel !== 'direct' && `via ${booking.channel}`}
                    </small>
                  </CTableDataCell>
                  <CTableDataCell>
                    <div>
                      {booking.guest ? (
                        <>
                          <div className="fw-bold">
                            {booking.guest.firstName} {booking.guest.lastName}
                          </div>
                          <small className="text-muted">{booking.guest.email}</small>
                        </>
                      ) : (
                        <span className="text-muted">Guest info not available</span>
                      )}
                    </div>
                  </CTableDataCell>
                  <CTableDataCell>
                    <div>
                      <div className="fw-bold">{booking.property?.name}</div>
                      <small className="text-muted">{booking.room?.name}</small>
                    </div>
                  </CTableDataCell>
                  <CTableDataCell>
                    <div>
                      <div>{new Date(booking.checkInDate).toLocaleDateString()}</div>
                      <small className="text-muted">
                        {booking.totalNights} night{booking.totalNights !== 1 ? 's' : ''}
                      </small>
                    </div>
                  </CTableDataCell>
                  <CTableDataCell>
                    {getBookingStatusBadge(booking.status)}
                  </CTableDataCell>
                  <CTableDataCell>
                    {getPaymentStatusBadge(booking.paymentStatus)}
                  </CTableDataCell>
                  <CTableDataCell>
                    <div className="fw-bold">{formatCurrency(booking.totalAmount)}</div>
                    <small className="text-muted">
                      {formatCurrency(booking.totalAmount / booking.totalNights)}/night
                    </small>
                  </CTableDataCell>
                  <CTableDataCell>
                    <CDropdown>
                      <CDropdownToggle color="light" size="sm">
                        <CIcon icon={cilOptions} />
                      </CDropdownToggle>
                      <CDropdownMenu>
                        <CDropdownItem as={Link} to={`/bookings/${booking.id}`}>
                          <CIcon icon={cilEye} className="me-2" />
                          View Details
                        </CDropdownItem>
                        {booking.status === 'confirmed' && (
                          <>
                            <CDropdownItem as={Link} to={`/bookings/${booking.id}/edit`}>
                              <CIcon icon={cilPencil} className="me-2" />
                              Edit
                            </CDropdownItem>
                            <CDropdownItem
                              className="text-danger"
                              onClick={() => setCancelModal({ show: true, booking })}
                            >
                              <CIcon icon={cilBan} className="me-2" />
                              Cancel
                            </CDropdownItem>
                          </>
                        )}
                      </CDropdownMenu>
                    </CDropdown>
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>

          {bookings.length === 0 && (
            <div className="text-center py-4 text-muted">
              <CIcon icon={cilCalendar} size="3xl" className="mb-3" />
              <h5>No bookings found</h5>
              <p>Bookings will appear here once guests make reservations.</p>
            </div>
          )}
        </CCardBody>
      </CCard>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-4">
          <nav aria-label="Bookings pagination">
            <ul className="pagination">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
              </li>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <li key={page} className={`page-item ${page === currentPage ? 'active' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                </li>
              ))}
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}

      {/* Cancel Booking Modal */}
      <CModal
        visible={cancelModal.show}
        onClose={() => setCancelModal({ show: false })}
      >
        <CModalHeader>
          <CModalTitle>Cancel Booking</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {cancelModal.booking && (
            <div>
              <p>Are you sure you want to cancel this booking?</p>
              <div className="bg-light p-3 rounded">
                <p className="mb-1">
                  <strong>Booking:</strong> {cancelModal.booking.bookingReference}
                </p>
                <p className="mb-1">
                  <strong>Guest:</strong> {cancelModal.booking.guest?.firstName} {cancelModal.booking.guest?.lastName}
                </p>
                <p className="mb-0">
                  <strong>Property:</strong> {cancelModal.booking.property?.name}
                </p>
              </div>
              <p className="text-danger mt-3 mb-0">
                <strong>Note:</strong> This action cannot be undone and may incur cancellation fees.
              </p>
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="outline-secondary"
            onClick={() => setCancelModal({ show: false })}
          >
            No, Keep Booking
          </CButton>
          <CButton
            color="danger"
            onClick={() => cancelModal.booking && handleCancelBooking(cancelModal.booking)}
          >
            Yes, Cancel Booking
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  );
};

export default Bookings;
