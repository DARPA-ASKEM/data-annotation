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
    title="This is a Preview of the normalized data. Review output and submit to Dojo."
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

  // eslint-disable-next-line no-shadow
  function PublishDataset({ datasetInfo }) {
    axios.put(`/api/dojo/indicators/${datasetInfo.id}/publish`)
      .then(handleNext)
      .catch(() => {
        setPromptMessage('Error submitting data to Dojo. Please contact the Dojo team.');
      });
  }

  function PublishModelOutput({
    // eslint-disable-next-line no-shadow, no-unused-vars
    datasetInfo, annotations, onSubmit, ...props
  } = {}) {
    const { file_uuid } = annotations.metadata;
    const [output_directory, path] = splitOnWildCard(annotations.metadata.filename);
    const outputPayload = [{
      id: file_uuid,
      model_id: datasetInfo.id,
      name: datasetInfo.name,
      output_directory,
      path,
      file_type: annotations.metadata.mixmasterAnnotations?.meta?.ftype,
      transform: annotations.metadata.mixmasterAnnotations,
      prev_id: null,
    }];

    const isQualifier = (annotation) => (
      Boolean(annotation.qualify?.length
        || annotation.qualifies?.length
        || annotation.qualifier_outputs?.length)
    );
    const isPrimary = (annotation) => (
      Boolean(annotation.primary_date === true
        || annotation.primary_geo === true)
    );
    // An annotation is a feature if it doesn't qualify anything
    // and is not a primary date or primary geo
    const isFeature = (annotation) => (!(isQualifier(annotation) || isPrimary(annotation)));

    const outputs = (datasetInfo?.outputs || []).filter((output) => (output.uuid !== file_uuid));
    const qualifier_outputs = (
      datasetInfo?.qualifier_outputs || []).filter((output) => (output.uuid !== file_uuid));

    const column_index = Object.fromEntries(
      [].concat(...Object.values(annotations.annotations)).map((obj) => ([obj.name, obj])));

    const resolution = {};
    if (datasetInfo.temporal_resolution) {
      resolution.temporal_resolution = datasetInfo.temporal_resolution;
    }
    if (datasetInfo['x-resolution'] && datasetInfo['y-resolution']) {
      resolution.spatial_resolution = [
        datasetInfo['x-resolution'],
        datasetInfo['y-resolution']
      ];
    }

    const typeRemapper = {
      date: 'datetime',
      string: 'str',
      binary: 'boolean',
      latitude: 'lat',
      longitude: 'lng',
    };

    const model_outputs = annotations.annotations.feature.filter(isFeature).map((annotation) => ({
      uuid: file_uuid,
      name: annotation.name,
      display_name: annotation.display_name,
      description: annotation.description,
      type: typeRemapper[annotation.feature_type] || annotation.feature_type, // OutputType
      unit: annotation.units,
      unit_description: annotation.units_description,
      is_primary: false,
      data_resolution: resolution, // Resolution
      alias: column_index[annotation.name]?.aliases,
      choices: null,
      min: null,
      max: null,
      ontologies: null,
    }));
    const model_qualifier_outputs = [].concat(
      // Primary date column(s)
      annotations.annotations.date.map((annotation) => ({
        uuid: file_uuid,
        name: annotation.name,
        display_name: annotation.display_name,
        description: annotation.description,
        // annotation.date_type, // OutputType
        type: typeRemapper[annotation.date_type] || annotation.date_type,
        unit: null, // annotation.units,
        unit_description: null, // annotation.units_description,
        related_features: [],
        qualifier_role: 'breakdown',
        alias: {},
      })),

      // Primary geo column(s)
      annotations.annotations.geo.map((annotation) => ({
        uuid: file_uuid,
        name: annotation.name,
        display_name: annotation.display_name,
        description: annotation.description,
        // annotation.geo_type, // OutputType
        type: typeRemapper[annotation.geo_type] || annotation.geo_type,
        unit: null, // annotation.units,
        unit_description: null, // annotation.units_description,
        related_features: [],
        qualifier_role: 'breakdown',
        alias: {},
      })),

      // Qualifier features
      annotations.annotations.feature.filter(isQualifier).map((annotation) => ({
        uuid: file_uuid,
        name: annotation.name,
        display_name: annotation.display_name,
        description: annotation.description,
        type: typeRemapper[annotation.feature_type] || annotation.feature_type, // OutputType
        unit: annotation.units,
        unit_description: annotation.units_description,
        related_features: annotation.qualifies,
        qualifier_role: annotation.qualifierrole,
        alias: column_index[annotation.name]?.aliases,
      })),
    );

    // eslint-disable-next-line no-unused-vars
    const updates = Promise.all([
      axios.post('/api/dojo/dojo/outputfile', outputPayload),
      axios.patch(`/api/dojo/models/${datasetInfo.id}`,
        {
          outputs: outputs.concat(model_outputs),
          qualifier_outputs: qualifier_outputs.concat(model_qualifier_outputs),
        }),
    ]).then(onSubmit());
  }

  const nextHandlers = {
    PublishDataset,
    PublishModelOutput,
  };

  useEffect(() => {
    if (!datasetInfo?.id) {
      return;
    }

    const fileArg = (useFilepath ? 'filepath' : 'filename');
    const previewUrl = `/api/dojo/indicators/${datasetInfo.id}/preview/processed${rawFileName ? `?${fileArg}=${rawFileName}` : ''}`;
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
  }, [datasetInfo, rawFileName, useFilepath]);

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
        label="Submit to Dojo"
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
