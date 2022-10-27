import { zonedTimeToUtc } from 'date-fns-tz';

export const sleep = async (t) => new Promise((r) => setTimeout(r, t));

/**
 *
 * */
export function formatDateOnly(ts) {
  return ts !== null

    ? new Date(ts)
      .toISOString()
      .substring(0, 10)

    : '(null)';
}

/**
 *
 * */
export const matchFileNameExtension = (fileName) => {
  const regex = /\.[0-9a-z]+$/i;
  return fileName.match(regex);
};

export const splitOnWildCard = (filepath) => {
  let parent_str; let
    children_str;
  if (!/\*/.test(filepath)) {
    if (!/\//.test(filepath)) {
      parent_str = '';
      children_str = filepath;
    } else {
      const parts = filepath.split('/');
      parent_str = parts.slice(0, parts.length - 1).join('/');
      children_str = parts[parts.length - 1];
    }
  } else {
    const parent = [];
    const children = [];
    let flag = false;
    const dirs = filepath.split('/');
    for (const dir of dirs) {
      if (/\*/.test(dir)) {
        flag = true;
      }
      if (flag) {
        children.push(dir);
      } else {
        parent.push(dir);
      }
    }
    if (!flag) {
      children.push(parent.pop());
    }
    if (!parent.length) {
      parent_str = '/';
    } else {
      parent_str = parent.join('/');
    }
    children_str = children.join('/');
  }
  return [parent_str, children_str];
};
