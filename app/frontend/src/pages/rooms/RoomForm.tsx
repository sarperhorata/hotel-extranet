import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CInputGroup,
  CInputGroupText,
  CRow,
  CSpinner,
  CFormCheck,
  CAlert,
} from '@coreui/react';
import { cilSave, cilArrowLeft, cilBed } from '@coreui/icons';
import CIcon from '@coreui/icons-react';

import { Room, RoomForm as RoomFormData } from '../../types';
import { roomService } from '../../services/room.service';
import { useAuth } from '../../contexts/AuthContext';

const RoomForm: React.FC = () => {
  const { propertyId, id } = useParams<{ propertyId: string; id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState<RoomFormData>({
    name: '',
    roomType: 'standard',
    description: '',
    maxOccupancy: 2,
    maxAdults: 2,
    maxChildren: 0,
    amenities: [],
    images: [],
    bedType: 'Queen',
    size: 25,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const roomTypes = [
    'standard', 'deluxe', 'suite', 'presidential', 'family', 'business'
  ];

  const bedTypes = [
    'Single', 'Twin', 'Double', 'Queen', 'King', 'California King'
  ];

  const commonAmenities = [
    'Air Conditioning', 'WiFi', 'TV', 'Mini Bar', 'Safe', 'Balcony',
    'Ocean View', 'City View', 'Garden View', 'Kitchenette', 'Jacuzzi',
    'Work Desk', 'Sofa', 'Dining Table', 'Coffee Machine', 'Iron',
    'Hair Dryer', 'Bathrobe', 'Slippers', 'Room Service'
  ];

  useEffect(() => {
    if (id && propertyId) {
      setIsEditing(true);
      loadRoom();
    }
  }, [id, propertyId]);

  const loadRoom = async () => {
    if (!id || !propertyId) return;

    try {
      setLoading(true);
      setError(null);

      const room = await roomService.getRoom(propertyId, id);
      setFormData({
        name: room.name,
        roomType: room.roomType,
        description: room.description || '',
        maxOccupancy: room.maxOccupancy,
        maxAdults: room.maxAdults,
        maxChildren: room.maxChildren,
        amenities: room.amenities || [],
        images: room.images || [],
        bedType: room.bedType || 'Queen',
        size: room.size || 25,
      });
    } catch (error: any) {
      setError(error.message || 'Failed to load room details');
      console.error('Room load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else if (name === 'maxOccupancy' || name === 'maxAdults' || name === 'maxChildren' || name === 'size') {
      setFormData(prev => ({
        ...prev,
        [name]: parseInt(value) || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleAmenityChange = (amenity: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      amenities: checked
        ? [...prev.amenities, amenity]
        : prev.amenities.filter(a => a !== amenity)
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageUrls = files.map(file => URL.createObjectURL(file));
    
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...imageUrls]
    }));
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!propertyId) {
      setError('Property ID is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (isEditing && id) {
        await roomService.updateRoom(propertyId, id, formData);
      } else {
        await roomService.createRoom(propertyId, formData);
      }

      navigate(`/properties/${propertyId}/rooms`);
    } catch (error: any) {
      setError(error.message || 'Failed to save room');
      console.error('Room save error:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <CSpinner color="primary" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-4">
        <CButton
          color="secondary"
          variant="outline"
          onClick={() => navigate(`/properties/${propertyId}/rooms`)}
          className="me-2"
        >
          <CIcon icon={cilArrowLeft} className="me-2" />
          Back to Rooms
        </CButton>
        <h2 className="mb-0 d-inline-block ms-2">
          {isEditing ? 'Edit Room' : 'Add New Room'}
        </h2>
      </div>

      {error && (
        <CAlert color="danger" className="mb-4">
          {error}
        </CAlert>
      )}

      <CCard>
        <CCardHeader>
          <h5 className="mb-0">Room Information</h5>
        </CCardHeader>
        <CCardBody>
          <CForm onSubmit={handleSubmit}>
            <CRow>
              <CCol md={6}>
                <CFormLabel htmlFor="name">Room Name *</CFormLabel>
                <CFormInput
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Deluxe King Room"
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel htmlFor="roomType">Room Type *</CFormLabel>
                <CFormSelect
                  id="roomType"
                  name="roomType"
                  value={formData.roomType}
                  onChange={handleInputChange}
                  required
                >
                  {roomTypes.map(type => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
            </CRow>

            <CRow className="mt-3">
              <CCol>
                <CFormLabel htmlFor="description">Description</CFormLabel>
                <CFormTextarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Describe the room features and amenities..."
                />
              </CCol>
            </CRow>

            <CRow className="mt-3">
              <CCol md={3}>
                <CFormLabel htmlFor="maxOccupancy">Max Occupancy *</CFormLabel>
                <CFormInput
                  id="maxOccupancy"
                  name="maxOccupancy"
                  type="number"
                  value={formData.maxOccupancy}
                  onChange={handleInputChange}
                  required
                  min="1"
                  max="10"
                />
              </CCol>
              <CCol md={3}>
                <CFormLabel htmlFor="maxAdults">Max Adults *</CFormLabel>
                <CFormInput
                  id="maxAdults"
                  name="maxAdults"
                  type="number"
                  value={formData.maxAdults}
                  onChange={handleInputChange}
                  required
                  min="1"
                  max="10"
                />
              </CCol>
              <CCol md={3}>
                <CFormLabel htmlFor="maxChildren">Max Children</CFormLabel>
                <CFormInput
                  id="maxChildren"
                  name="maxChildren"
                  type="number"
                  value={formData.maxChildren}
                  onChange={handleInputChange}
                  min="0"
                  max="10"
                />
              </CCol>
              <CCol md={3}>
                <CFormLabel htmlFor="size">Room Size (m²)</CFormLabel>
                <CFormInput
                  id="size"
                  name="size"
                  type="number"
                  value={formData.size}
                  onChange={handleInputChange}
                  min="10"
                  max="500"
                />
              </CCol>
            </CRow>

            <CRow className="mt-3">
              <CCol md={6}>
                <CFormLabel htmlFor="bedType">Bed Type</CFormLabel>
                <CFormSelect
                  id="bedType"
                  name="bedType"
                  value={formData.bedType}
                  onChange={handleInputChange}
                >
                  {bedTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </CFormSelect>
              </CCol>
            </CRow>

            <CRow className="mt-4">
              <CCol>
                <CFormLabel>Room Amenities</CFormLabel>
                <div className="row">
                  {commonAmenities.map(amenity => (
                    <CCol md={4} key={amenity} className="mb-2">
                      <CFormCheck
                        id={`amenity-${amenity}`}
                        label={amenity}
                        checked={formData.amenities.includes(amenity)}
                        onChange={(e) => handleAmenityChange(amenity, e.target.checked)}
                      />
                    </CCol>
                  ))}
                </div>
              </CCol>
            </CRow>

            <CRow className="mt-4">
              <CCol>
                <CFormLabel>Room Images</CFormLabel>
                <CFormInput
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="mb-3"
                />
                
                {formData.images.length > 0 && (
                  <div className="row">
                    {formData.images.map((image, index) => (
                      <CCol md={3} key={index} className="mb-3">
                        <div className="position-relative">
                          <img
                            src={image}
                            alt={`Room ${index + 1}`}
                            className="img-fluid rounded"
                            style={{ height: '150px', objectFit: 'cover', width: '100%' }}
                          />
                          <CButton
                            color="danger"
                            size="sm"
                            className="position-absolute top-0 end-0 m-1"
                            onClick={() => removeImage(index)}
                          >
                            ×
                          </CButton>
                        </div>
                      </CCol>
                    ))}
                  </div>
                )}
              </CCol>
            </CRow>

            <CRow className="mt-4">
              <CCol>
                <CButton
                  type="submit"
                  color="primary"
                  disabled={saving}
                  className="me-2"
                >
                  {saving ? (
                    <>
                      <CSpinner size="sm" className="me-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CIcon icon={cilSave} className="me-2" />
                      {isEditing ? 'Update Room' : 'Create Room'}
                    </>
                  )}
                </CButton>
                <CButton
                  type="button"
                  color="secondary"
                  variant="outline"
                  onClick={() => navigate(`/properties/${propertyId}/rooms`)}
                >
                  Cancel
                </CButton>
              </CCol>
            </CRow>
          </CForm>
        </CCardBody>
      </CCard>
    </>
  );
};

export default RoomForm;
