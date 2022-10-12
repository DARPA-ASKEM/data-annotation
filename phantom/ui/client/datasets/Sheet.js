import React, { useEffect, useState } from 'react';

import axios from 'axios';
import { withStyles } from '@material-ui/core/styles';

import Box from '@material-ui/core/Box';
import { Navigation } from '.';
import { HotTable } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
import 'handsontable/dist/handsontable.full.min.css';
import { Button } from '@material-ui/core';

import LoadingOverlay from '../components/LoadingOverlay';

registerAllModules();


const Sheet = withStyles(({ spacing }) => ({
    root: {
      display: 'flex',
      padding: [[0, spacing(4), spacing(2), spacing(4)]],
      flexDirection: 'column',
      flex: 1,
      height: '100%'
    },
    header: {
    },
    loadingWrapper: {
      display: 'flex',
      flex: '1 1 10rem',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column',
      '@media (min-height: 700px)': {
        marginTop: '-15%'
      }
    },
    failedIcon: {
      fontSize: '9rem',
      opacity: 0.5
    },
    failedChipMessage: {
      borderBottom: '1px solid gray',
      marginBottom: '0.75rem'
    },
    preformattedOutput: {
      width: '75%',
      padding: '1.25rem',
      background: '#DDDDDD44',
      overflow: 'auto',
      maxHeight: '30%'
    }
  }))(({
    classes, datasetInfo, setDatasetInfo, stepTitle, annotations, setAnnotations,
    handleNext, handleBack, jobs, rawFileName, useFilepath=false, ...props
  }) => {

    const next = () => {
        // TODO: Add code to upload data back to backend
        console.log("Next");
        return handleNext();
    }

    const fileArg = (useFilepath ? "filepath" : "filename");
    // TODO: Probably need a flag or different endpoint to fetch the entire file data, instead of limited to first 100 rows.
    const [loading, setLoading] = useState(true);
    const [columns, setColumns] = useState(null);
    const [data, setData] = useState(null);
    const [image, setImage] = useState(null);

    useEffect(() => {
        if (!datasetInfo?.id || data !== null) {
            return;
        }

        Promise
            .all([
                axios.get(`/api/dojo/indicators/${datasetInfo.id}/annotations`),
                axios.get(`/api/dojo/indicators/${datasetInfo.id}/data`),
            ])
        .then(([annotations, data]) => {
            const metadata = annotations?.data?.metadata;
            console.log(data);

            if (metadata?.image) {
                setImage(metadata.image);
            }

            // TODO: Remove this, set image ahead of time when appropriate
            // DEBUG
            setImage("https://placekitten.com/200/300");
            setColumns(data.data.columns);
            setData(data.data.records);
        })
        .catch((e) => {
            // setPromptMessage('Error loading annotation data.');
            console.error('Error fetching geoclassify or raw preview:', e);
        })
        .finally(() => { setLoading(false); });
    }, [datasetInfo]);

    return (
        <Box flex={1}>
            <Box flex={1}>
                <Box display={"flex"} flex={1} flexDirection={"row"} gridGap={"2em"}>
                    {(
                        loading 
                        ? <LoadingOverlay text={"Fetching data"}/>
                        : 
                        <>
                            {(
                                image 
                                ? <div flex={1} style={{textAlign: 'center'}}>
                                    <img src={image} />
                                </div>
                                : null
                            )}
                            <HotTable
                                flex={3}
                                data={data}
                                rowHeaders={true}
                                colHeaders={columns}
                                width={"45%"}
                                stretchH='all'
                                stretchV='all'
                                licenseKey="non-commercial-and-evaluation" // for non-commercial use only
                            />
                        </>
                    )}
                </Box >
                <Box>
                    <Button onClick={(evt) => {console.log(data);}}>Log to console</Button>
                </Box>
            </Box>
            <Navigation
                handleNext={next}
                handleBack={handleBack}
            />
        </Box>
    );
  });

export default Sheet;
