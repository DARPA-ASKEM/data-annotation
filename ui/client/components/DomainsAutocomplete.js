import React, { useEffect } from 'react';

import axios from 'axios';

import TextField from '@material-ui/core/TextField';
import Autocomplete from '@material-ui/lab/Autocomplete';

const DomainsAutocomplete = ({
  formik, label = 'Model Domain(s)', disabled, textFieldProps
}) => {
  const [domainList, setDomainList] = React.useState([]);

  useEffect(() => {
    if (domainList.length === 0) {
      axios('/api/dojo/dojo/domains').then((response) => { setDomainList(response.data); });
    }
  }, [domainList]);

  return domainList.length > 0
    ? (
      <Autocomplete
        multiple
        filterSelectedOptions
        name="domains"
        value={formik.values.domains || []}
        options={domainList}
        onChange={(evt, value) => { if (value) { formik.setFieldValue('domains', value); } }}
        onBeforeInput={(evt) => {
          if (evt.nativeEvent?.type === 'keypress' && evt.nativeEvent.keyCode === 13) {
            evt.preventDefault();
            evt.stopPropagation();
          }
        }}
        disabled={disabled}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            label={label}
            data-test="modelFormDomain"
            {...textFieldProps}
            disabled={disabled}
          />
        )}
      />
    )
    : (
      <TextField
        disabled
        variant="outlined"
        value="Fetching domains"
        fullWidth
      />
    );
};

export default DomainsAutocomplete;
