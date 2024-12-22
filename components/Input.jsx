import React from 'react';
import PropTypes from 'prop-types';

function Input({ label, id, type, value, onChange, error }) {
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input type={type} id={id} value={value} onChange={onChange} />
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );
}

Input.propTypes = {
  label: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  type: PropTypes.string,
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.string,
};

Input.defaultProps = {
  type: 'text',
};

export default Input;