export const Button = ({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  ...props
}) => (
  <button
    className={`btn btn-${variant} btn-${size} ${loading ? "loading" : ""}`}
    disabled={loading}
    {...props}
  >
    {icon && <span className="btn-icon">{icon}</span>}
    {loading ? <span className="spinner" /> : children}
  </button>
);
