import React, { useEffect, useState } from 'react';

import { withStyles, lighten } from '@material-ui/core/styles';

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
  selectedItem: {
    backgroundColor: lighten(theme.palette.primary.light, 0.5),
    '&:hover': {
      backgroundColor: lighten(theme.palette.primary.light, 0.2),
    },
  },
  buttonContainer: {
    display: 'flex',
    padding: theme.spacing(1),
    alignItems: 'center',
    justifyContent: 'flex-end',

  },
}))(({
  classes, open, onClose, columnName, setAlertMessage, setAlertVisible
}) => {
  const [searchResults, setSearchResults] = useState([]);
  const [selected, setSelected] = useState();

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
        message: `Saved ontology "${selected?.name}" to the annotation for "${columnName}"`
      });
      setAlertVisible(true);
      onClose();
      return;
    }

    setAlertVisible(true);
    setAlertMessage({
      severity: 'warning',
      message: 'Please select an ontology before saving.'
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
        <Typography variant="h5" gutterBottom>Search for Ontologies</Typography>
        <div>
          <Typography variant="body1" paragraph color="textSecondary">
            Enter a search term to find relevant ontologies with the MIRA Knowledge Graph
          </Typography>
          {open && (
            <Search
              name="Ontologie"
              setSearch={setSearchResults}
              searchEndpoint="/api/dojo/dkg/search"
              initialSearchTerm={columnName}
              fullWidth
            />

          )}
          <div className={classes.ontologiesBox}>
            <List className={classes.list}>
              {searchResults?.map((result) => (
                <ListItem
                  classes={{ root: classes.listItem }}
                  key={result.id}
                  button
                  onClick={() => setSelected(result)}
                  className={selected?.id === result.id ? classes.selectedItem : ''}
                >
                  <Typography variant="subtitle1">
                    Name: {result.name}
                  </Typography>
                  <Typography variant="body2">
                    Description: {result.description}
                  </Typography>
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
