import React from "react";
import { Routes, Route } from "react-router-dom";

import { CustomerDetails } from "../components/customers/CustomerDetails";
import { CustomerForm } from "../components/customers/CustomerForm";
import { CustomerList } from "../components/customers/CustomerList";

const CustomersPage = () => {
  return (
    <div className="customers-page">
      <Routes>
        <Route index element={<CustomerList />} />
        <Route path="new" element={<CustomerForm />} />
        <Route path=":customerId" element={<CustomerDetails />} />
        <Route path=":customerId/edit" element={<CustomerForm />} />
      </Routes>
    </div>
  );
};

export default CustomersPage;
