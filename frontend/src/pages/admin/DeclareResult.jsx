import React from 'react';
import { Navigate } from 'react-router-dom';

const DeclareResult = () => {
  return <Navigate to="/admin" state={{ activeTab: 'declare_result' }} replace />;
};

export default DeclareResult;
