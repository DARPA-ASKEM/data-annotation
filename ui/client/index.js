import React from 'react';

import './style.css';

import CssBaseline from '@material-ui/core/CssBaseline';
import ReactDOM from 'react-dom';
import {
  Route,
  BrowserRouter as Router,
  Switch,
} from 'react-router-dom';

import { ThemeProvider } from '@material-ui/core/styles';

import NavBar from './components/NavBar';
import ThemeContextProvider from './components/ThemeContextProvider';

// pages
import DatasetSummary from './dataset_summary';
import theme from './theme';
import ViewDatasets from './components/ViewDatasets';
// import DatasetRegistration from './datasets/Register';
import DatasetRegistrationStepper from './datasets/RegistrationStepper';
import DatasetPreview from './datasets/Preview';
import DatasetAnnotate from './datasets/Annotate';

export default function Main() {
  return (
    <Router>
      <NavBar />
      <Switch>
        <Route component={ViewDatasets} exact path="/" />
        <Route component={DatasetAnnotate} exact path="/datasets/annotate" />
        <Route component={DatasetPreview} exact path="/datasets/preview" />
        <Route component={DatasetRegistrationStepper} path="/datasets/:flowslug/:step?/:datasetId?" />
        <Route component={DatasetSummary} exact path="/dataset_summary" />
        <Route path="/*" render={() => <h2>404 Not Found</h2>} />
      </Switch>
    </Router>
  );
}

ReactDOM.render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <ThemeContextProvider>
      <Main />
    </ThemeContextProvider>
  </ThemeProvider>,
  document.getElementById('app')
);

module.hot.accept();
