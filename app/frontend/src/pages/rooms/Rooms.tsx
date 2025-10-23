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
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
} from '@coreui/react';
import { cilPlus, cilSearch, cilOptions, cilPencil, cilTrash, cilBed } from '@coreui/icons';
import CIcon from '@coreui/icons-react';

const Rooms: React.FC = () => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock data for now
      setRooms([
        {
          id: '1',
          name: 'Standard Room',
          roomType: 'standard',
          maxOccupancy: 2,
          maxAdults: 2,
          maxChildren: 0,
          isActive: true,
          propertyName: 'Hotel ABC',
          createdAt: '2024-01-15'
        },
        {
          id: '2',
          name: 'Deluxe Room',
          roomType: 'deluxe',
          maxOccupancy: 4,
          maxAdults: 2,
          maxChildren: 2,
          isActive: true,
          propertyName: 'Hotel ABC',
          createdAt: '2024-01-15'
        }
      ]);
    } catch (error: any) {
      setError(error.message || 'Failed to load rooms');
      console.error('Rooms error:', error);
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
            <h4>Error Loading Rooms</h4>
            <p>{error}</p>
            <CButton color="primary" onClick={loadRooms}>
              Try Again
            </CButton>
          </div>
        </CCardBody>
      </CCard>
    );
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-0">Rooms</h2>
          <p className="text-muted">Manage room types and configurations</p>
        </div>
        <Link to="/rooms/new">
          <CButton color="primary">
            <CIcon icon={cilPlus} className="me-2" />
            Add Room
          </CButton>
        </Link>
      </div>

      <CCard>
        <CCardHeader>
          <h5 className="mb-0">All Rooms ({rooms.length})</h5>
        </CCardHeader>
        <CCardBody>
          <CTable hover responsive>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Name</CTableHeaderCell>
                <CTableHeaderCell>Type</CTableHeaderCell>
                <CTableHeaderCell>Occupancy</CTableHeaderCell>
                <CTableHeaderCell>Property</CTableHeaderCell>
                <CTableHeaderCell>Status</CTableHeaderCell>
                <CTableHeaderCell>Created</CTableHeaderCell>
                <CTableHeaderCell>Actions</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {rooms.map((room) => (
                <CTableRow key={room.id}>
                  <CTableDataCell>
                    <div className="d-flex align-items-center">
                      <CIcon icon={cilBed} className="me-2 text-muted" />
                      <div>
                        <div className="fw-bold">{room.name}</div>
                        <small className="text-muted">Max {room.maxOccupancy} guests</small>
                      </div>
                    </div>
                  </CTableDataCell>
                  <CTableDataCell>
                    <CBadge color="info">{room.roomType}</CBadge>
                  </CTableDataCell>
                  <CTableDataCell>
                    <div>
                      <div>{room.maxAdults} adults</div>
                      <small className="text-muted">{room.maxChildren} children</small>
                    </div>
                  </CTableDataCell>
                  <CTableDataCell>{room.propertyName}</CTableDataCell>
                  <CTableDataCell>
                    <CBadge color={room.isActive ? 'success' : 'danger'}>
                      {room.isActive ? 'Active' : 'Inactive'}
                    </CBadge>
                  </CTableDataCell>
                  <CTableDataCell>
                    {new Date(room.createdAt).toLocaleDateString()}
                  </CTableDataCell>
                  <CTableDataCell>
                    <CDropdown>
                      <CDropdownToggle color="light" size="sm">
                        <CIcon icon={cilOptions} />
                      </CDropdownToggle>
                      <CDropdownMenu>
                        <CDropdownItem as={Link} to={`/rooms/${room.id}/edit`}>
                          <CIcon icon={cilPencil} className="me-2" />
                          Edit
                        </CDropdownItem>
                        <CDropdownItem className="text-danger">
                          <CIcon icon={cilTrash} className="me-2" />
                          Delete
                        </CDropdownItem>
                      </CDropdownMenu>
                    </CDropdown>
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>

          {rooms.length === 0 && (
            <div className="text-center py-4 text-muted">
              <CIcon icon={cilBed} size="3xl" className="mb-3" />
              <h5>No rooms found</h5>
              <p>Get started by adding your first room type.</p>
              <Link to="/rooms/new">
                <CButton color="primary">
                  <CIcon icon={cilPlus} className="me-2" />
                  Add Room
                </CButton>
              </Link>
            </div>
          )}
        </CCardBody>
      </CCard>
    </>
  );
};

export default Rooms;
