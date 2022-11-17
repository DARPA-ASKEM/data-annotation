import React, { useContext } from 'react';

import { Link } from 'react-router-dom';

import AppBar from '@material-ui/core/AppBar';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Toolbar from '@material-ui/core/Toolbar';
import Tooltip from '@material-ui/core/Tooltip';
import { lighten, makeStyles } from '@material-ui/core/styles';

import { ThemeContext } from './ThemeContextProvider';

const useStyles = makeStyles((theme) => ({
  appBarRoot: {
    backgroundColor: lighten(theme.palette.primary.light, 0.6),
  },
  toolbar: {
    padding: [[0, theme.spacing(5)]],
    gap: theme.spacing(3),
  },
  dojoIcon: {
    height: '40px',
    width: '40px',
    marginRight: theme.spacing(1),
  },
  spacer: {
    flexGrow: 1,
  },
}));

const NavBar = () => {
  const classes = useStyles();
  const { showNavBar } = useContext(ThemeContext);

  if (!showNavBar) {
    return null;
  }

  return (
    <AppBar position="static" classes={{ root: classes.appBarRoot }}>
      <Toolbar variant="dense" disableGutters className={classes.toolbar}>
        <Tooltip title="Data Annotation home" arrow>
          <IconButton
            component={Link}
            to="/"
            size="small"
          >
            <img
              src="/assets/terrariumlogo2Cropped.png"
              alt="TERArium Logo"
              className={classes.dojoIcon}
            />
          </IconButton>
        </Tooltip>
        <span className={classes.spacer} />
        <Button href="https://www.dojo-modeling.com" target="_blank">Documentation</Button>
        <Button href="https://github.com/DARPA-ASKEM/data-annotation" target="_blank">GitHub</Button>
      </Toolbar>
    </AppBar>
  );
};

export default NavBar;
