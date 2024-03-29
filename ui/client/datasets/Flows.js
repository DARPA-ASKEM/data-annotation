import axios from 'axios';
import Register from './Register';
import Annotate from './Annotate';
import AnomalyDetection from './AnomalyDetection';
import Append from './Append';
import UpdateMetadata from './UpdateMetadata';
import Preview from './Preview';
import SubmitSuccessPage from './SubmitSuccessPage';
import RunJobs from './RunJobs';
import Sheet from './Sheet';
import { GeoControls } from './annotations/ColumnAnnotation';
import { useState } from 'react';


const updateFlowDisabledFields = [
  'feature_type', 'geo_type',
  'coord_format', 'primary',
  'resolve_to_gadm', 'geo.coordinate-pair',
  'geo.coordinate-pair-column', 'geo.multi-column',
  'gadm_level', 'date_type',
  'date.multi-column', 'time_format',
  'category', 'isQualifies',
  'qualifies',
  // 'qualifierrole',
  'aliases', 'display_name'
];

// This config is much more flexible than to disable fields,
// but for now we only need it for this purpose
const updateFlowFieldsConfig = updateFlowDisabledFields
  .reduce((acc, currentKey) => {
    acc[currentKey] = { disabled: true };
    return acc;
  }, {});
updateFlowFieldsConfig.CLEAR_BUTTON_JATAWARE_INTERNAL = { disabled: true };

const BasicRegistrationFlow = {
  steps: [
    {
      slug: 'register',
      title: 'Dataset Registration',
      label: 'Registration',
      component: Register,
      options: {}
    },
    // {
    //   slug: 'scan',
    //   title: 'Anomaly Detection',
    //   label: 'Scan',
    //   component: AnomalyDetection,
    //   options: {
    //     jobs: [{id: 'tasks.anomaly_detection',}]
    //   },
    // },
    {
      slug: 'analyze',
      title: 'Analyzing Dataset',
      label: 'Analysis',
      component: RunJobs,
      options: {
        jobs: [
          {
            id: 'file_processors.file_conversion',
          },
          {
            id: 'geotime_processors.geotime_classify',
          },
        ]
      }
    },
    {
      slug: 'annotate',
      title: 'Annotate Dataset',
      label: 'Annotation',
      component: Annotate,
      options: {}
    },
    {
      slug: 'process',
      title: 'Processing Dataset',
      label: 'Processing',
      component: RunJobs,
      options: {
        jobs: [
          {
            id: 'mixmasta_processors.run_mixmasta',
            handler: async ({ result, annotations, setAnnotations, datasetInfo, ...extra }) => {
              const updatedDataset = {
                ...datasetInfo,
                data_paths: result.data_files,
                geography: result.geography,
                period: result.period,
                outputs: result.outputs,
                qualifier_outputs: result.qualifier_outputs,
              };
              console.log(updatedDataset);
              await axios.put(`/api/data_annotation/datasets`, updatedDataset);
            }
          },
        ]
      }
    },
    {
      slug: 'preview',
      title: 'Preview Dataset',
      label: 'Preview',
      component: Preview,
      options: {
        handleNextFunc: 'PublishDataset',
      }
    },
    {
      slug: 'submit',
      title: 'Submit Dataset',
      label: 'Submit',
      component: SubmitSuccessPage,
      options: {}
    },
  ]
};

