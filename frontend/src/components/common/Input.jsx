export const Input = ({ label, error, required, helpText, icon, ...props }) => (
  <div className={`form-group ${error ? "has-error" : ""}`}>
    {label && (
      <label>
        {label} {required && <span className="required">*</span>}
      </label>
    )}
    <div className="input-wrapper">
      {icon && <span className="input-icon">{icon}</span>}
      <input className={`form-input ${icon ? "has-icon" : ""}`} {...props} />
    </div>
    {error && <span className="error-message">{error}</span>}
    {helpText && <span className="help-text">{helpText}</span>}
  </div>
);
