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
  CInputGroup,
  CInputGroupText,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
} from '@coreui/react';
import { cilPlus, cilSearch, cilOptions, cilPencil, cilTrash, cilBuilding } from '@coreui/icons';
import CIcon from '@coreui/icons-react';

import { Property, PropertyFilters } from '../../types';
import { apiService } from '../../services/api.service';
import { useAuth } from '../../contexts/AuthContext';

const Properties: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PropertyFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const { user } = useAuth();

  useEffect(() => {
    loadProperties();
  }, [currentPage, filters]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        limit: 10,
        ...filters,
        search: searchTerm || undefined,
      };

      const response = await apiService.getPaginated<Property>('/properties', params);

      setProperties(response.items);
      setTotalPages(response.pagination.totalPages);
    } catch (error: any) {
      setError(error.message || 'Failed to load properties');
      console.error('Properties error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadProperties();
  };

  const handleFilterChange = (key: keyof PropertyFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleDeleteProperty = async (propertyId: string) => {
    if (!window.confirm('Are you sure you want to delete this property?')) return;

    try {
      await apiService.delete(`/properties/${propertyId}`);
      loadProperties();
    } catch (error: any) {
      console.error('Delete property error:', error);
      alert('Failed to delete property');
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
            <h4>Error Loading Properties</h4>
            <p>{error}</p>
            <CButton color="primary" onClick={loadProperties}>
              Try Again
            </CButton>
          </div>
        </CCardBody>
      </CCard>
    );
  }

  const getStarRating = (rating: number) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-0">Properties</h2>
          <p className="text-muted">Manage your hotel properties</p>
        </div>
        <Link to="/properties/new">
          <CButton color="primary">
            <CIcon icon={cilPlus} className="me-2" />
            Add Property
          </CButton>
        </Link>
      </div>

      {/* Filters */}
      <CCard className="mb-4">
        <CCardBody>
          <CRow className="g-3">
            <CCol md={6}>
              <CFormInput
                type="text"
                placeholder="Search properties..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch(e)}
              />
            </CCol>
            <CCol md={2}>
              <CFormInput
                type="text"
                placeholder="City"
                value={filters.city || ''}
                onChange={(e) => handleFilterChange('city', e.target.value)}
              />
            </CCol>
            <CCol md={2}>
              <select
                className="form-select"
                value={filters.starRating || ''}
                onChange={(e) => handleFilterChange('starRating', e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">All Ratings</option>
                <option value="1">1 Star</option>
                <option value="2">2 Stars</option>
                <option value="3">3 Stars</option>
                <option value="4">4 Stars</option>
                <option value="5">5 Stars</option>
              </select>
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

      {/* Properties Table */}
      <CCard>
        <CCardHeader>
          <h5 className="mb-0">All Properties ({properties.length})</h5>
        </CCardHeader>
        <CCardBody>
          <CTable hover responsive>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Name</CTableHeaderCell>
                <CTableHeaderCell>Location</CTableHeaderCell>
                <CTableHeaderCell>Rating</CTableHeaderCell>
                <CTableHeaderCell>Status</CTableHeaderCell>
                <CTableHeaderCell>Created</CTableHeaderCell>
                <CTableHeaderCell>Actions</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {properties.map((property) => (
                <CTableRow key={property.id}>
                  <CTableDataCell>
                    <div className="d-flex align-items-center">
                      <CIcon icon={cilBuilding} className="me-2 text-muted" />
                      <div>
                        <div className="fw-bold">{property.name}</div>
                        <small className="text-muted">{property.address}</small>
                      </div>
                    </div>
                  </CTableDataCell>
                  <CTableDataCell>
                    {property.city}, {property.country}
                  </CTableDataCell>
                  <CTableDataCell>
                    <span className="text-warning">
                      {getStarRating(property.starRating)}
                    </span>
                    <small className="text-muted d-block">{property.starRating} stars</small>
                  </CTableDataCell>
                  <CTableDataCell>
                    <CBadge color={property.isActive ? 'success' : 'danger'}>
                      {property.isActive ? 'Active' : 'Inactive'}
                    </CBadge>
                  </CTableDataCell>
                  <CTableDataCell>
                    {new Date(property.createdAt).toLocaleDateString()}
                  </CTableDataCell>
                  <CTableDataCell>
                    <CDropdown>
                      <CDropdownToggle color="light" size="sm">
                        <CIcon icon={cilOptions} />
                      </CDropdownToggle>
                      <CDropdownMenu>
                        <CDropdownItem as={Link} to={`/properties/${property.id}/edit`}>
                          <CIcon icon={cilPencil} className="me-2" />
                          Edit
                        </CDropdownItem>
                        <CDropdownItem as={Link} to={`/rooms?propertyId=${property.id}`}>
                          <CIcon icon={cilBuilding} className="me-2" />
                          View Rooms
                        </CDropdownItem>
                        <CDropdownDivider />
                        <CDropdownItem
                          className="text-danger"
                          onClick={() => handleDeleteProperty(property.id)}
                        >
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

          {properties.length === 0 && (
            <div className="text-center py-4 text-muted">
              <CIcon icon={cilBuilding} size="3xl" className="mb-3" />
              <h5>No properties found</h5>
              <p>Get started by adding your first property.</p>
              <Link to="/properties/new">
                <CButton color="primary">
                  <CIcon icon={cilPlus} className="me-2" />
                  Add Property
                </CButton>
              </Link>
            </div>
          )}
        </CCardBody>
      </CCard>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-4">
          <nav aria-label="Properties pagination">
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
    </>
  );
};

export default Properties;
