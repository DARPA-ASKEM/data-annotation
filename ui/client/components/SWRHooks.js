import useSWR from 'swr';

const fetcher = async (url) => {
  const response = await fetch(url);

  if (!response.ok) {
    const error = new Error(`Error fetching data from ${url}`);
    error.info = await response.json();
    error.status = response.status;
    throw error;
  }

  return response.json();
};

// Datasets were previously called indicators, and this has not yet been updated in dojo
export function useDataset(datasetId) {
  const { data, error, mutate } = useSWR(
    datasetId ? `/api/dojo/indicators/${datasetId}` : null, fetcher
  );

  return {
    dataset: data,
    datasetLoading: !error && !data,
    datasetError: error,
    mutateDataset: mutate,
  };
}

export function useConceptName(termId) {
  const { data, error } = useSWR(`/api/dojo/dkg/term/${termId}`, fetcher);

  return {
    name: data,
    nameLoading: !error && !data,
    nameError: error,
  };
}
