import { useState } from "react";

export const useForm = (initialValues, validationRules = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));

    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    validateField(name, values[name]);
  };

  const validateField = (name, value) => {
    const rule = validationRules[name];
    if (!rule) return;

    let error = "";
    if (rule.required && !value) {
      error = rule.message || `${name} is required`;
    } else if (rule.pattern && !rule.pattern.test(value)) {
      error = rule.message || `${name} is invalid`;
    } else if (rule.validate) {
      error = rule.validate(value, values);
    }

    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleSubmit = (onSubmit) => (e) => {
    e.preventDefault();

    // Validate all fields
    const newErrors = {};
    Object.keys(validationRules).forEach((name) => {
      const rule = validationRules[name];
      const value = values[name];

      if (rule.required && !value) {
        newErrors[name] = rule.message || `${name} is required`;
      }
    });

    if (Object.keys(newErrors).length === 0) {
      onSubmit(values);
    } else {
      setErrors(newErrors);
      setTouched(
        Object.keys(newErrors).reduce(
          (acc, key) => ({ ...acc, [key]: true }),
          {}
        )
      );
    }
  };

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    setValues,
    reset: () => {
      setValues(initialValues);
      setErrors({});
      setTouched({});
    },
  };
};
