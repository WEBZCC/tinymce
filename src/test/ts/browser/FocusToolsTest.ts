import { UnitTest } from '@ephox/bedrock';
import { document } from '@ephox/dom-globals';
import { Element, Value } from '@ephox/sugar';
import * as Assertions from 'ephox/agar/api/Assertions';
import { Chain } from 'ephox/agar/api/Chain';
import * as FocusTools from 'ephox/agar/api/FocusTools';
import * as Guard from 'ephox/agar/api/Guard';
import { Pipeline } from 'ephox/agar/api/Pipeline';
import * as RawAssertions from 'ephox/agar/api/RawAssertions';
import { Step } from 'ephox/agar/api/Step';
import DomContainers from 'ephox/agar/test/DomContainers';
import { AgarLogs, AgarLogEntry } from '../../../main/ts/ephox/agar/pipe/Pipe';
import { Logger } from '../../../main/ts/ephox/agar/api/Main';
import { Arr } from '@ephox/katamari';

UnitTest.asynctest('FocusToolsTest', function () {
  const success = arguments[arguments.length - 2];
  const failure = arguments[arguments.length - 1];

  const doc = Element.fromDom(document);
  const docNode = Element.fromDom(document.documentElement);

  Pipeline.async({}, [
    DomContainers.mSetup,
    Step.log('cat1'),
    FocusTools.sSetFocus('Focusing body', docNode, 'body'),

    Step.log('cat2'),
    FocusTools.sIsOnSelector('Should be on body', doc, 'body'),
    FocusTools.sSetFocus('Focusing div', docNode, 'div[test-id]'),
    FocusTools.sIsOnSelector('Should be on div[test-id]', doc, 'div[test-id]'),
    FocusTools.sSetFocus('Focusing input', docNode, 'div[test-id] input'),
    FocusTools.sIsOnSelector('Should be on div[test-id] input', doc, 'div[test-id] input'),
    FocusTools.sSetActiveValue(doc, 'new value'),

    Chain.asStep(doc, [
      FocusTools.cGetFocused,
      Chain.control(
        Chain.on(function (active, next, die, logs) {
          RawAssertions.assertEq('Should be expected value', 'new value', Value.get(active));
          next(Chain.wrap(active), logs);
        }),
        Guard.addLogging('Asserting the value of the input field after it has been set.')
      )
    ]),
    Step.raw(function (state, next, die, logs) {
      FocusTools.sIsOn('checking that sIsOn works', state.input)(state, next, die, logs);
    }),
    FocusTools.sTryOnSelector(
      'Should be on div[test-id] input',
      doc,
      'div[test-id] input'
    ),
    FocusTools.sSetFocus('Focusing div again', docNode, 'div[test-id]'),
    FocusTools.sIsOnSelector('Should be on div again', doc, 'div[test-id]'),

    // Check that try until not is working for sIsOn, sIsOnSelector and sTryOnSelector
    Step.control(
      FocusTools.sIsOn('tryUntilNotCheck (sIsOn)', Element.fromTag('span')),
      Guard.tryUntilNot(
        'Focus should not be on something that is not in the DOM',
        100,
        1000
      )
    ),

    Step.control(
      FocusTools.sIsOnSelector('tryUntilNotCheck (sIsOnSelector)', doc, '.not-really-there'),
      Guard.tryUntilNot(
        'Focus should not be on something that is not there',
        100,
        1000
      )
    ),

    Step.control(
      FocusTools.sTryOnSelector('tryUntilNotCheck (sTryOnSelector)', doc, '.not-really-there'),
      Guard.tryUntilNot(
        'Focus should not be on something that is not there',
        100,
        1000
      )
    ),

    // TODO: Need to get rid of this boilerplate
    Logger.t('1',
      Step.raw(function (value, next, die, logs) {
        Chain.asStep(value.container, [
          FocusTools.cSetFocus('Setting focus via chains on the input', 'input')
        ])(value, next, die, logs);
      })
    ),
    FocusTools.sIsOnSelector('Should now be on input again', doc, 'input'),

    Step.raw(function (value, next, die, logs) {
      Chain.asStep(value.container, [
        FocusTools.cSetActiveValue('chained.value')
      ])(value, next, die, logs);
    }),

    Step.raw(function (value, next, die, logs) {
      Chain.asStep(value.container, [
        FocusTools.cGetActiveValue,
        Assertions.cAssertEq('Checking the value of input after set by chaining APIs', 'chained.value')
      ])(value, next, die, logs);
    }),

    Step.raw(function (value, next, die, logs) {
      Chain.asStep(doc, [
        FocusTools.cGetFocused,
        Assertions.cAssertDomEq('Checking that focused element is the input', value.input)
      ])(value, next, die, logs);
    }),

    DomContainers.mTeardown

  ], function (_, logs) {
    success();
  }, (err, logs) => {

    const outputToStr = (indent: string, entries: AgarLogEntry[]): string[] => {
      return Arr.bind(entries, (entry) => {
        const traceLines = entry.trace === null ? [ ] : [ '', '', '-----' ].concat(Arr.map(
          entry.trace.split('\n'),
          (s) => indent + '>> ' + s
        ).concat([ '----' ]));

        if (entry.entries.length === 0) {
          if (entry.trace === null) {
            return [ indent + '*  ' + entry.message ];
          } else {
            return [ indent + '*  ' + entry.message ].concat(traceLines);
          }
        } else {
          // We have entries ... let's format them.
          return [ indent + '*  ' + entry.message ].concat(
            outputToStr(indent + '  ', entry.entries)
          ).concat(traceLines);
        }
      })
    }

    const processed = outputToStr('  ', logs.history);

    failure(JSON.stringify({
      error: err.message,
      logs: processed
    }, null, 2));
  });
});

