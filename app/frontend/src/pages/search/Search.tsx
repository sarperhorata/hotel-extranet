import React, { useEffect, useState } from 'react';
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CInputGroup,
  CInputGroupText,
  CSpinner,
  CBadge,
  CAlert,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from '@coreui/react';
import { cilSearch, cilCalendar, cilPeople, cilBed, cilStar, cilLocationPin, cilDollar } from '@coreui/icons';
import CIcon from '@coreui/icons-react';
import { format, addDays } from 'date-fns';

import { SearchCriteria, SearchResult } from '../../types';
import { apiService } from '../../services/api.service';

const Search: React.FC = () => {
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria>({
    checkInDate: format(new Date(), 'yyyy-MM-dd'),
    checkOutDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    adults: 2,
    children: 0,
    rooms: 1,
    city: '',
    country: '',
    roomType: '',
    minPrice: undefined,
    maxPrice: undefined,
    amenities: [],
    sortBy: 'price',
    sortOrder: 'asc',
  });

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingModal, setBookingModal] = useState<{
    show: boolean;
    result?: SearchResult;
  }>({ show: false });

  useEffect(() => {
    loadSearchFilters();
  }, []);

  const loadSearchFilters = async () => {
    try {
      const filters = await apiService.get<any>('/search/filters');
      // Use filters data if needed
    } catch (error) {
      console.error('Failed to load search filters:', error);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchCriteria.checkInDate || !searchCriteria.checkOutDate) {
      setError('Please select check-in and check-out dates');
      return;
    }

    try {
      setSearching(true);
      setError(null);

      const results = await apiService.post<SearchResult[]>('/search/availability', searchCriteria);
      setSearchResults(results);
    } catch (error: any) {
      setError(error.message || 'Search failed');
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleInputChange = (field: keyof SearchCriteria, value: any) => {
    setSearchCriteria(prev => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStarRating = (rating: number) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  return (
    <>
      <div className="mb-4">
        <h2 className="mb-0">Search & Booking</h2>
        <p className="text-muted">Find and book available rooms</p>
      </div>

      <CRow>
        <CCol lg={4}>
          {/* Search Form */}
          <CCard className="mb-4">
            <CCardHeader>
              <h5 className="mb-0">Search Criteria</h5>
            </CCardHeader>
            <CCardBody>
              <CForm onSubmit={handleSearch}>
                {error && (
                  <CAlert color="danger" className="mb-3">
                    {error}
                  </CAlert>
                )}

                <CRow className="mb-3">
                  <CCol>
                    <CFormLabel>Check-in Date</CFormLabel>
                    <CFormInput
                      type="date"
                      value={searchCriteria.checkInDate}
                      onChange={(e) => handleInputChange('checkInDate', e.target.value)}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      required
                    />
                  </CCol>
                </CRow>

                <CRow className="mb-3">
                  <CCol>
                    <CFormLabel>Check-out Date</CFormLabel>
                    <CFormInput
                      type="date"
                      value={searchCriteria.checkOutDate}
                      onChange={(e) => handleInputChange('checkOutDate', e.target.value)}
                      min={searchCriteria.checkInDate || format(new Date(), 'yyyy-MM-dd')}
                      required
                    />
                  </CCol>
                </CRow>

                <CRow className="mb-3">
                  <CCol md={4}>
                    <CFormLabel>Adults</CFormLabel>
                    <CFormSelect
                      value={searchCriteria.adults}
                      onChange={(e) => handleInputChange('adults', parseInt(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5, 6].map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel>Children</CFormLabel>
                    <CFormSelect
                      value={searchCriteria.children}
                      onChange={(e) => handleInputChange('children', parseInt(e.target.value))}
                    >
                      {[0, 1, 2, 3, 4, 5, 6].map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel>Rooms</CFormLabel>
                    <CFormSelect
                      value={searchCriteria.rooms}
                      onChange={(e) => handleInputChange('rooms', parseInt(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5].map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </CFormSelect>
                  </CCol>
                </CRow>

                <CRow className="mb-3">
                  <CCol>
                    <CFormLabel>City</CFormLabel>
                    <CFormInput
                      type="text"
                      placeholder="Enter city name"
                      value={searchCriteria.city || ''}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                    />
                  </CCol>
                </CRow>

                <CRow className="mb-3">
                  <CCol>
                    <CFormLabel>Country</CFormLabel>
                    <CFormSelect
                      value={searchCriteria.country || ''}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                    >
                      <option value="">Any Country</option>
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Canada">Canada</option>
                      <option value="Australia">Australia</option>
                      <option value="Germany">Germany</option>
                      <option value="France">France</option>
                      <option value="Italy">Italy</option>
                      <option value="Spain">Spain</option>
                    </CFormSelect>
                  </CCol>
                </CRow>

                <CRow className="mb-3">
                  <CCol>
                    <CFormLabel>Room Type</CFormLabel>
                    <CFormSelect
                      value={searchCriteria.roomType || ''}
                      onChange={(e) => handleInputChange('roomType', e.target.value)}
                    >
                      <option value="">Any Type</option>
                      <option value="standard">Standard</option>
                      <option value="deluxe">Deluxe</option>
                      <option value="suite">Suite</option>
                      <option value="apartment">Apartment</option>
                    </CFormSelect>
                  </CCol>
                </CRow>

                <CRow className="mb-3">
                  <CCol md={6}>
                    <CFormLabel>Min Price</CFormLabel>
                    <CInputGroup>
                      <CInputGroupText>$</CInputGroupText>
                      <CFormInput
                        type="number"
                        min="0"
                        step="10"
                        value={searchCriteria.minPrice || ''}
                        onChange={(e) => handleInputChange('minPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="0"
                      />
                    </CInputGroup>
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel>Max Price</CFormLabel>
                    <CInputGroup>
                      <CInputGroupText>$</CInputGroupText>
                      <CFormInput
                        type="number"
                        min="0"
                        step="10"
                        value={searchCriteria.maxPrice || ''}
                        onChange={(e) => handleInputChange('maxPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="1000"
                      />
                    </CInputGroup>
                  </CCol>
                </CRow>

                <CRow className="mb-3">
                  <CCol>
                    <CFormLabel>Sort By</CFormLabel>
                    <CFormSelect
                      value={`${searchCriteria.sortBy}-${searchCriteria.sortOrder}`}
                      onChange={(e) => {
                        const [sortBy, sortOrder] = e.target.value.split('-');
                        handleInputChange('sortBy', sortBy as any);
                        handleInputChange('sortOrder', sortOrder as any);
                      }}
                    >
                      <option value="price-asc">Price (Low to High)</option>
                      <option value="price-desc">Price (High to Low)</option>
                      <option value="rating-desc">Rating (High to Low)</option>
                      <option value="name-asc">Name (A to Z)</option>
                    </CFormSelect>
                  </CCol>
                </CRow>

                <CButton
                  type="submit"
                  color="primary"
                  className="w-100"
                  disabled={searching}
                >
                  {searching ? (
                    <>
                      <CSpinner size="sm" className="me-2" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <CIcon icon={cilSearch} className="me-2" />
                      Search
                    </>
                  )}
                </CButton>
              </CForm>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol lg={8}>
          {/* Search Results */}
          <CCard>
            <CCardHeader>
              <h5 className="mb-0">Search Results ({searchResults.length})</h5>
            </CCardHeader>
            <CCardBody>
              {searchResults.length === 0 && !searching ? (
                <div className="text-center py-5 text-muted">
                  <CIcon icon={cilSearch} size="3xl" className="mb-3" />
                  <h5>No results found</h5>
                  <p>Try adjusting your search criteria to find available rooms.</p>
                </div>
              ) : (
                <CRow className="g-3">
                  {searchResults.map((result, index) => (
                    <CCol key={index} xs={12}>
                      <CCard className="h-100">
                        <CCardBody>
                          <CRow>
                            <CCol md={8}>
                              <div className="d-flex align-items-start">
                                <div className="me-3">
                                  <div className="text-warning mb-1">
                                    {getStarRating(result.property.starRating)}
                                  </div>
                                  <small className="text-muted">
                                    {result.property.starRating} stars
                                  </small>
                                </div>
                                <div className="flex-grow-1">
                                  <h6 className="mb-1">{result.property.name}</h6>
                                  <div className="d-flex align-items-center text-muted mb-2">
                                    <CIcon icon={cilLocationPin} className="me-1" />
                                    <small>
                                      {result.property.city}, {result.property.country}
                                    </small>
                                  </div>
                                  <p className="text-muted mb-2">
                                    {result.room.name} - {result.room.roomType}
                                  </p>
                                  <div className="mb-2">
                                    <CBadge color="info" className="me-2">
                                      Max {result.room.maxOccupancy} guests
                                    </CBadge>
                                    <CBadge color="success">
                                      {result.minAvailableRooms} available
                                    </CBadge>
                                  </div>
                                  {result.room.amenities.length > 0 && (
                                    <div className="mb-2">
                                      {result.room.amenities.slice(0, 3).map(amenity => (
                                        <CBadge key={amenity} color="light" className="me-1 mb-1">
                                          {amenity}
                                        </CBadge>
                                      ))}
                                      {result.room.amenities.length > 3 && (
                                        <CBadge color="light">
                                          +{result.room.amenities.length - 3} more
                                        </CBadge>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CCol>

                            <CCol md={4} className="text-end">
                              <div className="mb-2">
                                <div className="h5 mb-0 text-primary">
                                  {formatCurrency(result.avgPrice)}
                                </div>
                                <small className="text-muted">per night</small>
                              </div>

                              <div className="mb-2">
                                <div className="h6 mb-0 text-success">
                                  {formatCurrency(result.totalPrice)}
                                </div>
                                <small className="text-muted">for {result.totalNights} nights</small>
                              </div>

                              <CButton
                                color="primary"
                                className="w-100"
                                onClick={() => setBookingModal({ show: true, result })}
                              >
                                Book Now
                              </CButton>
                            </CCol>
                          </CRow>
                        </CCardBody>
                      </CCard>
                    </CCol>
                  ))}
                </CRow>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Booking Modal */}
      <CModal
        visible={bookingModal.show}
        onClose={() => setBookingModal({ show: false })}
        size="lg"
      >
        <CModalHeader>
          <CModalTitle>Confirm Booking</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {bookingModal.result && (
            <div>
              <CRow className="mb-3">
                <CCol md={8}>
                  <h6>{bookingModal.result.property.name}</h6>
                  <p className="text-muted mb-1">
                    {bookingModal.result.room.name} - {bookingModal.result.room.roomType}
                  </p>
                  <p className="text-muted">
                    {bookingModal.result.property.city}, {bookingModal.result.property.country}
                  </p>
                </CCol>
                <CCol md={4} className="text-end">
                  <div className="h5 text-primary mb-0">
                    {formatCurrency(bookingModal.result.avgPrice)}
                  </div>
                  <small className="text-muted">per night</small>
                </CCol>
              </CRow>

              <CRow className="mb-3">
                <CCol>
                  <CFormLabel>Guest Information</CFormLabel>
                  <CRow className="g-2">
                    <CCol md={6}>
                      <CFormInput placeholder="First Name" />
                    </CCol>
                    <CCol md={6}>
                      <CFormInput placeholder="Last Name" />
                    </CCol>
                    <CCol md={6}>
                      <CFormInput type="email" placeholder="Email" />
                    </CCol>
                    <CCol md={6}>
                      <CFormInput type="tel" placeholder="Phone" />
                    </CCol>
                  </CRow>
                </CCol>
              </CRow>

              <CRow>
                <CCol>
                  <CFormLabel>Special Requests (Optional)</CFormLabel>
                  <CFormInput
                    as="textarea"
                    rows={3}
                    placeholder="Any special requests or requirements..."
                  />
                </CCol>
              </CRow>
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="outline-secondary"
            onClick={() => setBookingModal({ show: false })}
          >
            Cancel
          </CButton>
          <CButton color="primary">
            Confirm Booking
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  );
};

export default Search;
