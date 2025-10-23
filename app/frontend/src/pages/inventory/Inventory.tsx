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
  CFormSelect,
  CFormInput,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormLabel,
  CInputGroup,
  CInputGroupText,
  CAlert,
} from '@coreui/react';
import { cilCalendar, cilEdit, cilPlus, cilSave, cilX } from '@coreui/icons';
import CIcon from '@coreui/icons-react';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';

import { RoomInventory, InventoryFilters } from '../../types';
import { apiService } from '../../services/api.service';

const Inventory: React.FC = () => {
  const [inventory, setInventory] = useState<RoomInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<InventoryFilters>({});
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [editModal, setEditModal] = useState<{
    show: boolean;
    inventory?: RoomInventory;
  }>({ show: false });
  const [bulkUpdateModal, setBulkUpdateModal] = useState(false);
  const [bulkUpdateData, setBulkUpdateData] = useState({
    startDate: '',
    endDate: '',
    price: '',
    availableRooms: '',
  });

  useEffect(() => {
    loadInventory();
  }, [selectedDate, filters]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        startDate: selectedDate,
        endDate: selectedDate,
        ...filters,
      };

      const response = await apiService.get<any[]>('/inventory/calendar', params);

      setInventory(response.inventory || []);
    } catch (error: any) {
      setError(error.message || 'Failed to load inventory');
      console.error('Inventory error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof InventoryFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleEditInventory = (inv: RoomInventory) => {
    setEditModal({ show: true, inventory: inv });
  };

  const handleSaveInventory = async () => {
    if (!editModal.inventory) return;

    try {
      await apiService.put(`/inventory/${editModal.inventory.id}`, {
        availableRooms: editModal.inventory.availableRooms,
        price: editModal.inventory.price,
        minStay: editModal.inventory.minStay,
        closedToArrival: editModal.inventory.closedToArrival,
        closedToDeparture: editModal.inventory.closedToDeparture,
        stopSell: editModal.inventory.stopSell,
      });

      setEditModal({ show: false });
      loadInventory();
    } catch (error: any) {
      console.error('Save inventory error:', error);
      alert('Failed to save inventory');
    }
  };

  const handleBulkUpdate = async () => {
    try {
      const updates = [];
      const startDate = new Date(bulkUpdateData.startDate);
      const endDate = new Date(bulkUpdateData.endDate);

      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateStr = format(date, 'yyyy-MM-dd');

        // For each room/property combination, create update entry
        inventory.forEach(inv => {
          updates.push({
            roomId: inv.roomId,
            ratePlanId: inv.ratePlanId,
            date: dateStr,
            availableRooms: bulkUpdateData.availableRooms ? parseInt(bulkUpdateData.availableRooms) : undefined,
            price: bulkUpdateData.price ? parseFloat(bulkUpdateData.price) : undefined,
          });
        });
      }

      await apiService.put('/inventory/bulk-update', { updates });

      setBulkUpdateModal(false);
      setBulkUpdateData({ startDate: '', endDate: '', price: '', availableRooms: '' });
      loadInventory();
    } catch (error: any) {
      console.error('Bulk update error:', error);
      alert('Failed to update inventory');
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
            <h4>Error Loading Inventory</h4>
            <p>{error}</p>
            <CButton color="primary" onClick={loadInventory}>
              Try Again
            </CButton>
          </div>
        </CCardBody>
      </CCard>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusBadge = (inv: RoomInventory) => {
    if (inv.stopSell) {
      return <CBadge color="danger">Stop Sell</CBadge>;
    }
    if (inv.closedToArrival && inv.closedToDeparture) {
      return <CBadge color="warning">Closed</CBadge>;
    }
    if (inv.closedToArrival) {
      return <CBadge color="info">No Arrival</CBadge>;
    }
    if (inv.closedToDeparture) {
      return <CBadge color="secondary">No Departure</CBadge>;
    }
    return <CBadge color="success">Available</CBadge>;
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-0">Inventory Management</h2>
          <p className="text-muted">Manage room availability and pricing</p>
        </div>
        <div className="d-flex gap-2">
          <CButton color="outline-primary" onClick={() => setBulkUpdateModal(true)}>
            <CIcon icon={cilPlus} className="me-2" />
            Bulk Update
          </CButton>
        </div>
      </div>

      {/* Filters */}
      <CCard className="mb-4">
        <CCardBody>
          <CRow className="g-3">
            <CCol md={3}>
              <CFormLabel>Date</CFormLabel>
              <CFormInput
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </CCol>
            <CCol md={3}>
              <CFormLabel>Property</CFormLabel>
              <CFormSelect
                value={filters.propertyId || ''}
                onChange={(e) => handleFilterChange('propertyId', e.target.value || undefined)}
              >
                <option value="">All Properties</option>
                {/* Properties would be loaded here */}
                <option value="prop1">Sample Property 1</option>
                <option value="prop2">Sample Property 2</option>
              </CFormSelect>
            </CCol>
            <CCol md={3}>
              <CFormLabel>Room Type</CFormLabel>
              <CFormSelect
                value={filters.roomId || ''}
                onChange={(e) => handleFilterChange('roomId', e.target.value || undefined)}
              >
                <option value="">All Rooms</option>
                <option value="room1">Standard Room</option>
                <option value="room2">Deluxe Room</option>
                <option value="room3">Suite</option>
              </CFormSelect>
            </CCol>
            <CCol md={3}>
              <CFormLabel>Rate Plan</CFormLabel>
              <CFormSelect
                value={filters.ratePlanId || ''}
                onChange={(e) => handleFilterChange('ratePlanId', e.target.value || undefined)}
              >
                <option value="">All Rate Plans</option>
                <option value="plan1">Standard Rate</option>
                <option value="plan2">Member Rate</option>
              </CFormSelect>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {/* Inventory Table */}
      <CCard>
        <CCardHeader>
          <h5 className="mb-0">Inventory for {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}</h5>
        </CCardHeader>
        <CCardBody>
          <CTable hover responsive>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Room</CTableHeaderCell>
                <CTableHeaderCell>Rate Plan</CTableHeaderCell>
                <CTableHeaderCell>Available</CTableHeaderCell>
                <CTableHeaderCell>Total</CTableHeaderCell>
                <CTableHeaderCell>Price</CTableHeaderCell>
                <CTableHeaderCell>Min Stay</CTableHeaderCell>
                <CTableHeaderCell>Status</CTableHeaderCell>
                <CTableHeaderCell>Actions</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {inventory.map((inv) => (
                <CTableRow key={`${inv.roomId}-${inv.ratePlanId}-${inv.date}`}>
                  <CTableDataCell>
                    <div className="fw-bold">{inv.roomName || 'Room'}</div>
                    <small className="text-muted">{inv.roomType}</small>
                  </CTableDataCell>
                  <CTableDataCell>
                    <div className="fw-bold">{inv.ratePlanName}</div>
                    <small className="text-muted">{inv.planType}</small>
                  </CTableDataCell>
                  <CTableDataCell>
                    <span className={`fw-bold ${inv.availableRooms === 0 ? 'text-danger' : 'text-success'}`}>
                      {inv.availableRooms}
                    </span>
                  </CTableDataCell>
                  <CTableDataCell>{inv.totalRooms}</CTableDataCell>
                  <CTableDataCell>
                    <div className="fw-bold">{formatCurrency(inv.price)}</div>
                    <small className="text-muted">{inv.currency}</small>
                  </CTableDataCell>
                  <CTableDataCell>
                    {inv.minStay ? `${inv.minStay} night${inv.minStay !== 1 ? 's' : ''}` : 'None'}
                  </CTableDataCell>
                  <CTableDataCell>
                    {getStatusBadge(inv)}
                  </CTableDataCell>
                  <CTableDataCell>
                    <CButton
                      size="sm"
                      color="outline-primary"
                      onClick={() => handleEditInventory(inv)}
                    >
                      <CIcon icon={cilEdit} />
                    </CButton>
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>

          {inventory.length === 0 && (
            <div className="text-center py-4 text-muted">
              <CIcon icon={cilCalendar} size="3xl" className="mb-3" />
              <h5>No inventory data found</h5>
              <p>Set up room inventory for this date to see availability and pricing.</p>
            </div>
          )}
        </CCardBody>
      </CCard>

      {/* Edit Inventory Modal */}
      <CModal
        visible={editModal.show}
        onClose={() => setEditModal({ show: false })}
        size="lg"
      >
        <CModalHeader>
          <CModalTitle>Edit Inventory</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {editModal.inventory && (
            <CForm>
              <CRow className="mb-3">
                <CCol md={6}>
                  <CFormLabel>Available Rooms</CFormLabel>
                  <CFormInput
                    type="number"
                    min="0"
                    max={editModal.inventory.totalRooms}
                    value={editModal.inventory.availableRooms}
                    onChange={(e) => setEditModal(prev => prev.inventory ? {
                      ...prev,
                      inventory: { ...prev.inventory, availableRooms: parseInt(e.target.value) || 0 }
                    } : prev)}
                  />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Price</CFormLabel>
                  <CInputGroup>
                    <CInputGroupText>$</CInputGroupText>
                    <CFormInput
                      type="number"
                      step="0.01"
                      min="0"
                      value={editModal.inventory.price}
                      onChange={(e) => setEditModal(prev => prev.inventory ? {
                        ...prev,
                        inventory: { ...prev.inventory, price: parseFloat(e.target.value) || 0 }
                      } : prev)}
                    />
                  </CInputGroup>
                </CCol>
              </CRow>

              <CRow className="mb-3">
                <CCol md={6}>
                  <CFormLabel>Minimum Stay</CFormLabel>
                  <CFormInput
                    type="number"
                    min="1"
                    value={editModal.inventory.minStay || ''}
                    onChange={(e) => setEditModal(prev => prev.inventory ? {
                      ...prev,
                      inventory: { ...prev.inventory, minStay: parseInt(e.target.value) || undefined }
                    } : prev)}
                    placeholder="No minimum"
                  />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Restrictions</CFormLabel>
                  <div className="d-flex gap-2 flex-wrap">
                    <label className="form-check-label">
                      <input
                        type="checkbox"
                        className="form-check-input me-1"
                        checked={editModal.inventory.closedToArrival}
                        onChange={(e) => setEditModal(prev => prev.inventory ? {
                          ...prev,
                          inventory: { ...prev.inventory, closedToArrival: e.target.checked }
                        } : prev)}
                      />
                      Closed to Arrival
                    </label>
                    <label className="form-check-label">
                      <input
                        type="checkbox"
                        className="form-check-input me-1"
                        checked={editModal.inventory.closedToDeparture}
                        onChange={(e) => setEditModal(prev => prev.inventory ? {
                          ...prev,
                          inventory: { ...prev.inventory, closedToDeparture: e.target.checked }
                        } : prev)}
                      />
                      Closed to Departure
                    </label>
                    <label className="form-check-label">
                      <input
                        type="checkbox"
                        className="form-check-input me-1"
                        checked={editModal.inventory.stopSell}
                        onChange={(e) => setEditModal(prev => prev.inventory ? {
                          ...prev,
                          inventory: { ...prev.inventory, stopSell: e.target.checked }
                        } : prev)}
                      />
                      Stop Sell
                    </label>
                  </div>
                </CCol>
              </CRow>
            </CForm>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="outline-secondary"
            onClick={() => setEditModal({ show: false })}
          >
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleSaveInventory}>
            <CIcon icon={cilSave} className="me-2" />
            Save Changes
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Bulk Update Modal */}
      <CModal
        visible={bulkUpdateModal}
        onClose={() => setBulkUpdateModal(false)}
        size="lg"
      >
        <CModalHeader>
          <CModalTitle>Bulk Update Inventory</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CAlert color="info" className="mb-4">
            This will update all inventory items matching the current filters for the selected date range.
          </CAlert>

          <CForm>
            <CRow className="mb-3">
              <CCol md={6}>
                <CFormLabel>Start Date</CFormLabel>
                <CFormInput
                  type="date"
                  value={bulkUpdateData.startDate}
                  onChange={(e) => setBulkUpdateData(prev => ({ ...prev, startDate: e.target.value }))}
                  required
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>End Date</CFormLabel>
                <CFormInput
                  type="date"
                  value={bulkUpdateData.endDate}
                  onChange={(e) => setBulkUpdateData(prev => ({ ...prev, endDate: e.target.value }))}
                  required
                />
              </CCol>
            </CRow>

            <CRow className="mb-3">
              <CCol md={6}>
                <CFormLabel>Price (leave empty to keep current)</CFormLabel>
                <CInputGroup>
                  <CInputGroupText>$</CInputGroupText>
                  <CFormInput
                    type="number"
                    step="0.01"
                    min="0"
                    value={bulkUpdateData.price}
                    onChange={(e) => setBulkUpdateData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="Current price"
                  />
                </CInputGroup>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Available Rooms (leave empty to keep current)</CFormLabel>
                <CFormInput
                  type="number"
                  min="0"
                  value={bulkUpdateData.availableRooms}
                  onChange={(e) => setBulkUpdateData(prev => ({ ...prev, availableRooms: e.target.value }))}
                  placeholder="Current availability"
                />
              </CCol>
            </CRow>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton
            color="outline-secondary"
            onClick={() => setBulkUpdateModal(false)}
          >
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleBulkUpdate}>
            Update All
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  );
};

export default Inventory;
