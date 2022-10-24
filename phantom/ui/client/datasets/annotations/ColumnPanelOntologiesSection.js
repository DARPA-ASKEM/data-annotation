import React, { useEffect } from 'react';

import axios from 'axios';

import { useFormikContext } from 'formik';

import { withStyles } from '@material-ui/core/styles';

import Button from '@material-ui/core/Button';
import Chip from '@material-ui/core/Chip';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';

// TODO: update some of the language around ontologyEtc in here & other components
// once we make this more permanent
export default withStyles((theme) => ({
  ontologySectionWrapper: {
    display: 'flex',
    gap: theme.spacing(3),
    alignItems: 'center',
  },
}))(({
  setOntologiesOpen,
  currentOntologyTerm,
  setCurrentOntologyTerm,
  classes,
  type = 'primary_ontology_id'
}) => {
  const { setFieldValue, values } = useFormikContext();

  const term = type === 'units' ? 'Unit' : 'Ontology';

  useEffect(() => {
    // only do this request if we don't have the ontology loaded into state already
    // if someone has closed and reopened the annotation panel, essentially
    if (values[type]
      && (values[type] !== currentOntologyTerm?.id)) {
      axios.get(`/api/dojo/dkg/term/${values[type]}`).then((response) => {
        setCurrentOntologyTerm(response.data);
      });
      // no need to handle errors because we will fall back to just the ID, as seen below
    }
  }, [currentOntologyTerm, values[type], setCurrentOntologyTerm]);

  return (
    <div className={classes.ontologySectionWrapper}>
      <Button
        variant="contained"
        color="primary"
        disableElevation
        onClick={() => setOntologiesOpen(true)}
      >
        {values[type] ? 'Change' : 'Add'} {term} Term
      </Button>
      { values[type] && (
        <Tooltip
          interactive
          title={(
            <>
              {/* TODO: turn this ID into a link */}
              <Typography style={{ display: 'block' }} variant="caption">
                ID: {values[type]}
              </Typography>
              <Typography variant="caption">
                {currentOntologyTerm?.description
                  || `There was an issue loading your ${term} term description.`}
              </Typography>
            </>
          )}
        >
          <Chip
            label={currentOntologyTerm?.name || values[type]}
            onDelete={() => {
              setCurrentOntologyTerm(null);
              setFieldValue(type, '');
            }}
          />
        </Tooltip>
      )}
    </div>
  );
});
