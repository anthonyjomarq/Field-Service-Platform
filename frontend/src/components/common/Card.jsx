export const Card = ({
  children,
  className = "",
  loading,
  error,
  ...props
}) => {
  if (loading)
    return (
      <div className="card card-loading">
        <div className="spinner" />
      </div>
    );
  if (error) return <div className="card card-error">{error}</div>;

  return (
    <div className={`card ${className}`} {...props}>
      {children}
    </div>
  );
};

Card.Header = ({ children, actions }) => (
  <div className="card-header">
    {children}
    {actions && <div className="card-actions">{actions}</div>}
  </div>
);

Card.Body = ({ children }) => <div className="card-body">{children}</div>;
Card.Footer = ({ children }) => <div className="card-footer">{children}</div>;
