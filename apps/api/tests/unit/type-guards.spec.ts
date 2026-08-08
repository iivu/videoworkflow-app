import { test } from '@japa/runner';

import { asRecord, optionalString } from '#utils/type-guards';

test.group('Type guards', () => {
  test('accepts plain records and rejects other values', ({ assert }) => {
    const record = { value: 'ok' };
    assert.strictEqual(asRecord(record), record);
    assert.isNull(asRecord(null));
    assert.isNull(asRecord([]));
    assert.isNull(asRecord('record'));
  });

  test('returns only non-blank strings', ({ assert }) => {
    const record = { present: 'value', blank: '  ', number: 1 };
    assert.equal(optionalString(record, 'present'), 'value');
    assert.isUndefined(optionalString(record, 'blank'));
    assert.isUndefined(optionalString(record, 'number'));
    assert.isUndefined(optionalString(null, 'present'));
  });
});
