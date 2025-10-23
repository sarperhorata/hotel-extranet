import React from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
} from '@coreui/react';
import { cilSettings } from '@coreui/icons';
import CIcon from '@coreui/icons-react';

const Channels: React.FC = () => {
  return (
    <>
      <div className="mb-4">
        <h2 className="mb-0">Channel Management</h2>
        <p className="text-muted">Manage channel manager integrations</p>
      </div>

      <CCard>
        <CCardHeader>
          <h5 className="mb-0">Channel Manager Integration</h5>
        </CCardHeader>
        <CCardBody>
          <div className="text-center py-5 text-muted">
            <CIcon icon={cilSettings} size="3xl" className="mb-3" />
            <h5>Channel Management Coming Soon</h5>
            <p>Configure Siteminder, Hotelrunner, Dingus, and other channel managers here.</p>
          </div>
        </CCardBody>
      </CCard>
    </>
  );
};

export default Channels;
