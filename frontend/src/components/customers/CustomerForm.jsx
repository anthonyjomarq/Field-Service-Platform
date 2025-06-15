import React from "react";

export const CustomerForm = ({
  customer: _customer,
  onSave: _onSave,
  onCancel,
}) => {
  return (
    <div>
      <h3>Customer Form (Placeholder)</h3>
      <p>This component will be built soon</p>
      <button onClick={onCancel}>Cancel</button>
    </div>
  );
};
