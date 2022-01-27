import React, {
  useEffect,
  useState,
} from 'react';

import BasicAlert from './BasicAlert';
import { useLock, useShellHistory } from './SWRHooks';

import {
  useWebSocketUpdateContext,
} from '../context';

const storeFileRequest = async (info) => {
  const rsp = await fetch('/api/dojo/clouseau/file', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(info)
  });

  if (!rsp.ok) {
    throw new Error(`Failed to send file info ${rsp.status}`);
  }

  return rsp.json();
};

const storeAccessoryRequest = async (info) => {
  const rsp = await fetch('/api/dojo/dojo/accessories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(info)
  });

  if (!rsp.ok) {
    throw new Error(`Failed to send accessory info ${rsp.status}`);
  }

  return rsp;
};

const ContainerWebSocket = ({
  modelId,
  setEditorContents, openEditor,
  setIsShorthandOpen, setShorthandContents, setShorthandMode,
  setSpacetagUrl, setIsSpacetagOpen, setSpacetagFile
}) => {
  const { register, unregister } = useWebSocketUpdateContext();
  const [accessoryAlert, setAccessoryAlert] = useState(false);

  const { lock } = useLock(modelId);

  const { mutateShellHistory } = useShellHistory(modelId);

  useEffect(() => {
    const onMessage = () => {
      mutateShellHistory();
    };

    const onOldCommand = async (data) => {
      const { command, cwd } = JSON.parse(data);
      const s = command.trim();
      if (s.startsWith('edit ')) {
        const p = `${s.substring(5)}`;
        const f = (p.startsWith('/')) ? p : `${cwd}/${p}`;
        const rsp = await fetch(
          `/api/clouseau/container/${modelId}/ops/cat?path=${encodeURIComponent(f)}`
        );
        if (rsp.ok) {
          setEditorContents({ text: await rsp.text(), file: f });
          openEditor();
        }
      } else if (s.startsWith('config ')) {
        // get file path user specified
        const path = `${s.substring('config '.length)}`;
        const fullPath = (path.startsWith('/')) ? path : `${cwd}/${path}`;

        // load that file's contents
        const rsp = await fetch(
          `/api/clouseau/container/${modelId}/ops/cat?path=${encodeURIComponent(fullPath)}`
        );
        if (rsp.ok) {
          const fileContent = await rsp.text();
          // pass them along to shorthand
          setShorthandContents({
            editor_content: fileContent,
            content_id: fullPath,
          });
          // set the mode to config rather than directive
          setShorthandMode('config');
          setIsShorthandOpen(true); // open the <FullScreenDialog>
        }
      } else if (s.startsWith('tag ')) {
        const p = `${s.substring(4)}`;
        const f = (p.startsWith('/')) ? p : `${cwd}/${p}`;

        const { id: reqid } = await storeFileRequest({
          model_id: modelId,
          file_path: f,
          request_path: `/container/${modelId}/ops/cat?path=${encodeURIComponent(f)}`
        });

        setSpacetagFile(`${f}`);
        setSpacetagUrl(`/api/spacetag/byom?reqid=${reqid}`);
        setIsSpacetagOpen(true);
      } else if (s.startsWith('accessory ')) {
        const p = `${s.substring(10)}`;
        const f = (p.startsWith('/')) ? p : `${cwd}/${p}`;
        const f_ = (f.includes(' ')) ? f.split(' ')[0] : f;
        const c = (f.includes(' ')) ? p.split(' ').slice(1, p.split(' ').length).join(' ').replaceAll('"', '') : null;

        await storeAccessoryRequest({
          model_id: modelId,
          path: f_,
          caption: c
        }).then(() => setAccessoryAlert(true));
      }
    };

    const onBlocked = async (data) => {
      // id is the dojo command, meta contains the command specific details
      const { id, meta } = JSON.parse(data);

      if (id === 'edit') {
        // file editor
        const rsp = await fetch(
          `/api/clouseau/container/${modelId}/ops/cat?path=${encodeURIComponent(meta.file)}`
        );
        if (rsp.ok) {
          setEditorContents({ text: await rsp.text(), file: meta.file });
          openEditor();
        }
      } else if (id === 'config') {
        // shorthand
        // load the file's contents
        const rsp = await fetch(
          `/api/clouseau/container/${modelId}/ops/cat?path=${encodeURIComponent(meta.file)}`
        );
        if (rsp.ok) {
          const fileContent = await rsp.text();
          // pass them along to shorthand
          setShorthandContents({
            editor_content: fileContent,
            content_id: meta.file,
          });
          // set the mode to config rather than directive
          setShorthandMode('config');
          setIsShorthandOpen(true); // open the <FullScreenDialog>
        }
      } else if (id === 'annotate') {
        // spacetag
        const { id: reqid } = await storeFileRequest({
          model_id: modelId,
          file_path: meta.files[0],
          request_path: `/container/${modelId}/ops/cat?path=${encodeURIComponent(meta.files[0])}`
        });

        setSpacetagFile(`${meta.files[0]}`);
        setSpacetagUrl(`/api/spacetag/byom?reqid=${reqid}`);
        setIsSpacetagOpen(true);
      } else if (id === 'tag') {
        // accessory annotation
        await storeAccessoryRequest({
          model_id: modelId,
          path: meta.file,
          caption: meta.caption
        }).then(() => setAccessoryAlert(true));
      }
    };

    if (lock) {
      register('term/message', onMessage);
      register('dojo/command', onBlocked);
      register('term/blocked', onOldCommand);
    }

    return (() => {
      unregister('term/message', onMessage);
      unregister('dojo/command', onBlocked);
      unregister('term/blocked', onOldCommand);
    });
  }, [
    mutateShellHistory,
    lock,
    openEditor,
    register,
    unregister,
    setEditorContents,
    setIsShorthandOpen,
    setShorthandContents,
    setShorthandMode,
    setSpacetagFile,
    setSpacetagUrl,
    setIsSpacetagOpen,
    modelId
  ]);

  return (
    <>
      <BasicAlert
        alert={{
          message: 'Your accessory was successfully added',
          severity: 'success',
        }}
        visible={accessoryAlert}
        setVisible={setAccessoryAlert}
      />
    </>
  );
};

export default ContainerWebSocket;
