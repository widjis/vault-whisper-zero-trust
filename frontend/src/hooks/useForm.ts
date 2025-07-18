import { useState, useCallback, ChangeEvent } from 'react';

type ValidationRules<T> = {
  [K in keyof T]?: (value: T[K], formValues: T) => string | null;
};

type FormErrors<T> = {
  [K in keyof T]?: string | null;
};

interface UseFormReturn<T> {
  values: T;
  errors: FormErrors<T>;
  touched: { [K in keyof T]?: boolean };
  isValid: boolean;
  isDirty: boolean;
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleBlur: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  setFieldValue: (name: keyof T, value: any) => void;
  setFieldError: (name: keyof T, error: string | null) => void;
  setFieldTouched: (name: keyof T, isTouched: boolean) => void;
  validateField: (name: keyof T) => boolean;
  validateForm: () => boolean;
  resetForm: () => void;
  setValues: (values: Partial<T>) => void;
}

const useForm = <T extends Record<string, any>>(
  initialValues: T,
  validationRules?: ValidationRules<T>
): UseFormReturn<T> => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors<T>>({});
  const [touched, setTouched] = useState<{ [K in keyof T]?: boolean }>({});
  const [isDirty, setIsDirty] = useState(false);

  const validateField = useCallback(
    (name: keyof T): boolean => {
      if (!validationRules || !validationRules[name]) {
        return true;
      }

      const validateRule = validationRules[name];
      const error = validateRule ? validateRule(values[name], values) : null;

      setErrors((prev) => ({
        ...prev,
        [name]: error,
      }));

      return !error;
    },
    [values, validationRules]
  );

  const validateForm = useCallback((): boolean => {
    if (!validationRules) {
      return true;
    }

    let isValid = true;
    const newErrors: FormErrors<T> = {};

    // Mark all fields as touched when validating the entire form
    const newTouched: { [K in keyof T]?: boolean } = {};
    Object.keys(values).forEach((key) => {
      newTouched[key as keyof T] = true;
    });
    setTouched(newTouched);

    // Validate each field
    Object.keys(validationRules).forEach((key) => {
      const fieldName = key as keyof T;
      const validateRule = validationRules[fieldName];
      
      if (validateRule) {
        const error = validateRule(values[fieldName], values);
        newErrors[fieldName] = error;
        if (error) {
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values, validationRules]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value, type, checked } = e.target as HTMLInputElement;
      const newValue = type === 'checkbox' ? checked : value;

      setValues((prev) => ({
        ...prev,
        [name]: newValue,
      }));

      setIsDirty(true);

      // Validate field on change if it's been touched
      if (touched[name as keyof T]) {
        validateField(name as keyof T);
      }
    },
    [touched, validateField]
  );

  const handleBlur = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name } = e.target;

      setTouched((prev) => ({
        ...prev,
        [name]: true,
      }));

      validateField(name as keyof T);
    },
    [validateField]
  );

  const setFieldValue = useCallback(
    (name: keyof T, value: any) => {
      setValues((prev) => ({
        ...prev,
        [name]: value,
      }));

      setIsDirty(true);

      // Validate field on change if it's been touched
      if (touched[name]) {
        validateField(name);
      }
    },
    [touched, validateField]
  );

  const setFieldError = useCallback((name: keyof T, error: string | null) => {
    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  }, []);

  const setFieldTouched = useCallback((name: keyof T, isTouched: boolean) => {
    setTouched((prev) => ({
      ...prev,
      [name]: isTouched,
    }));
  }, []);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsDirty(false);
  }, [initialValues]);

  const setFormValues = useCallback((newValues: Partial<T>) => {
    setValues((prev) => ({
      ...prev,
      ...newValues,
    }));
    setIsDirty(true);
  }, []);

  // Check if the form is valid (no errors)
  const isValid = Object.values(errors).every((error) => !error);

  return {
    values,
    errors,
    touched,
    isValid,
    isDirty,
    handleChange,
    handleBlur,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    validateField,
    validateForm,
    resetForm,
    setValues: setFormValues,
  };
};

export default useForm;