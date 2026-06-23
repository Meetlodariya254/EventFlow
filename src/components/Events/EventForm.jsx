import { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { X, Loader2 } from 'lucide-react';
import { EVENT_CATEGORIES } from '../../utils/constants';
import { validateMobileNumber, validateEmail, formatDateInput } from '../../utils/helpers';
import { toast } from 'react-toastify';

Modal.setAppElement('#root');

const initialFormState = {
  title: '',
  date: '',
  startTime: '',
  endTime: '',
  description: '',
  personName: '',
  mobileNumber: '',
  personEmail: '',
  category: 'work',
  notes: '',
};

const EventForm = ({ isOpen, onClose, onSave, initialData, selectedDate }) => {
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const isEditMode = Boolean(initialData);

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        date: initialData.date
          ? formatDateInput(initialData.date)
          : '',
        startTime: initialData.startTime || '',
        endTime: initialData.endTime || '',
        description: initialData.description || '',
        personName: initialData.personName || '',
        mobileNumber: initialData.mobileNumber || '',
        personEmail: initialData.personEmail || '',
        category: initialData.category || 'work',
        notes: initialData.notes || '',
      });
      setErrors({});
    } else if (selectedDate) {
      setFormData({
        ...initialFormState,
        date: formatDateInput(selectedDate),
      });
      setErrors({});
    } else {
      setFormData(initialFormState);
      setErrors({});
    }
  }, [initialData, selectedDate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear field error on change
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Event title is required';
    }
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }
    if (!formData.personName.trim()) {
      newErrors.personName = 'Person name is required';
    }
    if (!formData.mobileNumber.trim()) {
      newErrors.mobileNumber = 'Mobile number is required';
    } else if (!validateMobileNumber(formData.mobileNumber)) {
      newErrors.mobileNumber = 'Enter a valid mobile number';
    }
    if (formData.personEmail.trim() && !validateEmail(formData.personEmail)) {
      newErrors.personEmail = 'Enter a valid email address';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
      toast.success(
        isEditMode ? 'Event updated successfully!' : 'Event created successfully!'
      );
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      closeTimeoutMS={200}
      className="ReactModal__Content"
      overlayClassName="ReactModal__Overlay"
    >
      <form onSubmit={handleSubmit}>
        {/* Modal Header */}
        <div className="relative p-6 border-b border-surface-200 dark:border-surface-700">
          <h2 className="font-heading text-xl font-bold">
            {isEditMode ? 'Edit Event' : 'Create Event'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Event Title */}
          <div>
            <label htmlFor="title" className="label-text">
              Event Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter event title"
              className={`input-field ${errors.title ? 'input-error' : ''}`}
            />
            {errors.title && (
              <p className="text-red-500 text-xs mt-1">{errors.title}</p>
            )}
          </div>

          {/* Event Date */}
          <div>
            <label htmlFor="date" className="label-text">
              Event Date <span className="text-red-500">*</span>
            </label>
            <input
              id="date"
              name="date"
              type="date"
              value={formData.date}
              onChange={handleChange}
              className={`input-field ${errors.date ? 'input-error' : ''}`}
            />
            {errors.date && (
              <p className="text-red-500 text-xs mt-1">{errors.date}</p>
            )}
          </div>

          {/* Start Time */}
          <div>
            <label htmlFor="startTime" className="label-text">
              Start Time <span className="text-red-500">*</span>
            </label>
            <input
              id="startTime"
              name="startTime"
              type="time"
              value={formData.startTime}
              onChange={handleChange}
              className={`input-field ${errors.startTime ? 'input-error' : ''}`}
            />
            {errors.startTime && (
              <p className="text-red-500 text-xs mt-1">{errors.startTime}</p>
            )}
          </div>

          {/* End Time */}
          <div>
            <label htmlFor="endTime" className="label-text">
              End Time
            </label>
            <input
              id="endTime"
              name="endTime"
              type="time"
              value={formData.endTime}
              onChange={handleChange}
              className="input-field"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="label-text">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              placeholder="Add a description..."
              className="input-field"
            />
          </div>

          {/* Person Name */}
          <div>
            <label htmlFor="personName" className="label-text">
              Person Name <span className="text-red-500">*</span>
            </label>
            <input
              id="personName"
              name="personName"
              type="text"
              value={formData.personName}
              onChange={handleChange}
              placeholder="Enter person name"
              className={`input-field ${errors.personName ? 'input-error' : ''}`}
            />
            {errors.personName && (
              <p className="text-red-500 text-xs mt-1">{errors.personName}</p>
            )}
          </div>

          {/* Mobile Number */}
          <div>
            <label htmlFor="mobileNumber" className="label-text">
              Mobile Number <span className="text-red-500">*</span>
            </label>
            <input
              id="mobileNumber"
              name="mobileNumber"
              type="tel"
              value={formData.mobileNumber}
              onChange={handleChange}
              placeholder="Enter mobile number"
              className={`input-field ${errors.mobileNumber ? 'input-error' : ''}`}
            />
            {errors.mobileNumber && (
              <p className="text-red-500 text-xs mt-1">{errors.mobileNumber}</p>
            )}
          </div>

          {/* Person Email */}
          <div>
            <label htmlFor="personEmail" className="label-text">
              Person Email
            </label>
            <input
              id="personEmail"
              name="personEmail"
              type="email"
              value={formData.personEmail}
              onChange={handleChange}
              placeholder="Enter email address"
              className={`input-field ${errors.personEmail ? 'input-error' : ''}`}
            />
            {errors.personEmail && (
              <p className="text-red-500 text-xs mt-1">{errors.personEmail}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="label-text">
              Category
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="input-field"
            >
              {EVENT_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="label-text">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={handleChange}
              placeholder="Add any notes..."
              className="input-field"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-surface-200 dark:border-surface-700 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>{isEditMode ? 'Update Event' : 'Create Event'}</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EventForm;
