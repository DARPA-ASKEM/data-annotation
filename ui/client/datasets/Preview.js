import React, { useEffect, useState } from 'react';
import axios from 'axios';

import { DataGrid } from '@material-ui/data-grid';
import { withStyles } from '@material-ui/core/styles';

import Container from '@material-ui/core/Container';
import IconButton from '@material-ui/core/IconButton';
import InfoIcon from '@material-ui/icons/Info';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';

import Prompt from './PromptDialog';
import { Navigation } from '.';
import { formatDateOnly, splitOnWildCard } from '../utils';


const rowsPerPageOptions = [25, 50, 100];

const HintTooltip = withStyles(() => ({
  root: {
  },
  tooltip: {
    fontSize: '1rem'
  }
}))(({ classes }) => (
  <Tooltip
    classes={{ tooltip: classes.tooltip }}
    title="This is a Preview of the normalized data. Review output and submit."
  >
    <IconButton>
      <InfoIcon />
    </IconButton>
  </Tooltip>
));

/**
 *
 * */
export default withStyles(({ spacing }) => ({
  root: {
    padding: [[spacing(6), spacing(4), spacing(2), spacing(4)]],
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    marginBottom: spacing(5),
  }
}))(({
  classes, handleNext, datasetInfo, handleBack, stepTitle, rawFileName, useFilepath = false,
  handleNextFunc, ...props
}) => {

  const [pageSize, setPageSize] = useState(rowsPerPageOptions[0]);
  const [isLoading, setLoading] = useState(true);
  const [promptMessage, setPromptMessage] = useState('');

  const [columns, setColumns] = useState([]);
  const [previewData, setPreviewData] = useState([]);

  function PublishDataset({ datasetInfo }) {
    console.log("Dataset published");
    handleNext();
  };

  
  const nextHandlers = {
    'PublishDataset': PublishDataset
  };

  useEffect(() => {
    if (!datasetInfo?.id) {
      return;
    }

    const fileArg = (useFilepath ? "filepath" : "filename");
    const previewUrl = `/api/data_annotation/datasets/${datasetInfo.id}/preview/processed${rawFileName ? `?${fileArg}=${rawFileName}` : ''}`;
    axios.post(previewUrl)
      .then((loadedPreviewData) => {
        const rows = loadedPreviewData.data;

        if (!rows) {
          throw new Error('No server data');
        }

        const parsedColumns = Object
          .keys(rows[0])
          .filter((i) => i !== '__id')
          .map((name) => ({
            field: name,
            flex: 1,
            valueFormatter: name === 'timestamp'
              ? (val) => formatDateOnly(val.value)
              : undefined
          }));

        setColumns(parsedColumns);
        setPreviewData(rows);
      })
      .catch(() => {
        setPromptMessage('Error loading preview data.');
      })
      .finally(() => { setLoading(false); });
  }, [datasetInfo]);

  return (

    <Container
      className={classes.root}
      component="main"
      maxWidth="xl"
    >
      <Typography
        className={classes.header}
        variant="h4"
        align="center"
      >
        {stepTitle}
        <HintTooltip />
      </Typography>

      <DataGrid
        loading={isLoading}
        disableSelectionOnClick
        getRowId={(row) => row.__id}
        columns={columns}
        pageSize={pageSize}
        onPageSizeChange={(newPageSize) => setPageSize(newPageSize)}
        rowsPerPageOptions={rowsPerPageOptions}
        rows={previewData}
      />

      <Navigation
        label="Submit as Annotation"
        handleNext={() => nextHandlers[handleNextFunc]({ datasetInfo, rawFileName, ...props })}
        handleBack={handleBack}
      />

      <Prompt
        open={Boolean(promptMessage)}
        title="An error has occured"
        message={promptMessage}
        handleClose={() => setPromptMessage('')}
      />

    </Container>
  );
});
