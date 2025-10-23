import React from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
} from '@coreui/react';
import { cilChartLine } from '@coreui/icons';
import CIcon from '@coreui/icons-react';

const Rates: React.FC = () => {
  return (
    <>
      <div className="mb-4">
        <h2 className="mb-0">Rate Management</h2>
        <p className="text-muted">Manage pricing and rate plans</p>
      </div>

      <CCard>
        <CCardHeader>
          <h5 className="mb-0">Rate Plans & Pricing</h5>
        </CCardHeader>
        <CCardBody>
          <div className="text-center py-5 text-muted">
            <CIcon icon={cilChartLine} size="3xl" className="mb-3" />
            <h5>Rate Management Coming Soon</h5>
            <p>Configure static and dynamic pricing, rate plans, and seasonal pricing here.</p>
          </div>
        </CCardBody>
      </CCard>
    </>
  );
};

export default Rates;
