/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */

import { Types } from '@ephox/bridge';
import { Arr, Cell, Obj, Option, Options } from '@ephox/katamari';
import Editor from 'tinymce/core/api/Editor';
import * as Settings from '../api/Settings';

export type TabSpec = {
  title: string,
  items: Types.Dialog.BodyComponentApi[];
};

export type HelpTabSpec = {
  tabName: string,
  spec: TabSpec;
};

const parseHelpTabsSetting = (tabsFromSettings: Settings.HelpTabsSetting, customTabs: Cell<Record<string, TabSpec>>): string[] => {
  const tabs: Record<string, TabSpec> = customTabs.get();
  const names = Arr.map(tabsFromSettings, (tab) => {
    if (typeof tab === 'string') {
      return tab;
    } else {
      // Assume this is a HelpTabSpec
      tabs[tab.tabName] = tab.spec;
      return tab.tabName;
    }
  });
  customTabs.set(tabs);
  return names;
};

const getNamesFromTabs = (customTabs: Cell<Record<string, TabSpec>>): string[] => {
  const tabs = customTabs.get();
  const names = Obj.keys(tabs);

  // Move the versions tab to the end if it exists
  const versionsIdx = Arr.indexOf(names, 'versions');
  versionsIdx.each((idx) => {
    names.splice(idx, 1);
    names.push('versions');
  });

  return names;
};

const parseCustomTabs = (editor: Editor, customTabs: Cell<Record<string, TabSpec>>) => {
  return Settings.getHelpTabs(editor).fold(
    () => getNamesFromTabs(customTabs),
    (tabsFromSettings: Settings.HelpTabsSetting) => parseHelpTabsSetting(tabsFromSettings, customTabs)
  );
};

const init = (editor: Editor, customTabs: Cell<Record<string, TabSpec>>): () => void => {
  return () => {
    const tabSpecs = customTabs.get();
    const tabOrder = parseCustomTabs(editor, customTabs);
    const foundTabs: Option<TabSpec>[] = Arr.map(tabOrder, (name) => {
      return Obj.get(tabSpecs, name);
    });
    const dialogTabs: TabSpec[] = Options.cat(foundTabs);

    const body: Types.Dialog.TabPanelApi = {
      type: 'tabpanel',
      tabs: dialogTabs
    };
    editor.windowManager.open(
      {
        title: 'Help',
        size: 'medium',
        body,
        buttons: [
          {
            type: 'cancel',
            name: 'close',
            text: 'Close',
            primary: true
          }
        ],
        initialData: {}
      }
    );
  };
};

export { init };
