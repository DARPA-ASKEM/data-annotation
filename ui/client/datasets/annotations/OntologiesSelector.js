import React from 'react';

import { withStyles } from '@material-ui/core/styles';

import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
// import Drawer from '../../components/Drawer';

export default withStyles((theme) => ({
  dialog: {
    width: '40rem',
    height: '30rem',
  },
  ontologiesBox: {
    height: '200px',
    width: '100%',
    borderRadius: '4px',
    border: '1px solid black',
    marginTop: theme.spacing(2),
  },
// eslint-disable-next-line arrow-body-style
}))(({ classes, open, onClose }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
    >
      <DialogTitle>Search for Ontologies</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Enter a search term to find relevant ontologies with the MIRA Knowledge Graph
        </DialogContentText>
        <TextField
          autoFocus
          name="Ontology"
          label="Ontology Search"
          fullWidth
          variant="outlined"
        />
        <div className={classes.ontologiesBox}>
          <List>
            <ListItem variant="subtitle2">Result 1</ListItem>
            <ListItem variant="subtitle2">Result 2</ListItem>
            <ListItem variant="subtitle2">Result 3</ListItem>
          </List>
        </div>
      </DialogContent>
      <DialogActions>
        <Button>Cancel</Button>
        <Button color="primary">Save to annotation</Button>
      </DialogActions>
    </Dialog>
  );
});
