import React, { useEffect } from 'react';

import axios from 'axios';

import { useFormikContext } from 'formik';

import { withStyles } from '@material-ui/core/styles';

import Button from '@material-ui/core/Button';
import Chip from '@material-ui/core/Chip';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';

export default withStyles((theme) => ({
  ontologySectionWrapper: {
    display: 'flex',
    gap: theme.spacing(3),
    alignItems: 'center',
  },
}))(({
  setOntologiesOpen, currentOntologyTerm, setCurrentOntologyTerm, classes
}) => {
  const { setFieldValue, values } = useFormikContext();

  useEffect(() => {
    // only do this request if we don't have the ontology loaded into state already
    // if someone has closed and reopened the annotation panel, essentially
    if (values.primary_ontology_id
      && (values.primary_ontology_id !== currentOntologyTerm?.id)) {
      axios.get(`/api/dojo/dkg/term/${values.primary_ontology_id}`).then((response) => {
        setCurrentOntologyTerm(response.data);
      });
      // no need to handle errors because we will fall back to just the ID, as seen below
    }
  }, [currentOntologyTerm, values.primary_ontology_id, setCurrentOntologyTerm]);

  return (
    <div className={classes.ontologySectionWrapper}>
      <Button
        variant="contained"
        color="primary"
        disableElevation
        onClick={() => setOntologiesOpen(true)}
      >
        {values.primary_ontology_id ? 'Change' : 'Add'} Ontology Term
      </Button>
      { values.primary_ontology_id && (
        <Tooltip
          interactive
          title={(
            <>
              {/* TODO: turn this ID into a link */}
              <Typography style={{ display: 'block' }} variant="caption">
                ID: {values.primary_ontology_id}
              </Typography>
              <Typography variant="caption">
                {currentOntologyTerm?.description
                  || 'There was an issue loading your ontology term description.'}
              </Typography>
            </>
          )}
        >
          <Chip
            label={currentOntologyTerm?.name || values.primary_ontology_id}
            onDelete={() => {
              setCurrentOntologyTerm(null);
              setFieldValue('primary_ontology_id', '');
            }}
          />
        </Tooltip>
      )}
    </div>
  );
});
