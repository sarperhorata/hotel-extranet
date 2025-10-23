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
import { cilSave, cilArrowLeft, cilImage } from '@coreui/icons';
import CIcon from '@coreui/icons-react';

import { Property, PropertyForm as PropertyFormData } from '../../types';
import { apiService } from '../../services/api.service';
import { useAuth } from '../../contexts/AuthContext';

const PropertyForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState<PropertyFormData>({
    name: '',
    description: '',
    address: '',
    city: '',
    country: '',
    zipCode: '',
    phone: '',
    email: '',
    website: '',
    starRating: 3,
    checkInTime: '15:00',
    checkOutTime: '11:00',
    amenities: [],
    images: [],
    latitude: undefined,
    longitude: undefined,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const countries = [
    'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany',
    'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Switzerland',
    'Austria', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Ireland',
    'Portugal', 'Greece', 'Turkey', 'Japan', 'South Korea', 'Singapore',
    'Thailand', 'Malaysia', 'Indonesia', 'Philippines', 'Vietnam', 'India',
    'China', 'Brazil', 'Argentina', 'Mexico', 'Chile', 'Peru', 'Colombia',
    'Ecuador', 'Uruguay', 'Paraguay', 'Bolivia', 'Venezuela'
  ];

  const commonAmenities = [
    'Free WiFi', 'Swimming Pool', 'Gym', 'Spa', 'Restaurant', 'Bar',
    'Room Service', 'Concierge', 'Business Center', 'Meeting Rooms',
    'Parking', 'Airport Shuttle', 'Pet Friendly', 'Laundry Service',
    'Air Conditioning', 'Heating', 'Elevator', '24/7 Front Desk',
    'Non-smoking Rooms', 'Family Rooms', 'Disabled Access'
  ];

  useEffect(() => {
    if (id) {
      loadProperty(id);
      setIsEditing(true);
    }
  }, [id]);

  const loadProperty = async (propertyId: string) => {
    try {
      setLoading(true);
      setError(null);

      const property = await apiService.get<Property>(`/properties/${propertyId}`);
      setFormData({
        name: property.name,
        description: property.description || '',
        address: property.address,
        city: property.city,
        country: property.country,
        zipCode: property.zipCode || '',
        phone: property.phone || '',
        email: property.email || '',
        website: property.website || '',
        starRating: property.starRating,
        checkInTime: property.checkInTime,
        checkOutTime: property.checkOutTime,
        amenities: property.amenities,
        images: property.images,
        latitude: property.latitude,
        longitude: property.longitude,
      });
    } catch (error: any) {
      setError(error.message || 'Failed to load property');
      console.error('Load property error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof PropertyFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAmenityToggle = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleImageUrlAdd = () => {
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, '']
    }));
  };

  const handleImageUrlChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.map((img, i) => i === index ? value : img)
    }));
  };

  const handleImageUrlRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Property name is required');
      return false;
    }

    if (!formData.address.trim()) {
      setError('Address is required');
      return false;
    }

    if (!formData.city.trim()) {
      setError('City is required');
      return false;
    }

    if (!formData.country.trim()) {
      setError('Country is required');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSaving(true);
      setError(null);

      // Remove empty image URLs
      const cleanedFormData = {
        ...formData,
        images: formData.images.filter(img => img.trim() !== ''),
        description: formData.description.trim() || undefined,
        zipCode: formData.zipCode.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        website: formData.website.trim() || undefined,
        latitude: formData.latitude || undefined,
        longitude: formData.longitude || undefined,
      };

      if (isEditing && id) {
        await apiService.put(`/properties/${id}`, cleanedFormData);
      } else {
        await apiService.post('/properties', cleanedFormData);
      }

      navigate('/properties');
    } catch (error: any) {
      setError(error.message || 'Failed to save property');
      console.error('Save property error:', error);
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-0">{isEditing ? 'Edit Property' : 'Add Property'}</h2>
          <p className="text-muted">
            {isEditing ? 'Update property information' : 'Create a new property'}
          </p>
        </div>
        <CButton color="outline-secondary" onClick={() => navigate('/properties')}>
          <CIcon icon={cilArrowLeft} className="me-2" />
          Back to Properties
        </CButton>
      </div>

      <CRow>
        <CCol lg={8}>
          <CCard>
            <CCardHeader>
              <h5 className="mb-0">Property Details</h5>
            </CCardHeader>
            <CCardBody>
              <CForm onSubmit={handleSubmit}>
                {error && (
                  <CAlert color="danger" className="mb-4">
                    {error}
                  </CAlert>
                )}

                <CRow className="mb-3">
                  <CCol md={6}>
                    <CFormLabel htmlFor="name">Property Name *</CFormLabel>
                    <CFormInput
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel htmlFor="starRating">Star Rating</CFormLabel>
                    <CFormSelect
                      id="starRating"
                      value={formData.starRating}
                      onChange={(e) => handleInputChange('starRating', parseInt(e.target.value))}
                    >
                      <option value={1}>1 Star</option>
                      <option value={2}>2 Stars</option>
                      <option value={3}>3 Stars</option>
                      <option value={4}>4 Stars</option>
                      <option value={5}>5 Stars</option>
                    </CFormSelect>
                  </CCol>
                </CRow>

                <CRow className="mb-3">
                  <CCol>
                    <CFormLabel htmlFor="description">Description</CFormLabel>
                    <CFormTextarea
                      id="description"
                      rows={3}
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Brief description of the property..."
                    />
                  </CCol>
                </CRow>

                <CRow className="mb-3">
                  <CCol>
                    <CFormLabel htmlFor="address">Address *</CFormLabel>
                    <CFormInput
                      id="address"
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      required
                    />
                  </CCol>
                </CRow>

                <CRow className="mb-3">
                  <CCol md={4}>
                    <CFormLabel htmlFor="city">City *</CFormLabel>
                    <CFormInput
                      id="city"
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      required
                    />
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel htmlFor="country">Country *</CFormLabel>
                    <CFormSelect
                      id="country"
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      required
                    >
                      <option value="">Select Country</option>
                      {countries.map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel htmlFor="zipCode">ZIP Code</CFormLabel>
                    <CFormInput
                      id="zipCode"
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                    />
                  </CCol>
                </CRow>

                <CRow className="mb-3">
                  <CCol md={4}>
                    <CFormLabel htmlFor="phone">Phone</CFormLabel>
                    <CFormInput
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                    />
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel htmlFor="email">Email</CFormLabel>
                    <CFormInput
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                    />
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel htmlFor="website">Website</CFormLabel>
                    <CFormInput
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      placeholder="https://"
                    />
                  </CCol>
                </CRow>

                <CRow className="mb-3">
                  <CCol md={6}>
                    <CFormLabel htmlFor="checkInTime">Check-in Time</CFormLabel>
                    <CFormInput
                      id="checkInTime"
                      type="time"
                      value={formData.checkInTime}
                      onChange={(e) => handleInputChange('checkInTime', e.target.value)}
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel htmlFor="checkOutTime">Check-out Time</CFormLabel>
                    <CFormInput
                      id="checkOutTime"
                      type="time"
                      value={formData.checkOutTime}
                      onChange={(e) => handleInputChange('checkOutTime', e.target.value)}
                    />
                  </CCol>
                </CRow>

                <CRow className="mb-3">
                  <CCol md={6}>
                    <CFormLabel htmlFor="latitude">Latitude</CFormLabel>
                    <CFormInput
                      id="latitude"
                      type="number"
                      step="any"
                      value={formData.latitude || ''}
                      onChange={(e) => handleInputChange('latitude', e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="40.7128"
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel htmlFor="longitude">Longitude</CFormLabel>
                    <CFormInput
                      id="longitude"
                      type="number"
                      step="any"
                      value={formData.longitude || ''}
                      onChange={(e) => handleInputChange('longitude', e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="-74.0060"
                    />
                  </CCol>
                </CRow>

                <CRow className="mb-4">
                  <CCol>
                    <CFormLabel>Amenities</CFormLabel>
                    <div className="border rounded p-3">
                      <CRow className="g-2">
                        {commonAmenities.map(amenity => (
                          <CCol key={amenity} xs={6} sm={4} md={3}>
                            <CFormCheck
                              id={`amenity-${amenity}`}
                              label={amenity}
                              checked={formData.amenities.includes(amenity)}
                              onChange={() => handleAmenityToggle(amenity)}
                            />
                          </CCol>
                        ))}
                      </CRow>
                    </div>
                  </CCol>
                </CRow>

                <CRow className="mb-4">
                  <CCol>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <CFormLabel>Property Images</CFormLabel>
                      <CButton type="button" size="sm" onClick={handleImageUrlAdd}>
                        <CIcon icon={cilImage} className="me-1" />
                        Add Image
                      </CButton>
                    </div>
                    {formData.images.map((image, index) => (
                      <CRow key={index} className="mb-2">
                        <CCol>
                          <CInputGroup>
                            <CInputGroupText>URL {index + 1}</CInputGroupText>
                            <CFormInput
                              type="url"
                              value={image}
                              onChange={(e) => handleImageUrlChange(index, e.target.value)}
                              placeholder="https://example.com/image.jpg"
                            />
                            <CButton
                              type="button"
                              color="outline-danger"
                              onClick={() => handleImageUrlRemove(index)}
                            >
                              Remove
                            </CButton>
                          </CInputGroup>
                        </CCol>
                      </CRow>
                    ))}
                  </CCol>
                </CRow>

                <div className="d-flex gap-2">
                  <CButton
                    type="submit"
                    color="primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <CSpinner size="sm" className="me-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CIcon icon={cilSave} className="me-2" />
                        {isEditing ? 'Update Property' : 'Create Property'}
                      </>
                    )}
                  </CButton>
                  <CButton
                    type="button"
                    color="outline-secondary"
                    onClick={() => navigate('/properties')}
                  >
                    Cancel
                  </CButton>
                </div>
              </CForm>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol lg={4}>
          <CCard>
            <CCardHeader>
              <h6 className="mb-0">Selected Amenities</h6>
            </CCardHeader>
            <CCardBody>
              {formData.amenities.length === 0 ? (
                <p className="text-muted">No amenities selected</p>
              ) : (
                <div className="d-flex flex-wrap gap-1">
                  {formData.amenities.map(amenity => (
                    <span key={amenity} className="badge bg-primary me-1 mb-1">
                      {amenity}
                    </span>
                  ))}
                </div>
              )}
            </CCardBody>
          </CCard>

          {formData.images.length > 0 && (
            <CCard className="mt-3">
              <CCardHeader>
                <h6 className="mb-0">Images Preview</h6>
              </CCardHeader>
              <CCardBody>
                <div className="d-flex flex-column gap-2">
                  {formData.images.filter(img => img.trim()).map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`Property image ${index + 1}`}
                      className="img-fluid rounded"
                      style={{ maxHeight: '100px', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-property.jpg';
                      }}
                    />
                  ))}
                </div>
              </CCardBody>
            </CCard>
          )}
        </CCol>
      </CRow>
    </>
  );
};

export default PropertyForm;
