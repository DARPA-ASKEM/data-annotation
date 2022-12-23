import React, { useEffect, useState } from 'react';

import { useFormikContext } from 'formik';

import { withStyles, lighten, useTheme } from '@material-ui/core/styles';

import Drawer from '@material-ui/core/Drawer';

import Button from '@material-ui/core/Button';
import CloseIcon from '@material-ui/icons/Close';
import IconButton from '@material-ui/core/IconButton';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import Typography from '@material-ui/core/Typography';

import Search from '../../components/SearchItems';

export default withStyles((theme) => ({
  drawerPaper: {
    width: '30%',
    borderRight: '1px solid gray',
  },
  ontologiesBox: {
    minHeight: '300px',
    // full screen height minus all the other things in the drawer + a little extra
    maxHeight: 'calc(100vh - 300px)',
    overflowY: 'auto',
    width: '100%',
    borderRadius: '4px',
    border: '1px solid black',
    marginTop: theme.spacing(2),
  },
  drawerInner: {
    padding: '2rem',
    paddingTop: '0.5rem',
    height: '100vh',
  },
  drawerControls: {
    display: 'flex',
    justifyContent: 'flex-end'
  },
  list: {
    '& > :nth-child(even)': {
      backgroundColor: theme.palette.grey[100],
      '&:hover': {
        backgroundColor: theme.palette.grey[300],
      },
    },
  },
  listItem: {
    display: 'block',
    '&:hover': {
      backgroundColor: theme.palette.grey[300],
    },
  },
  buttonContainer: {
    display: 'flex',
    padding: theme.spacing(1),
    alignItems: 'center',
    justifyContent: 'flex-end',

  },
}))(({
  classes, open, onClose, columnName, setAlertMessage, setAlertVisible, setCurrentOntologyTerm
}) => {
  const [searchResults, setSearchResults] = useState([]);
  const [selected, setSelected] = useState();

  const { setFieldValue } = useFormikContext();

  const theme = useTheme();

  useEffect(() => {
    // clear out the search results any time we close
    // this can happen from outside of this component (from the ColumnPanel), so handle it here
    if (!open) {
      setSearchResults([]);
      setSelected();
    }
  }, [open]);

  const handleSave = () => {
    if (selected) {
      setAlertMessage({
        severity: 'success',
        message: `Saved ontology term "${selected?.name}" to the annotation for "${columnName}"`
      });
      setCurrentOntologyTerm(selected);
      setFieldValue('primary_ontology_id', selected.id, false);
      setAlertVisible(true);
      onClose();
      return;
    }

    setAlertVisible(true);
    setAlertMessage({
      severity: 'warning',
      message: 'Please select an ontology term before saving.'
    });
  };

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={open}
      onClose={onClose}
      classes={{ paper: classes.drawerPaper }}
    >
      <div className={classes.drawerInner}>
        <div className={classes.drawerControls}>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
        <Typography variant="h5" gutterBottom>Search for Ontology Terms</Typography>
        <div>
          <Typography variant="subtitle1" paragraph color="textSecondary">
            Enter a search term to find relevant ontology terms with the MIRA Knowledge Graph
          </Typography>
          {open && (
            <Search
              name="Ontology Term"
              setSearch={setSearchResults}
              searchEndpoint="/api/dojo/dkg/search"
              initialSearchTerm={columnName}
              fullWidth
            />

          )}
          <div className={classes.ontologiesBox}>
            <List className={classes.list}>
              {searchResults && searchResults?.map((result) => (
                <ListItem
                  classes={{ root: classes.listItem }}
                  key={result.id}
                  button
                  onClick={() => setSelected(result)}
                  // do the styling here to overwrite the nth child zebra striping
                  style={
                    selected?.id === result.id
                      ? {
                        backgroundColor: lighten(theme.palette.primary.light, 0.5),
                      } : {}
                  }
                >
                  <Typography variant="subtitle1">
                    {result.name}
                  </Typography>
                  <Typography variant="body2">
                    {result.description}
                  </Typography>
                  {result.synonyms && (
                    <Typography variant="body2">
                      Synonyms:&nbsp;
                      {result.synonyms.map((synonym, i) => (
                        // eslint-disable-next-line react/no-array-index-key
                        <span key={i}>
                          {synonym.value} {i < result.synonyms.length - 1 ? '• ' : ''}
                        </span>
                      ))}
                    </Typography>
                  )}
                  <Typography variant="body2">
                    ID: {result.id}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </div>
        </div>
        <div className={classes.buttonContainer}>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            color="primary"
            onClick={handleSave}
          >
            Save to annotation
          </Button>
        </div>
      </div>
    </Drawer>
  );
});
