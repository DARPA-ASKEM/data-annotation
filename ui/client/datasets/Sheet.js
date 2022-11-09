/* eslint-disable react/jsx-indent */
/* eslint-disable indent */
import React, { useEffect, useState } from 'react';

import axios from 'axios';
import { withStyles } from '@material-ui/core/styles';

import Box from '@material-ui/core/Box';
import Container from '@material-ui/core/Container';
import { Navigation } from '.';
import { HotTable } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
import 'handsontable/dist/handsontable.full.min.css';
import { Button } from '@material-ui/core';

import LoadingOverlay from '../components/LoadingOverlay';
import tableImg from '../assets/xDD-Demo-image.png';

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
    handleNext, handleBack, jobs, rawFileName, useFilepath = false, ...props
}) => {

    const fileArg = (useFilepath ? "filepath" : "filename");
    // TODO: Probably need a flag or different endpoint to fetch the entire file data, instead of limited to first 100 rows.
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [image, setImage] = useState(null);

    const next = () => {
        const payload = data;
        axios.post(`/api/dojo/datasets/${datasetInfo.id}/data`, payload).then(() => {
            handleNext();
        });
    }

    useEffect(() => {
        if (!datasetInfo?.id || data !== null) {
            return;
        }

        Promise
            .all([
                axios.get(`/api/dojo/datasets/${datasetInfo.id}/annotations`),
                axios.get(`/api/dojo/datasets/${datasetInfo.id}/data`),
            ])
            .then(([annotations, data]) => {
                const metadata = annotations?.data?.metadata;
                console.log(data);

                if (metadata?.image) {
                    setImage(metadata.image);
                }

                // TODO: Remove this, set image ahead of time when appropriate
                // DEBUG
                setImage(tableImg);
                setData(data.data);
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
                <Box display="flex" flex={1} flexDirection="row" gridGap="2em">
                    {(
                        loading
                            ? <LoadingOverlay text={"Fetching data"} />
                            :
                            <>
                                {(
                                    image
                                        ? <div flex={1} style={{ textAlign: 'center' }}>
                                            <img src={image} />
                                        </div>
                                        : null
                                )}
                                <HotTable
                                    flex={3}
                                    data={data}
                                    rowHeaders={true}
                                    contextMenu={true}
                                    mergeCells={true}
                                    width="45%"
                                    stretchH="all"
                                    allowInsertColumn
                                    allowRemoveColumn
                                    licenseKey="non-commercial-and-evaluation" // for non-commercial use only
                                />
                            </>
                    )}
                </Box >
            </Box>
            <Container>
                <Navigation
                    handleNext={next}
                    handleBack={handleBack}
                />
            </Container>
        </Box>
    );
});

export default Sheet;
