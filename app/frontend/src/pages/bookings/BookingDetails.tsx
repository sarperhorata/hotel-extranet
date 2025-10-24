import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  CAlert,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormInput,
  CFormLabel,
} from '@coreui/react';
import { cilArrowLeft, cilPencil, cilTrash, cilPrint, cilEnvelopeClosed } from '@coreui/icons';
import CIcon from '@coreui/icons-react';

import { Booking } from '../../types';
import { bookingService } from '../../services/booking.service';
import { notificationService } from '../../services/notification.service';

const BookingDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (id) {
      loadBooking();
    }
  }, [id]);

  const loadBooking = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const bookingData = await bookingService.getBooking(id);
      setBooking(bookingData);
    } catch (error: any) {
      setError(error.message || 'Failed to load booking details');
      console.error('Booking load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!id) return;

    try {
      await bookingService.cancelBooking(id, cancelReason);
      setCancelModal(false);
      setCancelReason('');
      loadBooking(); // Reload to get updated status
    } catch (error: any) {
      setError(error.message || 'Failed to cancel booking');
      console.error('Cancel booking error:', error);
    }
  };

  const handleSendConfirmation = async () => {
    if (!booking) return;

    try {
      setSendingEmail(true);
      await notificationService.sendBookingConfirmation(booking.id, booking.guestEmail);
      // Show success message
    } catch (error: any) {
      setError(error.message || 'Failed to send confirmation email');
      console.error('Send email error:', error);
    } finally {
      setSendingEmail(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      confirmed: { color: 'success', text: 'Confirmed' },
      cancelled: { color: 'danger', text: 'Cancelled' },
      completed: { color: 'info', text: 'Completed' },
      no_show: { color: 'warning', text: 'No Show' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'secondary', text: status };
    return <CBadge color={config.color}>{config.text}</CBadge>;
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { color: 'success', text: 'Paid' },
      pending: { color: 'warning', text: 'Pending' },
      refunded: { color: 'info', text: 'Refunded' },
      failed: { color: 'danger', text: 'Failed' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'secondary', text: status };
    return <CBadge color={config.color}>{config.text}</CBadge>;
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
      <CAlert color="danger" className="mb-4">
        {error}
      </CAlert>
    );
  }

  if (!booking) {
    return (
      <CAlert color="warning" className="mb-4">
        Booking not found
      </CAlert>
    );
  }

  return (
    <>
      <div className="mb-4">
        <CButton
          color="secondary"
          variant="outline"
          onClick={() => navigate('/bookings')}
          className="me-2"
        >
          <CIcon icon={cilArrowLeft} className="me-2" />
          Back to Bookings
        </CButton>
        <h2 className="mb-0 d-inline-block ms-2">
          Booking Details - {booking.bookingReference}
        </h2>
      </div>

      <CRow>
        <CCol md={8}>
          <CCard className="mb-4">
            <CCardHeader>
              <h5 className="mb-0">Booking Information</h5>
            </CCardHeader>
            <CCardBody>
              <CTable responsive>
                <CTableBody>
                  <CTableRow>
                    <CTableHeaderCell>Booking Reference</CTableHeaderCell>
                    <CTableDataCell>
                      <strong>{booking.bookingReference}</strong>
                    </CTableDataCell>
                  </CTableRow>
                  <CTableRow>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableDataCell>
                      {getStatusBadge(booking.status)}
                    </CTableDataCell>
                  </CTableRow>
                  <CTableRow>
                    <CTableHeaderCell>Check-in Date</CTableHeaderCell>
                    <CTableDataCell>
                      {new Date(booking.checkInDate).toLocaleDateString()}
                    </CTableDataCell>
                  </CTableRow>
                  <CTableRow>
                    <CTableHeaderCell>Check-out Date</CTableHeaderCell>
                    <CTableDataCell>
                      {new Date(booking.checkOutDate).toLocaleDateString()}
                    </CTableDataCell>
                  </CTableRow>
                  <CTableRow>
                    <CTableHeaderCell>Duration</CTableHeaderCell>
                    <CTableDataCell>
                      {Math.ceil((new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / (1000 * 60 * 60 * 24))} nights
                    </CTableDataCell>
                  </CTableRow>
                  <CTableRow>
                    <CTableHeaderCell>Guests</CTableHeaderCell>
                    <CTableDataCell>
                      {booking.adults} adults, {booking.children} children
                    </CTableDataCell>
                  </CTableRow>
                  <CTableRow>
                    <CTableHeaderCell>Rooms</CTableHeaderCell>
                    <CTableDataCell>
                      {booking.rooms}
                    </CTableDataCell>
                  </CTableRow>
                  <CTableRow>
                    <CTableHeaderCell>Total Amount</CTableHeaderCell>
                    <CTableDataCell>
                      <strong>{booking.currency} {booking.totalAmount.toFixed(2)}</strong>
                    </CTableDataCell>
                  </CTableRow>
                  <CTableRow>
                    <CTableHeaderCell>Payment Status</CTableHeaderCell>
                    <CTableDataCell>
                      {getPaymentStatusBadge(booking.paymentStatus)}
                    </CTableDataCell>
                  </CTableRow>
                  <CTableRow>
                    <CTableHeaderCell>Created</CTableHeaderCell>
                    <CTableDataCell>
                      {new Date(booking.createdAt).toLocaleString()}
                    </CTableDataCell>
                  </CTableRow>
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>

          <CCard className="mb-4">
            <CCardHeader>
              <h5 className="mb-0">Guest Information</h5>
            </CCardHeader>
            <CCardBody>
              <CTable responsive>
                <CTableBody>
                  <CTableRow>
                    <CTableHeaderCell>Name</CTableHeaderCell>
                    <CTableDataCell>
                      {booking.guestFirstName} {booking.guestLastName}
                    </CTableDataCell>
                  </CTableRow>
                  <CTableRow>
                    <CTableHeaderCell>Email</CTableHeaderCell>
                    <CTableDataCell>
                      {booking.guestEmail}
                    </CTableDataCell>
                  </CTableRow>
                  <CTableRow>
                    <CTableHeaderCell>Phone</CTableHeaderCell>
                    <CTableDataCell>
                      {booking.guestPhone}
                    </CTableDataCell>
                  </CTableRow>
                  {booking.specialRequests && (
                    <CTableRow>
                      <CTableHeaderCell>Special Requests</CTableHeaderCell>
                      <CTableDataCell>
                        {booking.specialRequests}
                      </CTableDataCell>
                    </CTableRow>
                  )}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol md={4}>
          <CCard className="mb-4">
            <CCardHeader>
              <h5 className="mb-0">Actions</h5>
            </CCardHeader>
            <CCardBody>
              <div className="d-grid gap-2">
                <CButton
                  color="primary"
                  variant="outline"
                  onClick={handleSendConfirmation}
                  disabled={sendingEmail}
                >
                  {sendingEmail ? (
                    <>
                      <CSpinner size="sm" className="me-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <CIcon icon={cilEnvelopeClosed} className="me-2" />
                      Send Confirmation
                    </>
                  )}
                </CButton>

                <CButton color="secondary" variant="outline">
                  <CIcon icon={cilPencil} className="me-2" />
                  Edit Booking
                </CButton>

                <CButton color="secondary" variant="outline">
                  <CIcon icon={cilPrint} className="me-2" />
                  Print Booking
                </CButton>

                {booking.status === 'confirmed' && (
                  <CButton
                    color="danger"
                    variant="outline"
                    onClick={() => setCancelModal(true)}
                  >
                    <CIcon icon={cilTrash} className="me-2" />
                    Cancel Booking
                  </CButton>
                )}
              </div>
            </CCardBody>
          </CCard>

          <CCard>
            <CCardHeader>
              <h5 className="mb-0">Property Information</h5>
            </CCardHeader>
            <CCardBody>
              <p><strong>Property:</strong> {booking.propertyName}</p>
              <p><strong>Room:</strong> {booking.roomName}</p>
              <p><strong>Room Type:</strong> {booking.roomType}</p>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Cancel Booking Modal */}
      <CModal visible={cancelModal} onClose={() => setCancelModal(false)}>
        <CModalHeader>
          <CModalTitle>Cancel Booking</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CFormLabel htmlFor="cancelReason">Reason for Cancellation</CFormLabel>
          <CFormInput
            id="cancelReason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Enter reason for cancellation..."
          />
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setCancelModal(false)}>
            Cancel
          </CButton>
          <CButton color="danger" onClick={handleCancelBooking}>
            Confirm Cancellation
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  );
};

export default BookingDetails;