const AppendFlow = {
  steps: [
    {
      slug: 'upload',
      title: 'Dataset Append',
      label: 'File Upload',
      component: Append,
      options: {}
    },
    {
      slug: 'analyze',
      title: 'Analyzing Dataset',
      label: 'Analysis',
      component: RunJobs,
      options: {
        jobs: [
          {
            id: 'file_processors.file_conversion',
            args: {},
          },
          {
            id: 'mixmasta_processors.run_mixmasta',
            handler: async ({ result, annotations, setAnnotations, datasetInfo, ...extra }) => {
              const updatedDataset = {
                ...datasetInfo,
                data_paths: Array.concat(datasetInfo.data_paths, result.data_files),
                geography: result.geography,
                period: result.period,
              };
              await axios.put(`/api/data_annotation/datasets`, updatedDataset);
            }
          }
        ]
      }
    },
    {
      slug: 'preview',
      title: 'Preview Dataset',
      label: 'Preview',
      component: Preview,
      options: {
        handleNextFunc: 'PublishDataset',
      }
    },
    {
      slug: 'submit',
      title: 'Submit Dataset',
      label: 'Submit',
      component: SubmitSuccessPage,
      options: {}
    },
  ]
};

const UpdateMetadataFlow = {
  steps: [
    {
      slug: 'register',
      title: 'Update Dataset Metadata',
      label: 'Registration',
      component: UpdateMetadata,
      options: {}
    },
    {
      slug: 'annotate',
      title: 'Annotate Dataset',
      label: 'Annotation',
      component: Annotate,
      options: {
        fieldsConfig: (name) => updateFlowFieldsConfig[name] || {},
        addingAnnotationsAllowed: false
      }
    },
    {
      slug: 'preview',
      title: 'Preview Dataset',
      label: 'Preview',
      component: Preview,
      options: {
        handleNextFunc: 'PublishDataset',
      }
    },
    {
      slug: 'submit',
      title: 'Submit Dataset',
      label: 'Submit',
      component: SubmitSuccessPage,
      options: {}
    },
  ]
};

const TableRegistrationFlow = {
  steps: [
    {
      slug: 'register',
      title: 'Dataset Registration',
      label: 'Registration',
      component: Register,
      options: {}
    },
    // {
    //   slug: 'scan',
    //   title: 'Anomaly Detection',
    //   label: 'Scan',
    //   component: AnomalyDetection,
    //   options: {
    //     jobs: [{id: 'tasks.anomaly_detection',}]
    //   },
    // },
    {
      slug: 'validation',
      title: 'Validating Dataset Suitability',
      label: 'Validation',
      component: RunJobs,
      options: {
        jobs: [
          {
            id: 'file_processors.file_conversion',
          },
        ]
      }
    },
    {
      slug: 'review',
      title: 'Review/Edit Dataset',
      label: 'Review/Edit',
      component: Sheet,
      options: {}
    },
    {
      slug: 'analyze',
      title: 'Analyzing Dataset',
      label: 'Analysis',
      component: RunJobs,
      options: {
        jobs: [
          {
            id: 'geotime_processors.geotime_classify',
          },
        ]
      }
    },
    {
      slug: 'annotate',
      title: 'Annotate Dataset',
      label: 'Annotation',
      component: Annotate,
      options: {}
    },
    {
      slug: 'process',
      title: 'Processing Dataset',
      label: 'Processing',
      component: RunJobs,
      options: {
        jobs: [
          {
            id: 'mixmasta_processors.run_mixmasta',
            handler: async ({ result, annotations, setAnnotations, datasetInfo, ...extra }) => {
              const updatedDataset = {
                ...datasetInfo,
                data_paths: result.data_files,
                geography: result.geography,
                period: result.period,
                outputs: result.outputs,
                qualifier_outputs: result.qualifier_outputs,
              };
              await axios.put(`/api/data_annotation/datasets`, updatedDataset);
            }
          },
        ]
      }
    },
    {
      slug: 'preview',
      title: 'Preview Dataset',
      label: 'Preview',
      component: Preview,
      options: {
        handleNextFunc: 'PublishDataset',
      }
    },
    {
      slug: 'submit',
      title: 'Submit Dataset',
      label: 'Submit',
      component: SubmitSuccessPage,
      options: {}
    },
  ]
};


const flows = {
  register: BasicRegistrationFlow,
  append: AppendFlow,
  update: UpdateMetadataFlow,
  table: TableRegistrationFlow,
  // TODO replace: ReplaceDatasetFlow
};

export default flows;
